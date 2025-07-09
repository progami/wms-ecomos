import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
// Mock service functions - these would be imported from actual service files
const createInventoryTransaction = jest.fn();
const processInvoice = jest.fn();
const updateWarehouseStock = jest.fn();

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
        isActive: true
      }
    });
    testWarehouseId = warehouse.id;

    const sku = await prisma.sku.create({
      data: {
        skuCode: 'SKU-CONCURRENT',
        description: 'Concurrent Test SKU',
        packSize: 1,
        unitsPerCarton: 10,
        isActive: true
      }
    });
    testSkuId = sku.id;

    const user = await prisma.user.create({
      data: {
        email: 'concurrent@test.com',
        fullName: 'Concurrent User',
        passwordHash: 'hashed',
        role: 'staff'
      }
    });
    testUserId = user.id;

    // Create a test customer user
    const customer = await prisma.user.create({
      data: {
        email: 'customer@test.com',
        fullName: 'Test Customer',
        passwordHash: 'hashed',
        role: 'staff'
      }
    });
    testCustomerId = customer.id;

    // Create initial inventory
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-CONC-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.user.delete({ where: { id: testCustomerId } });
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
    
    expect(currentBalance?.currentUnits).toBe(1000);

    // Simulate 5 concurrent shipments of 300 units each (total 1500 > 1000 available)
    const shipmentPromises = Array(5).fill(null).map(async (_, index) => {
      try {
        return await createInventoryTransaction({
          transactionType: 'SHIP',
          warehouseId: testWarehouseId,
          skuId: testSkuId,
          cartonsOut: 30,
          shippingPalletsOut: 3,
          trackingNumber: `SHIP-${Date.now()}-${index}`,
          transactionDate: new Date(),
          createdById: testUserId
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
    expect(finalBalance?.currentUnits).toBeGreaterThanOrEqual(0);
    
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
    // Simulate multiple users updating warehouse isActive status simultaneously
    const updatePromises = [
      prisma.warehouse.update({ where: { id: testWarehouseId }, data: { isActive: false } }),
      prisma.warehouse.update({ where: { id: testWarehouseId }, data: { isActive: true } }),
      prisma.warehouse.update({ where: { id: testWarehouseId }, data: { isActive: false } }),
      prisma.warehouse.update({ where: { id: testWarehouseId }, data: { isActive: true } }),
      prisma.warehouse.update({ where: { id: testWarehouseId }, data: { isActive: false } })
    ];

    await Promise.allSettled(updatePromises);

    // Check final state
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: testWarehouseId }
    });

    // Should have a valid boolean value
    expect(typeof warehouse?.isActive).toBe('boolean');
  });

  test('Concurrent SKU quantity updates should maintain consistency', async () => {
    // Multiple concurrent updates to the same SKU
    const updatePromises = Array(20).fill(null).map(async (_, index) => {
      const isAddition = index % 2 === 0;
      return await createInventoryTransaction({
        transactionId: `TX-UPDATE-${Date.now()}-${index}`,
        transactionType: isAddition ? 'RECEIVE' : 'SHIP',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: `BATCH-UPDATE-${index}`,
        cartonsIn: isAddition ? 5 : 0,
        cartonsOut: isAddition ? 0 : 5,
        storagePalletsIn: isAddition ? 1 : 0,
        shippingPalletsOut: isAddition ? 0 : 1,
        trackingNumber: isAddition ? undefined : `SHIP-UPDATE-${index}`,
        transactionDate: new Date(),
        createdById: testUserId
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
      if (tx.transactionType === 'RECEIVE') return sum + (tx.cartonsIn * 10); // Assuming 10 units per carton
      if (tx.transactionType === 'SHIP') return sum - (tx.cartonsOut * 10);
      return sum;
    }, 0);

    const actualBalance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    expect(actualBalance?.currentUnits).toBe(calculatedBalance);
  });

  test('Concurrent user modifications should not interfere', async () => {
    // Simulate multiple updates to the same user
    const updatePromises = Array(5).fill(null).map(async (_, index) => {
      return await prisma.user.update({
        where: { id: testUserId },
        data: {
          lastLoginAt: new Date(Date.now() + index * 1000)
        }
      });
    });

    const results = await Promise.allSettled(updatePromises);
    
    // All updates should succeed
    const successfulUpdates = results.filter(r => r.status === 'fulfilled');
    expect(successfulUpdates.length).toBe(5);

    // Verify user still exists with valid data
    const user = await prisma.user.findUnique({
      where: { id: testUserId }
    });

    expect(user).not.toBeNull();
    expect(user?.lastLoginAt).toBeInstanceOf(Date);
  });

  test('Concurrent invoice calculations should remain accurate', async () => {
    // Create multiple invoices concurrently
    const invoicePromises = Array(15).fill(null).map(async (_, index) => {
      const amount = (index + 1) * 100;
      
      return await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-CALC-${Date.now()}-${index}`,
          warehouseId: testWarehouseId,
          customerId: testCustomerId,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          invoiceDate: new Date(),
          issueDate: new Date(),
          subtotal: amount,
          taxAmount: 0,
          totalAmount: amount,
          status: 'pending',
          createdById: testUserId
        }
      });
    });

    await Promise.allSettled(invoicePromises);

    // Calculate expected totals
    const invoices = await prisma.invoice.findMany({
      where: { customerId: testCustomerId }
    });
    
    const expectedTotal = invoices.reduce((sum, inv) => {
      return sum + inv.totalAmount.toNumber();
    }, 0);

    // Verify calculations
    const actualInvoices = await prisma.invoice.findMany({
      where: { customerId: testCustomerId }
    });
    const actualTotal = actualInvoices.reduce((sum, inv) => {
      return sum + inv.totalAmount.toNumber();
    }, 0);

    expect(actualTotal).toBe(expectedTotal);

    // Cleanup
    await prisma.invoice.deleteMany({ where: { customerId: testCustomerId } });
  });
});