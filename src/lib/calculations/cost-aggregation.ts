import { prisma } from '@/lib/prisma';
import { CostCategory } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export interface AggregatedCost {
  warehouseId: string;
  warehouseName: string;
  costCategory: CostCategory;
  costName: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  details: {
    skuId?: string;
    skuName?: string;
    batchLot?: string;
    transactionType?: string;
    count?: number;
  }[];
}

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Get billing period dates (16th of month to 15th of next month)
 */
export function getBillingPeriod(date: Date): BillingPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day >= 16) {
    // Current month's billing period
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month + 1, 15, 23, 59, 59, 999);
  } else {
    // Previous month's billing period
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

/**
 * Calculate storage costs from StorageLedger for a billing period
 */
export async function calculateStorageCosts(
  warehouseId: string,
  billingPeriod: BillingPeriod
): Promise<AggregatedCost[]> {
  // Get storage entries for the billing period
  const storageEntries = await prisma.storageLedger.findMany({
    where: {
      warehouseId,
      weekEnding: {
        gte: billingPeriod.startDate,
        lte: billingPeriod.endDate,
      },
    },
    include: {
      productSku: true,
      warehouse: true,
    },
  });

  // Get storage rates for the warehouse
  const storageRates = await prisma.costRate.findMany({
    where: {
      warehouseId,
      category: CostCategory.STORAGE,
      effectiveFrom: {
        lte: billingPeriod.endDate,
      },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: billingPeriod.startDate } },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });

  // Group storage costs by SKU and batch
  const costsBySku = new Map<string, AggregatedCost>();

  for (const entry of storageEntries) {
    const key = `${entry.skuId}-${entry.batchLot || 'NO_BATCH'}`;
    
    // Find applicable rate
    const rate = storageRates.find(r => 
      r.effectiveFrom <= entry.weekEnding &&
      (!r.effectiveTo || r.effectiveTo >= entry.weekEnding)
    );

    if (!rate) continue;

    const existingCost = costsBySku.get(key);
    const palletWeeks = entry.palletsCharged;
    const weeklyAmount = palletWeeks * rate.rate;

    if (existingCost) {
      existingCost.quantity += palletWeeks;
      existingCost.totalAmount += weeklyAmount;
      existingCost.details.push({
        skuId: entry.skuId,
        skuName: entry.productSku.name,
        batchLot: entry.batchLot || undefined,
        count: palletWeeks,
      });
    } else {
      costsBySku.set(key, {
        warehouseId: entry.warehouseId,
        warehouseName: entry.warehouse.name,
        costCategory: CostCategory.STORAGE,
        costName: rate.name,
        quantity: palletWeeks,
        unitRate: rate.rate,
        totalAmount: weeklyAmount,
        details: [{
          skuId: entry.skuId,
          skuName: entry.productSku.name,
          batchLot: entry.batchLot || undefined,
          count: palletWeeks,
        }],
      });
    }
  }

  return Array.from(costsBySku.values());
}

/**
 * Calculate transaction-based costs (inbound/outbound) for a billing period
 */
