// Legacy inventory service - maintains backward compatibility while using new secure service
import { PrismaClient, Prisma, TransactionType } from '@prisma/client';
import { InventoryService } from './services/inventory-service';
import { withTransaction, withLock, updateInventoryWithLock, selectFIFOBatchWithLock } from './database/transaction-utils';
import { validatePositiveInteger } from './security/input-sanitization';

const prisma = new PrismaClient();

export interface CreateInventoryTransactionInput {
  type: 'receive' | 'ship' | 'adjust';
  warehouseId: string;
  skuId: string;
  palletCount: number;
  unitsPerPallet: number;
  totalUnits: number;
  batchLotNumber?: string;
  transactionDate: Date;
  notes?: string;
}

// Map legacy transaction type to new enum
function mapTransactionType(type: string): TransactionType {
  switch (type) {
    case 'receive': return TransactionType.RECEIVE;
    case 'ship': return TransactionType.SHIP;
    case 'adjust': return TransactionType.ADJUST_IN;
    default: return TransactionType.ADJUST_IN;
  }
}

// Updated to use new secure service
export async function createInventoryTransaction(input: CreateInventoryTransactionInput) {
  // Validate inputs
  if (!validatePositiveInteger(input.palletCount)) {
    throw new Error('Invalid pallet count');
  }
  if (!validatePositiveInteger(input.unitsPerPallet)) {
    throw new Error('Invalid units per pallet');
  }
  if (!validatePositiveInteger(input.totalUnits)) {
    throw new Error('Invalid total units');
  }

  // Map to new service format
  const mappedData = {
    warehouseId: input.warehouseId,
    skuId: input.skuId,
    batchLot: input.batchLotNumber || `BATCH-${Date.now()}`,
    transactionType: mapTransactionType(input.type),
    referenceId: undefined,
    cartonsIn: input.type === 'receive' ? Math.ceil(input.totalUnits / input.unitsPerPallet) : 0,
    cartonsOut: input.type === 'ship' ? Math.ceil(input.totalUnits / input.unitsPerPallet) : 0,
    storagePalletsIn: input.type === 'receive' ? input.palletCount : 0,
    shippingPalletsOut: input.type === 'ship' ? input.palletCount : 0,
    transactionDate: input.transactionDate,
    pickupDate: undefined,
    shippingCartonsPerPallet: input.type === 'ship' ? Math.ceil(input.totalUnits / input.palletCount / input.unitsPerPallet) : undefined,
    storageCartonsPerPallet: input.type === 'receive' ? Math.ceil(input.totalUnits / input.palletCount / input.unitsPerPallet) : undefined,
    shipName: undefined,
    trackingNumber: undefined,
    modeOfTransportation: undefined,
    attachments: undefined,
  };

  // Use new secure service with system user
  const result = await InventoryService.createTransaction(
    mappedData,
    'SYSTEM' // Legacy API calls use system user
  );

  // Return in legacy format
  return {
    id: result.transaction.id,
    type: input.type,
    warehouseId: result.transaction.warehouseId,
    skuId: result.transaction.skuId,
    palletCount: input.palletCount,
    unitsPerPallet: input.unitsPerPallet,
    totalUnits: input.totalUnits,
    batchLotNumber: result.transaction.batchLot,
    transactionDate: result.transaction.transactionDate,
    notes: input.notes,
    status: 'completed',
    createdAt: result.transaction.createdAt,
  };
}

export async function splitBatch(
  warehouseId: string,
  skuId: string,
  sourceBatchId: string,
  splitQuantity: number,
  newBatchNumber: string
) {
  if (!validatePositiveInteger(splitQuantity)) {
    throw new Error('Invalid split quantity');
  }

  const lockKey = `batch:${sourceBatchId}:split`;

  return withLock('inventory_balance', lockKey, async () => {
    return withTransaction(async (tx) => {
      // Get source batch with lock
      const sourceBatch = await tx.inventoryBalance.findUnique({
        where: { id: sourceBatchId }
      });

      if (!sourceBatch) {
        throw new Error('Source batch not found');
      }

      if (sourceBatch.currentUnits < splitQuantity) {
        throw new Error('Insufficient quantity in source batch');
      }

      // Check if new batch already exists
      const existingNewBatch = await tx.inventoryBalance.findFirst({
        where: {
          warehouseId,
          skuId,
          batchLot: newBatchNumber
        }
      });

      if (existingNewBatch) {
        throw new Error('Batch number already exists');
      }

      // Get SKU details
      const sku = await tx.sku.findUnique({
        where: { id: skuId }
      });

      if (!sku) {
        throw new Error('SKU not found');
      }

      const unitsPerCarton = sku.unitsPerCarton || 1;
      const cartonsToSplit = Math.ceil(splitQuantity / unitsPerCarton);

      // Update source batch
      await tx.inventoryBalance.update({
        where: { id: sourceBatchId },
        data: {
          currentUnits: sourceBatch.currentUnits - splitQuantity,
          currentCartons: sourceBatch.currentCartons - cartonsToSplit,
          currentPallets: Math.ceil((sourceBatch.currentCartons - cartonsToSplit) / (sourceBatch.storageCartonsPerPallet || 1))
        }
      });

      // Create new batch
      const newBatch = await tx.inventoryBalance.create({
        data: {
          warehouseId,
          skuId,
          batchLot: newBatchNumber,
          currentCartons: cartonsToSplit,
          currentPallets: Math.ceil(cartonsToSplit / (sourceBatch.storageCartonsPerPallet || 1)),
          currentUnits: splitQuantity,
          storageCartonsPerPallet: sourceBatch.storageCartonsPerPallet,
          shippingCartonsPerPallet: sourceBatch.shippingCartonsPerPallet,
        }
      });

      // Record the split as transactions
      const transactionId1 = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const transactionId2 = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      await tx.inventoryTransaction.createMany({
        data: [
          {
            transactionId: transactionId1,
            transactionType: TransactionType.ADJUST_OUT,
            warehouseId,
            skuId,
            cartonsIn: 0,
            cartonsOut: cartonsToSplit,
            storagePalletsIn: 0,
            shippingPalletsOut: 0,
            batchLot: sourceBatch.batchLot,
            transactionDate: new Date(),
            createdById: 'SYSTEM',
          },
          {
            transactionId: transactionId2,
            transactionType: TransactionType.ADJUST_IN,
            warehouseId,
            skuId,
            cartonsIn: cartonsToSplit,
            cartonsOut: 0,
            storagePalletsIn: Math.ceil(cartonsToSplit / (sourceBatch.storageCartonsPerPallet || 1)),
            shippingPalletsOut: 0,
            batchLot: newBatchNumber,
            transactionDate: new Date(),
            createdById: 'SYSTEM',
          }
        ]
      });

      return newBatch;
    });
  });
}

export async function getInventoryBalance(warehouseId: string, skuId: string) {
  return prisma.inventoryBalance.findMany({
    where: {
      warehouseId,
      skuId,
      currentCartons: { gt: 0 }
    },
    orderBy: { lastTransactionDate: 'desc' }
  });
}

export async function validateInventoryAvailability(
  warehouseId: string,
  skuId: string,
  requiredQuantity: number
): Promise<boolean> {
  const balances = await prisma.inventoryBalance.aggregate({
    where: {
      warehouseId,
      skuId,
      currentUnits: { gt: 0 }
    },
    _sum: {
      currentUnits: true
    }
  });

  return (balances._sum.currentUnits || 0) >= requiredQuantity;
}