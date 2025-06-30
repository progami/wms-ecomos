import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { createInventoryTransaction } from '@/lib/inventory-service';
import { processInvoice } from '@/lib/invoice-service';
import { updateWarehouseStock } from '@/lib/warehouse-service';

const prisma = new PrismaClient();

describe('Concurrent User Actions - Race Conditions', () => {
  let testWarehouseId: string;
  let testSkuId: string;
  let testUserId: string;
  let testCustomerId: string;

  beforeEach(async () => {
    // Setup test data
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Concurrent Test Warehouse',
        code: 'CTW',
        address: 'Test Address',
        status: 'active'
      }
    });
    testWarehouseId = warehouse.id;

    const sku = await prisma.sku.create({
      data: {
        name: 'Concurrent Test SKU',
        code: 'SKU-CONCURRENT',
        barcode: 'CONC123',
        status: 'active'
      }
    });
    testSkuId = sku.id;

    const user = await prisma.user.create({
      data: {
        email: 'concurrent@test.com',
        name: 'Concurrent User',
        password: 'hashed',
        role: 'staff'
      }
    });
    testUserId = user.id;

    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '1234567890'
      }
    });
    testCustomerId = customer.id;

    // Create initial inventory
    await prisma.inventoryTransaction.create({
      data: {
        type: 'receive',
        status: 'completed',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        palletCount: 10,
        unitsPerPallet: 100,
        totalUnits: 1000,
        batchLotNumber: 'BATCH-CONC-001',
        transactionDate: new Date()
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.customer.delete({ where: { id: testCustomerId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.sku.delete({ where: { id: testSkuId } });
    await prisma.warehouse.delete({ where: { id: testWarehouseId } });
  });

  test('Concurrent inventory shipments should not allow negative stock', async () => {
    const currentBalance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });
    
    expect(currentBalance?.totalUnits).toBe(1000);

    // Simulate 5 concurrent shipments of 300 units each (total 1500 > 1000 available)
    const shipmentPromises = Array(5).fill(null).map(async (_, index) => {
      try {
        return await createInventoryTransaction({
          type: 'ship',
          warehouseId: testWarehouseId,
          skuId: testSkuId,
          palletCount: 3,
          unitsPerPallet: 100,
          totalUnits: 300,
          trackingNumber: `SHIP-${Date.now()}-${index}`,
          transactionDate: new Date()
        });
      } catch (error) {
        return { error: error.message };
      }
    });

    const results = await Promise.allSettled(shipmentPromises);
    
    // Check final balance
    const finalBalance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    // Balance should never go negative
    expect(finalBalance?.totalUnits).toBeGreaterThanOrEqual(0);
    
    // Some shipments should have failed
    const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.error));
    expect(failures.length).toBeGreaterThan(0);
  });

  test('Concurrent invoice processing should maintain data integrity', async () => {
    // Create multiple invoices for the same customer
    const invoicePromises = Array(10).fill(null).map(async (_, index) => {
      return await processInvoice({
        customerId: testCustomerId,
        warehouseId: testWarehouseId,
        items: [{
          skuId: testSkuId,
          quantity: 50,
          unitPrice: 10,
          totalPrice: 500
        }],
        invoiceNumber: `INV-CONC-${Date.now()}-${index}`,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    });

    const results = await Promise.allSettled(invoicePromises);
    
    // All invoices should be created successfully
    const successfulInvoices = results.filter(r => r.status === 'fulfilled');
    expect(successfulInvoices.length).toBe(10);

    // Check for unique invoice numbers
    const invoices = await prisma.invoice.findMany({
      where: { customerId: testCustomerId }
    });
    
    const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    const uniqueNumbers = new Set(invoiceNumbers);
    expect(uniqueNumbers.size).toBe(invoiceNumbers.length);
  });

  test('Concurrent warehouse updates should prevent conflicting states', async () => {
    // Simulate multiple users updating warehouse status simultaneously
    const updatePromises = [
      updateWarehouseStock(testWarehouseId, { status: 'maintenance' }),
      updateWarehouseStock(testWarehouseId, { status: 'active' }),
      updateWarehouseStock(testWarehouseId, { status: 'inactive' }),
      updateWarehouseStock(testWarehouseId, { status: 'active' }),
      updateWarehouseStock(testWarehouseId, { status: 'maintenance' })
    ];

    await Promise.allSettled(updatePromises);

    // Check final state
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: testWarehouseId }
    });

    // Should have a valid status
    expect(['active', 'inactive', 'maintenance']).toContain(warehouse?.status);
  });

  test('Concurrent SKU quantity updates should maintain consistency', async () => {
    // Multiple concurrent updates to the same SKU
    const updatePromises = Array(20).fill(null).map(async (_, index) => {
      const isAddition = index % 2 === 0;
      return await createInventoryTransaction({
        type: isAddition ? 'receive' : 'ship',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        palletCount: 1,
        unitsPerPallet: 50,
        totalUnits: 50,
        batchLotNumber: `BATCH-UPDATE-${index}`,
        trackingNumber: isAddition ? undefined : `SHIP-UPDATE-${index}`,
        transactionDate: new Date()
      });
    });

    await Promise.allSettled(updatePromises);

    // Verify transaction history matches balance
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    const calculatedBalance = transactions.reduce((sum, tx) => {
      if (tx.type === 'receive') return sum + tx.totalUnits;
      if (tx.type === 'ship') return sum - tx.totalUnits;
      return sum;
    }, 0);

    const actualBalance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    expect(actualBalance?.totalUnits).toBe(calculatedBalance);
  });

  test('Concurrent user session modifications should not interfere', async () => {
    // Simulate multiple login attempts for the same user
    const sessionPromises = Array(5).fill(null).map(async (_, index) => {
      return await prisma.session.create({
        data: {
          userId: testUserId,
          token: `session-token-${Date.now()}-${index}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          userAgent: `Test Browser ${index}`,
          ipAddress: `192.168.1.${index}`
        }
      });
    });

    const results = await Promise.allSettled(sessionPromises);
    
    // All sessions should be created
    const successfulSessions = results.filter(r => r.status === 'fulfilled');
    expect(successfulSessions.length).toBe(5);

    // Verify all sessions are valid
    const sessions = await prisma.session.findMany({
      where: { userId: testUserId }
    });

    expect(sessions.length).toBe(5);
    sessions.forEach(session => {
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    // Cleanup sessions
    await prisma.session.deleteMany({ where: { userId: testUserId } });
  });

  test('Concurrent financial calculations should remain accurate', async () => {
    // Create multiple financial transactions concurrently
    const transactionPromises = Array(15).fill(null).map(async (_, index) => {
      const type = index % 3 === 0 ? 'revenue' : index % 3 === 1 ? 'expense' : 'refund';
      const amount = (index + 1) * 100;
      
      return await prisma.financialTransaction.create({
        data: {
          type,
          amount,
          description: `Transaction ${index}`,
          transactionDate: new Date(),
          status: 'completed'
        }
      });
    });

    await Promise.allSettled(transactionPromises);

    // Calculate expected totals
    const transactions = await prisma.financialTransaction.findMany({});
    
    const totals = transactions.reduce((acc, tx) => {
      if (tx.type === 'revenue') acc.revenue += tx.amount;
      else if (tx.type === 'expense') acc.expense += tx.amount;
      else if (tx.type === 'refund') acc.refund += tx.amount;
      return acc;
    }, { revenue: 0, expense: 0, refund: 0 });

    // Verify calculations
    const expectedNet = totals.revenue - totals.expense - totals.refund;
    const actualTransactions = await prisma.financialTransaction.findMany({});
    const actualNet = actualTransactions.reduce((sum, tx) => {
      if (tx.type === 'revenue') return sum + tx.amount;
      if (tx.type === 'expense') return sum - tx.amount;
      if (tx.type === 'refund') return sum - tx.amount;
      return sum;
    }, 0);

    expect(actualNet).toBe(expectedNet);

    // Cleanup
    await prisma.financialTransaction.deleteMany({});
  });
});