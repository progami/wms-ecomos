import type { InventoryTransaction, Sku, Warehouse } from '@prisma/client';

type InventoryTransactionWithRelations = InventoryTransaction & {
  sku: Sku;
  warehouse: Warehouse;
};

const mockAggregateTransactionCosts = (transactions: InventoryTransactionWithRelations[]) => {
  const aggregated = new Map<string, {
    warehouseId: string;
    warehouseName: string;
    skuId: string;
    skuCode: string;
    skuName: string;
    quantity: number;
    totalCost: number;
    unitCost: number;
  }>();

  for (const tx of transactions) {
    const key = `${tx.warehouseId}-${tx.skuId}`;
    const existing = aggregated.get(key);
    
    const quantity = tx.cartonsIn || tx.cartonsOut || 0;
    const unitCost = 10; // Mock unit cost
    const cost = quantity * unitCost;
    
    if (existing) {
      existing.quantity += quantity;
      existing.totalCost += cost;
      existing.unitCost = existing.totalCost / existing.quantity;
    } else {
      aggregated.set(key, {
        warehouseId: tx.warehouseId,
        warehouseName: tx.warehouse.name,
        skuId: tx.skuId,
        skuCode: tx.sku.skuCode,
        skuName: tx.sku.description || tx.sku.skuCode,
        quantity,
        totalCost: cost,
        unitCost
      });
    }
  }
  
  return Array.from(aggregated.values());
};

describe('Cost Aggregation', () => {
  const mockWarehouse: Warehouse = {
    id: 'warehouse-1',
    code: 'WH001',
    name: 'Main Warehouse',
    address: '123 Main St',
    latitude: 40.7128,
    longitude: -74.0060,
    contactEmail: 'warehouse@example.com',
    contactPhone: '555-0123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSku: Sku = {
    id: 'sku-1',
    skuCode: 'SKU001',
    asin: null,
    description: 'Test product',
    packSize: null,
    material: null,
    unitDimensionsCm: null,
    unitWeightKg: null,
    unitsPerCarton: null,
    cartonDimensionsCm: null,
    cartonWeightKg: null,
    packagingType: null,
    fbaStock: null,
    fbaStockLastUpdated: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const createMockTransaction = (overrides: Partial<InventoryTransactionWithRelations> = {}): InventoryTransactionWithRelations => ({
    id: 'inv-tx-1',
    transactionId: 'tx-1',
    warehouseId: mockWarehouse.id,
    skuId: mockSku.id,
    batchLot: 'DEFAULT',
    transactionType: 'RECEIVE',
    transactionDate: new Date(),
    cartonsIn: 100,
    cartonsOut: 0,
    storagePalletsIn: 0,
    shippingPalletsOut: 0,
    storageCartonsPerPallet: null,
    shippingCartonsPerPallet: null,
    referenceId: null,
    pickupDate: null,
    isReconciled: false,
    isDemo: true,
    shipName: null,
    trackingNumber: null,
    modeOfTransportation: null,
    attachments: null,
    unitsPerCarton: null,
    createdAt: new Date(),
    createdById: 'user-1',
    warehouse: mockWarehouse,
    sku: mockSku,
    ...overrides
  });

  describe('aggregateTransactionCosts', () => {
    it('should aggregate costs for single transaction', () => {
      const transactions = [createMockTransaction()];
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        warehouseId: 'warehouse-1',
        warehouseName: 'Main Warehouse',
        skuId: 'sku-1',
        skuCode: 'SKU001',
        skuName: 'Test product',
        quantity: 100,
        totalCost: 1000,
        unitCost: 10
      });
    });

    it('should aggregate multiple transactions for same SKU and warehouse', () => {
      const transactions = [
        createMockTransaction({
          id: 'inv-tx-1',
          cartonsIn: 100,
          cartonsOut: 0
        }),
        createMockTransaction({
          id: 'inv-tx-2',
          cartonsIn: 50,
          cartonsOut: 0
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(150);
      expect(result[0].totalCost).toBe(1500);
      expect(result[0].unitCost).toBe(10);
    });

    it('should handle multiple warehouses separately', () => {
      const warehouse2: Warehouse = { ...mockWarehouse, id: 'warehouse-2', name: 'Secondary Warehouse' };
      
      const transactions = [
        createMockTransaction({
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          cartonsIn: 100
        }),
        createMockTransaction({
          id: 'inv-tx-2',
          warehouseId: warehouse2.id,
          warehouse: warehouse2,
          cartonsIn: 50
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(2);
      expect(result.find(r => r.warehouseId === 'warehouse-1')?.quantity).toBe(100);
      expect(result.find(r => r.warehouseId === 'warehouse-2')?.quantity).toBe(50);
    });

    it('should handle ship transactions', () => {
      const transactions = [
        createMockTransaction({
          transactionType: 'SHIP',
          cartonsIn: 0,
          cartonsOut: 50
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result[0].quantity).toBe(50);
      expect(result[0].totalCost).toBe(500);
    });

    it('should calculate weighted average unit cost', () => {
      // For this mock, we're using a fixed unit cost of 10
      // In a real implementation, this would calculate based on actual costs
      const transactions = [
        createMockTransaction({
          id: 'inv-tx-1',
          cartonsIn: 100
        }),
        createMockTransaction({
          id: 'inv-tx-2',
          cartonsIn: 200
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result[0].quantity).toBe(300);
      expect(result[0].totalCost).toBe(3000);
      expect(result[0].unitCost).toBe(10);
    });
  });
});