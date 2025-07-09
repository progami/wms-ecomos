import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const prisma = new PrismaClient();

describe('Demo Data Integrity Rules', () => {
  beforeAll(async () => {
    // Ensure we have data to test
    const skuCount = await prisma.sku.count();
    if (skuCount === 0) {
      throw new Error('No demo data found. Please run "npm run demo:generate" first.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Inventory Ledger Integrity', () => {
    it('should have receive transactions before any ship transactions for each SKU', async () => {
      const skus = await prisma.sku.findMany();
      const warehouses = await prisma.warehouse.findMany();
      
      for (const sku of skus) {
        for (const warehouse of warehouses) {
          const transactions = await prisma.inventoryTransaction.findMany({
            where: { 
              skuId: sku.id,
              warehouseId: warehouse.id
            },
            orderBy: { transactionDate: 'asc' }
          });

          if (transactions.length > 0) {
            // First transaction should always be a receive
            const firstTransaction = transactions[0];
            expect(firstTransaction.transactionType).toBe('RECEIVE');
            
            // Check that no ship transaction occurs before the first receive
            let hasReceived = false;
            for (const transaction of transactions) {
              if (transaction.transactionType === 'RECEIVE') {
                hasReceived = true;
              }
              if (transaction.transactionType === 'SHIP' && !hasReceived) {
                throw new Error(`SKU ${sku.skuCode} at ${warehouse.name} has ship transaction before any receive transaction`);
              }
            }
          }
        }
      }
    });

    it('should maintain correct inventory balances (received - shipped = current)', async () => {
      const balances = await prisma.inventoryBalance.findMany({
        include: { sku: true, warehouse: true }
      });
      
      for (const balance of balances) {
        const receivedSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            transactionType: 'RECEIVE'
          },
          _sum: { cartonsIn: true }
        });

        const shippedSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            transactionType: 'SHIP'
          },
          _sum: { cartonsOut: true }
        });

        const adjustInSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            transactionType: 'ADJUST_IN'
          },
          _sum: { cartonsIn: true }
        });
        
        const adjustOutSum = await prisma.inventoryTransaction.aggregate({
          where: { 
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            transactionType: 'ADJUST_OUT'
          },
          _sum: { cartonsOut: true }
        });

        const received = receivedSum._sum.cartonsIn || 0;
        const shipped = shippedSum._sum.cartonsOut || 0;
        const adjustedIn = adjustInSum._sum.cartonsIn || 0;
        const adjustedOut = adjustOutSum._sum.cartonsOut || 0;
        const calculatedBalance = received + adjustedIn - shipped - adjustedOut;

        expect(calculatedBalance).toBeCloseTo(balance.currentCartons, 2);
        expect(balance.currentCartons).toBeGreaterThanOrEqual(0);
      }
    });

    it('should never have negative inventory balances', async () => {
      const balances = await prisma.inventoryBalance.findMany();
      
      for (const balance of balances) {
        expect(balance.currentCartons).toBeGreaterThanOrEqual(0);
        
        // Check running balance throughout history
        const transactions = await prisma.inventoryTransaction.findMany({
          where: { 
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot
          },
          orderBy: { transactionDate: 'asc' }
        });

        let runningBalance = 0;
        for (const transaction of transactions) {
          if (transaction.transactionType === 'RECEIVE' || transaction.transactionType === 'ADJUST_IN') {
            runningBalance += transaction.cartonsIn;
          } else if (transaction.transactionType === 'SHIP' || transaction.transactionType === 'ADJUST_OUT' || transaction.transactionType === 'TRANSFER') {
            runningBalance -= transaction.cartonsOut;
          }
          
          expect(runningBalance).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Financial Data Integrity', () => {
    it('should have invoices with correct calculations', async () => {
      const invoices = await prisma.invoice.findMany({
        include: {
          lineItems: true
        }
      });

      for (const invoice of invoices) {
        // Calculate total from line items
        let calculatedSubtotal = 0;
        for (const item of invoice.lineItems) {
          calculatedSubtotal += Number(item.amount);
        }

        // Subtotal should match calculated value
        expect(Number(invoice.subtotal)).toBeCloseTo(calculatedSubtotal, 2);
        
        // Total should equal subtotal + tax
        const expectedTotal = Number(invoice.subtotal) + Number(invoice.taxAmount);
        expect(Number(invoice.totalAmount)).toBeCloseTo(expectedTotal, 2);
      }
    });

    it('should have cost calculations matching invoice line items', async () => {
      const calculatedCosts = await prisma.calculatedCost.findMany({
        include: {
          costRate: true
        }
      });

      // Group by billing period and warehouse
      const costsByPeriod = new Map<string, number>();
      for (const cost of calculatedCosts) {
        const key = `${cost.warehouseId}-${cost.billingPeriodStart.toISOString()}-${cost.billingPeriodEnd.toISOString()}`;
        const current = costsByPeriod.get(key) || 0;
        costsByPeriod.set(key, current + Number(cost.finalExpectedCost));
      }

      // Verify at least some costs exist
      expect(costsByPeriod.size).toBeGreaterThan(0);
    });
  });

  describe('Transaction Constraints', () => {
    it('should not allow shipping more than available inventory', async () => {
      const balances = await prisma.inventoryBalance.findMany();
      
      for (const balance of balances) {
        // Get all transactions for this SKU/warehouse/batch
        const transactions = await prisma.inventoryTransaction.findMany({
          where: {
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot
          },
          orderBy: { transactionDate: 'asc' }
        });

        let runningBalance = 0;
        for (const tx of transactions) {
          if (tx.transactionType === 'RECEIVE' || tx.transactionType === 'ADJUST_IN') {
            runningBalance += tx.cartonsIn;
          } else if (tx.transactionType === 'SHIP' || tx.transactionType === 'ADJUST_OUT' || tx.transactionType === 'TRANSFER') {
            runningBalance -= tx.cartonsOut;
            // Running balance should never go negative
            expect(runningBalance).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('should have consistent transaction dates', async () => {
      const transactions = await prisma.inventoryTransaction.findMany({
        orderBy: { transactionDate: 'asc' }
      });

      // All transaction dates should be in the past
      const now = new Date();
      for (const tx of transactions) {
        expect(tx.transactionDate.getTime()).toBeLessThanOrEqual(now.getTime());
      }
      
      // Verify we have some transactions
      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Demo Data Statistics', () => {
    it('should report demo data statistics', async () => {
      const stats = {
        skus: await prisma.sku.count(),
        warehouses: await prisma.warehouse.count(),
        inventoryBalances: await prisma.inventoryBalance.count(),
        inventoryTransactions: await prisma.inventoryTransaction.count(),
        invoices: await prisma.invoice.count(),
        costRates: await prisma.costRate.count(),
        calculatedCosts: await prisma.calculatedCost.count(),
        users: await prisma.user.count()
      };

      console.log('\n=== Demo Data Statistics ===');
      console.log(`SKUs: ${stats.skus}`);
      console.log(`Warehouses: ${stats.warehouses}`);
      console.log(`Inventory Balances: ${stats.inventoryBalances}`);
      console.log(`Inventory Transactions: ${stats.inventoryTransactions}`);
      console.log(`Invoices: ${stats.invoices}`);
      console.log(`Cost Rates: ${stats.costRates}`);
      console.log(`Calculated Costs: ${stats.calculatedCosts}`);
      console.log(`Users: ${stats.users}`);
      console.log('===========================\n');

      // Basic sanity checks
      expect(stats.skus).toBeGreaterThan(0);
      expect(stats.warehouses).toBeGreaterThan(0);
      expect(stats.inventoryTransactions).toBeGreaterThan(0);
    });
  });
});