export async function calculateTransactionCosts(
  warehouseId: string,
  billingPeriod: BillingPeriod
): Promise<AggregatedCost[]> {
  // Get all transactions for the billing period
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      warehouseId,
      transactionDate: {
        gte: billingPeriod.startDate,
        lte: billingPeriod.endDate,
      },
      type: {
        in: ['RECEIVE', 'SHIP'],
      },
    },
    include: {
      productSku: true,
      warehouse: true,
    },
  });

  // Get all cost rates for the warehouse
  const costRates = await prisma.costRate.findMany({
    where: {
      warehouseId,
      category: {
        in: [CostCategory.CONTAINER, CostCategory.CARTON, CostCategory.PALLET, 
             CostCategory.UNIT, CostCategory.SHIPMENT],
      },
      effectiveFrom: {
        lte: billingPeriod.endDate,
      },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: billingPeriod.startDate } },
      ],
    },
  });

  const aggregatedCosts: AggregatedCost[] = [];

  // Process inbound transactions (RECEIVE)
  const inboundTransactions = transactions.filter(t => t.type === 'RECEIVE');
  
  // Container unloading (one per receive batch)
  const containerDates = new Set(
    inboundTransactions.map(t => t.transactionDate.toDateString())
  );
  
  const containerRate = costRates.find(r => r.category === CostCategory.CONTAINER);
  if (containerRate && containerDates.size > 0) {
    aggregatedCosts.push({
      warehouseId,
      warehouseName: transactions[0]?.warehouse.name || '',
      costCategory: CostCategory.CONTAINER,
      costName: containerRate.name,
      quantity: containerDates.size,
      unitRate: containerRate.rate,
      totalAmount: containerDates.size * containerRate.rate,
      details: Array.from(containerDates).map(date => ({
        transactionType: 'RECEIVE',
        count: 1,
      })),
    });
  }

  // Inbound carton handling
  const inboundCartonRate = costRates.find(r => 
    r.category === CostCategory.CARTON && r.name.toLowerCase().includes('inbound')
  );
  if (inboundCartonRate) {
    const totalInboundCartons = inboundTransactions.reduce(
      (sum, t) => sum + t.cartons, 0
    );
    if (totalInboundCartons > 0) {
      aggregatedCosts.push({
        warehouseId,
        warehouseName: transactions[0]?.warehouse.name || '',
        costCategory: CostCategory.CARTON,
        costName: inboundCartonRate.name,
        quantity: totalInboundCartons,
        unitRate: inboundCartonRate.rate,
        totalAmount: totalInboundCartons * inboundCartonRate.rate,
        details: inboundTransactions.map(t => ({
          skuId: t.skuId,
          skuName: t.productSku.name,
          batchLot: t.batchLot || undefined,
          transactionType: 'RECEIVE',
          count: t.cartons,
        })),
      });
    }
  }

  // Process outbound transactions (SHIP)
  const outboundTransactions = transactions.filter(t => t.type === 'SHIP');

  // Outbound by pallet
  const palletRate = costRates.find(r => 
    r.category === CostCategory.PALLET && r.name.toLowerCase().includes('outbound')
  );
  if (palletRate) {
    const totalPallets = outboundTransactions.reduce(
      (sum, t) => sum + (t.pallets || 0), 0
    );
    if (totalPallets > 0) {
      aggregatedCosts.push({
        warehouseId,
        warehouseName: transactions[0]?.warehouse.name || '',
        costCategory: CostCategory.PALLET,
        costName: palletRate.name,
        quantity: totalPallets,
        unitRate: palletRate.rate,
        totalAmount: totalPallets * palletRate.rate,
        details: outboundTransactions
          .filter(t => t.pallets && t.pallets > 0)
          .map(t => ({
            skuId: t.skuId,
            skuName: t.productSku.name,
            batchLot: t.batchLot || undefined,
            transactionType: 'SHIP',
            count: t.pallets || 0,
          })),
      });
    }
  }

  // Outbound by carton
  const outboundCartonRate = costRates.find(r => 
    r.category === CostCategory.CARTON && r.name.toLowerCase().includes('outbound')
  );
  if (outboundCartonRate) {
    // Only count cartons not on pallets
    const cartonsNotOnPallets = outboundTransactions
      .filter(t => !t.pallets || t.pallets === 0)
      .reduce((sum, t) => sum + t.cartons, 0);
    
    if (cartonsNotOnPallets > 0) {
      aggregatedCosts.push({
        warehouseId,
        warehouseName: transactions[0]?.warehouse.name || '',
        costCategory: CostCategory.CARTON,
        costName: outboundCartonRate.name,
        quantity: cartonsNotOnPallets,
        unitRate: outboundCartonRate.rate,
        totalAmount: cartonsNotOnPallets * outboundCartonRate.rate,
        details: outboundTransactions
          .filter(t => !t.pallets || t.pallets === 0)
          .map(t => ({
            skuId: t.skuId,
            skuName: t.productSku.name,
            batchLot: t.batchLot || undefined,
            transactionType: 'SHIP',
            count: t.cartons,
          })),
      });
    }
  }

  // Unit picking (if applicable)
  const unitRate = costRates.find(r => r.category === CostCategory.UNIT);
  if (unitRate) {
    // Assuming units are tracked in a custom field or notes
    // This would need to be implemented based on actual business logic
  }

  // Shipment charges (per shipment)
  const shipmentRate = costRates.find(r => r.category === CostCategory.SHIPMENT);
  if (shipmentRate) {
    // Group by date and reference to count unique shipments
    const shipments = new Map<string, number>();
    for (const t of outboundTransactions) {
      const key = `${t.transactionDate.toDateString()}-${t.reference || 'NO_REF'}`;
      shipments.set(key, (shipments.get(key) || 0) + 1);
    }
    
    if (shipments.size > 0) {
      aggregatedCosts.push({
        warehouseId,
        warehouseName: transactions[0]?.warehouse.name || '',
        costCategory: CostCategory.SHIPMENT,
        costName: shipmentRate.name,
        quantity: shipments.size,
        unitRate: shipmentRate.rate,
        totalAmount: shipments.size * shipmentRate.rate,
        details: Array.from(shipments.entries()).map(([key, count]) => ({
          transactionType: 'SHIP',
          count: 1,
        })),
      });
    }
  }

  return aggregatedCosts;
}

/**
 * Calculate all costs for a warehouse during a billing period
 */
export async function calculateAllCosts(
  warehouseId: string,
  billingPeriod: BillingPeriod
): Promise<AggregatedCost[]> {
  const [storageCosts, transactionCosts] = await Promise.all([
    calculateStorageCosts(warehouseId, billingPeriod),
    calculateTransactionCosts(warehouseId, billingPeriod),
  ]);

  return [...storageCosts, ...transactionCosts];
}

/**
 * Get calculated costs grouped by cost category and name
 */
export async function getCalculatedCostsSummary(
  warehouseId: string,
  billingPeriod: BillingPeriod
): Promise<Map<string, AggregatedCost>> {
  const allCosts = await calculateAllCosts(warehouseId, billingPeriod);
  
  const summary = new Map<string, AggregatedCost>();
  
  for (const cost of allCosts) {
    const key = `${cost.costCategory}-${cost.costName}`;
    const existing = summary.get(key);
    
    if (existing) {
      existing.quantity += cost.quantity;
      existing.totalAmount += cost.totalAmount;
      existing.details.push(...cost.details);
    } else {
      summary.set(key, { ...cost });
    }
  }
  
  return summary;
}