import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const prisma = new PrismaClient();

describe('Demo Data Integrity Rules', () => {
  beforeAll(async () => {
    // Ensure we have data to test
    const itemCount = await prisma.inventoryItem.count();
    if (itemCount === 0) {
      throw new Error('No demo data found. Please run "npm run demo:generate" first.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Inventory Ledger Integrity', () => {
    it('should have receive transactions before any ship transactions for each item', async () => {
      const items = await prisma.inventoryItem.findMany();
      
      for (const item of items) {
        const transactions = await prisma.inventoryLedger.findMany({
          where: { itemId: item.id },
          orderBy: { createdAt: 'asc' }
        });

        if (transactions.length > 0) {
          // First transaction should always be a receive
          const firstTransaction = transactions[0];
          expect(firstTransaction.type).toBe('receive');
          
          // Check that no ship transaction occurs before the first receive
          let hasReceived = false;
          for (const transaction of transactions) {
            if (transaction.type === 'receive') {
              hasReceived = true;
            }
            if (transaction.type === 'ship' && !hasReceived) {
              throw new Error(`Item ${item.sku} has ship transaction before any receive transaction`);
            }
          }
        }
      }
    });

    it('should maintain correct inventory balances (received - shipped = current)', async () => {
      const items = await prisma.inventoryItem.findMany();
      
      for (const item of items) {
        const receivedSum = await prisma.inventoryLedger.aggregate({
          where: { 
            itemId: item.id,
            type: 'receive'
          },
          _sum: { quantity: true }
        });

        const shippedSum = await prisma.inventoryLedger.aggregate({
          where: { 
            itemId: item.id,
            type: 'ship'
          },
          _sum: { quantity: true }
        });

        const adjustmentSum = await prisma.inventoryLedger.aggregate({
          where: { 
            itemId: item.id,
            type: 'adjustment'
          },
          _sum: { quantity: true }
        });

        const received = receivedSum._sum.quantity || 0;
        const shipped = shippedSum._sum.quantity || 0;
        const adjustments = adjustmentSum._sum.quantity || 0;
        const calculatedBalance = received - shipped + adjustments;

        expect(calculatedBalance).toBe(item.quantity);
        expect(calculatedBalance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should never have negative inventory balances', async () => {
      const items = await prisma.inventoryItem.findMany();
      
      for (const item of items) {
        expect(item.quantity).toBeGreaterThanOrEqual(0);
        
        // Check running balance throughout history
        const transactions = await prisma.inventoryLedger.findMany({
          where: { itemId: item.id },
          orderBy: { createdAt: 'asc' }
        });

        let runningBalance = 0;
        for (const transaction of transactions) {
          if (transaction.type === 'receive') {
            runningBalance += transaction.quantity;
          } else if (transaction.type === 'ship') {
            runningBalance -= transaction.quantity;
          } else if (transaction.type === 'adjustment') {
            runningBalance += transaction.quantity;
          }
          
          expect(runningBalance).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Financial Data Integrity', () => {
    it('should have invoices matching shipment volumes', async () => {
      // Get all purchase orders with their items
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        include: {
          items: true
        }
      });

      for (const po of purchaseOrders) {
        // Calculate total from PO items
        let poTotal = 0;
        for (const item of po.items) {
          poTotal += item.quantity * item.unitPrice;
        }

        // Check if there's a corresponding invoice
        const invoice = await prisma.invoice.findFirst({
          where: { purchaseOrderId: po.id }
        });

        if (invoice) {
          // Invoice amount should match PO total
          expect(invoice.amount).toBe(poTotal);
        }
      }
    });

    it('should have sales orders with valid financial data', async () => {
      const salesOrders = await prisma.salesOrder.findMany({
        include: {
          items: true
        }
      });

      for (const so of salesOrders) {
        // Calculate total from SO items
        let soTotal = 0;
        for (const item of so.items) {
          soTotal += item.quantity * item.unitPrice;
        }

        // Total should match calculated value
        expect(so.totalAmount).toBe(soTotal);
      }
    });
  });

  describe('Shipment Constraints', () => {
    it('should not allow shipping more than available inventory', async () => {
      const salesOrders = await prisma.salesOrder.findMany({
        where: { status: 'shipped' },
        include: {
          items: {
            include: {
              inventoryItem: true
            }
          }
        }
      });

      for (const so of salesOrders) {
        for (const soItem of so.items) {
          // Get all shipped quantities for this item up to this order date
          const shippedBefore = await prisma.salesOrderItem.aggregate({
            where: {
              inventoryItemId: soItem.inventoryItemId,
              salesOrder: {
                shippedAt: {
                  lte: so.shippedAt
                },
                status: 'shipped'
              }
            },
            _sum: { quantity: true }
          });

          const receivedBefore = await prisma.inventoryLedger.aggregate({
            where: {
              itemId: soItem.inventoryItemId,
              type: 'receive',
              createdAt: {
                lte: so.shippedAt || new Date()
              }
            },
            _sum: { quantity: true }
          });

          const totalShipped = shippedBefore._sum.quantity || 0;
          const totalReceived = receivedBefore._sum.quantity || 0;

          // Shipped quantity should never exceed received quantity
          expect(totalShipped).toBeLessThanOrEqual(totalReceived);
        }
      }
    });

    it('should have consistent timestamps (PO before receive, SO before ship)', async () => {
      // Check PO -> Receive timeline
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { status: 'received' }
      });

      for (const po of purchaseOrders) {
        const receiveTransactions = await prisma.inventoryLedger.findMany({
          where: {
            type: 'receive',
            referenceId: po.id,
            referenceType: 'purchase_order'
          }
        });

        for (const transaction of receiveTransactions) {
          expect(transaction.createdAt.getTime()).toBeGreaterThanOrEqual(po.orderDate.getTime());
        }
      }

      // Check SO -> Ship timeline
      const salesOrders = await prisma.salesOrder.findMany({
        where: { 
          status: 'shipped',
          shippedAt: { not: null }
        }
      });

      for (const so of salesOrders) {
        if (so.shippedAt) {
          expect(so.shippedAt.getTime()).toBeGreaterThanOrEqual(so.orderDate.getTime());
        }
      }
    });
  });

  describe('Demo Data Statistics', () => {
    it('should report demo data statistics', async () => {
      const stats = {
        items: await prisma.inventoryItem.count(),
        locations: await prisma.location.count(),
        purchaseOrders: await prisma.purchaseOrder.count(),
        salesOrders: await prisma.salesOrder.count(),
        invoices: await prisma.invoice.count(),
        vendors: await prisma.vendor.count(),
        customers: await prisma.customer.count(),
        transactions: await prisma.inventoryLedger.count()
      };

      console.log('\n=== Demo Data Statistics ===');
      console.log(`Inventory Items: ${stats.items}`);
      console.log(`Locations: ${stats.locations}`);
      console.log(`Purchase Orders: ${stats.purchaseOrders}`);
      console.log(`Sales Orders: ${stats.salesOrders}`);
      console.log(`Invoices: ${stats.invoices}`);
      console.log(`Vendors: ${stats.vendors}`);
      console.log(`Customers: ${stats.customers}`);
      console.log(`Ledger Transactions: ${stats.transactions}`);
      console.log('===========================\n');

      // Basic sanity checks
      expect(stats.items).toBeGreaterThan(0);
      expect(stats.locations).toBeGreaterThan(0);
      expect(stats.transactions).toBeGreaterThan(0);
    });
  });
});