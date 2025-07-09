import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Data Integrity During Failures', () => {
  let testWarehouseId: string;
  let testSkuId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Setup test data
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Integrity Test Warehouse',
        code: 'ITW',
        address: 'Test Address',
        isActive: true
      }
    });
    testWarehouseId = warehouse.id;

    const sku = await prisma.sku.create({
      data: {
        skuCode: 'SKU-INTEGRITY',
        description: 'Integrity Test SKU',
        packSize: 1,
        unitsPerCarton: 10,
        isActive: true
      }
    });
    testSkuId = sku.id;

    const user = await prisma.user.create({
      data: {
        email: 'integrity@test.com',
        fullName: 'Integrity User',
        passwordHash: 'hashed',
        role: 'admin'
      }
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryBalance.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.sku.delete({ where: { id: testSkuId } });
    await prisma.warehouse.delete({ where: { id: testWarehouseId } });
  });

  test('Transaction rollback on partial failure', async () => {
    const initialBalance = 1000;
    
    // Create initial inventory
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-INIT-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-INIT',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });

    // Attempt a transaction that will partially fail
    const tx = prisma.$transaction(async (prisma) => {
      // First operation - should succeed
      const shipment = await prisma.inventoryTransaction.create({
        data: {
          transactionId: `TX-SHIP-${Date.now()}`,
          transactionType: 'SHIP',
          warehouseId: testWarehouseId,
          skuId: testSkuId,
          batchLot: 'BATCH-INIT',
          cartonsIn: 0,
          cartonsOut: 50,
          storagePalletsIn: 0,
          shippingPalletsOut: 5,
          trackingNumber: 'SHIP-FAIL-001',
          transactionDate: new Date(),
          createdById: testUserId
        }
      });

      // Update balance
      await prisma.inventoryBalance.update({
        where: {
          warehouseId_skuId_batchLot: {
            warehouseId: testWarehouseId,
            skuId: testSkuId,
            batchLot: 'BATCH-INIT'
          }
        },
        data: {
          currentUnits: { decrement: 500 },
          currentCartons: { decrement: 50 },
          currentPallets: { decrement: 5 }
        }
      });

      // Force a failure by violating a constraint
      throw new Error('Simulated failure after balance update');
    });

    // Transaction should fail
    await expect(tx).rejects.toThrow('Simulated failure');

    // Verify data integrity - balance should remain unchanged
    const balance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    expect(balance?.currentUnits).toBe(initialBalance);

    // Verify no pending transactions were created
    const pendingTransactions = await prisma.inventoryTransaction.count({
      where: {
        isReconciled: false,
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    expect(pendingTransactions).toBe(0);
  });

  test('Cascading delete protection', async () => {
    // Create related data
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-CASCADE-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-CASCADE',
        cartonsIn: 50,
        cartonsOut: 0,
        storagePalletsIn: 5,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });

    // Try to delete SKU with existing transactions
    const deleteSku = async () => {
      await prisma.sku.delete({ where: { id: testSkuId } });
    };

    await expect(deleteSku()).rejects.toThrow();

    // SKU should still exist
    const sku = await prisma.sku.findUnique({ where: { id: testSkuId } });
    expect(sku).not.toBeNull();
  });

  test('Orphaned data prevention', async () => {
    // Create a transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-ORPHAN-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-ORPHAN',
        cartonsIn: 30,
        cartonsOut: 0,
        storagePalletsIn: 3,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });

    // Verify all foreign keys are valid
    const validWarehouse = await prisma.warehouse.findUnique({ 
      where: { id: transaction.warehouseId } 
    });
    const validSku = await prisma.sku.findUnique({ 
      where: { id: transaction.skuId } 
    });

    expect(validWarehouse).not.toBeNull();
    expect(validSku).not.toBeNull();

    // Attempt to create transaction with non-existent references
    const createOrphanedTransaction = async () => {
      await prisma.inventoryTransaction.create({
        data: {
          transactionId: `TX-ORPHAN-FAIL-${Date.now()}`,
          transactionType: 'SHIP',
          warehouseId: 'non-existent-warehouse',
          skuId: 'non-existent-sku',
          batchLot: 'BATCH-ORPHAN',
          cartonsIn: 0,
          cartonsOut: 10,
          storagePalletsIn: 0,
          shippingPalletsOut: 1,
          trackingNumber: 'ORPHAN-001',
          transactionDate: new Date(),
          createdById: testUserId
        }
      });
    };

    await expect(createOrphanedTransaction()).rejects.toThrow();
  });

  test('Audit trail consistency during failures', async () => {
    const auditLogCount = await prisma.auditLog.count();

    // Simulate a failed operation with audit logging
    const failedOperation = async () => {
      await prisma.$transaction(async (prisma) => {
        // Create audit log entry
        await prisma.auditLog.create({
          data: {
            userId: testUserId,
            action: 'inventory_update',
            tableName: 'inventory',
            recordId: testSkuId,
            changes: { before: 1000, after: 500 }
          }
        });

        // Simulate failure
        throw new Error('Operation failed after audit log');
      });
    };

    await expect(failedOperation()).rejects.toThrow();

    // Audit log should not have the failed operation entry
    const newAuditLogCount = await prisma.auditLog.count();
    expect(newAuditLogCount).toBe(auditLogCount);
  });

  test('Data consistency with constraint violations', async () => {
    // Create initial data
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-CONST-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-CONST',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });

    // Attempt to create invalid shipment (more than available)
    const invalidShipment = async () => {
      await prisma.$transaction(async (prisma) => {
        const balance = await prisma.inventoryBalance.findFirst({
          where: {
            warehouseId: testWarehouseId,
            skuId: testSkuId
          }
        });

        if (!balance || balance.currentUnits < 2000) {
          throw new Error('Insufficient inventory');
        }

        await prisma.inventoryTransaction.create({
          data: {
            transactionId: `TX-INVALID-${Date.now()}`,
            transactionType: 'SHIP',
            warehouseId: testWarehouseId,
            skuId: testSkuId,
            batchLot: 'BATCH-CONST',
            cartonsIn: 0,
            cartonsOut: 200,
            storagePalletsIn: 0,
            shippingPalletsOut: 20,
            trackingNumber: 'INVALID-SHIP',
            transactionDate: new Date(),
            createdById: testUserId
          }
        });
      });
    };

    await expect(invalidShipment()).rejects.toThrow('Insufficient inventory');

    // Verify balance remains correct
    const balance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });

    expect(balance?.currentUnits).toBe(1000);
  });

  test('Referential integrity with invoices', async () => {
    // Create customer user
    const customer = await prisma.user.create({
      data: {
        email: 'customer-ref@test.com',
        fullName: 'Test Customer',
        passwordHash: 'hashed',
        role: 'staff'
      }
    });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-REF-001',
        customerId: customer.id,
        warehouseId: testWarehouseId,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        invoiceDate: new Date(),
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 1000,
        taxAmount: 0,
        totalAmount: 1000,
        status: 'pending',
        createdById: testUserId
      }
    });

    // Invoice should be accessible with customer info
    const invoiceWithCustomer = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true }
    });

    expect(invoiceWithCustomer).not.toBeNull();
    expect(invoiceWithCustomer?.customer).not.toBeNull();
    expect(invoiceWithCustomer?.customer?.email).toBe('customer-ref@test.com');

    // Cleanup
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.user.delete({ where: { id: customer.id } });
  });

  test('Unique constraint handling in concurrent scenarios', async () => {
    // Attempt to create duplicate invoice numbers concurrently
    const invoiceNumber = 'INV-UNIQUE-001';
    
    const createInvoicePromises = Array(5).fill(null).map(async () => {
      try {
        return await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: testUserId, // Using user ID as customer for simplicity
            warehouseId: testWarehouseId,
            billingPeriodStart: new Date(),
            billingPeriodEnd: new Date(),
            invoiceDate: new Date(),
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            subtotal: 1000,
            taxAmount: 0,
            totalAmount: 1000,
            status: 'pending',
            createdById: testUserId
          }
        });
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    const results = await Promise.allSettled(createInvoicePromises);
    
    // Only one should succeed
    const successes = results.filter(r => 
      r.status === 'fulfilled' && r.value && !('error' in r.value)
    );
    expect(successes.length).toBe(1);

    // Verify only one invoice exists
    const invoices = await prisma.invoice.findMany({
      where: { invoiceNumber }
    });
    expect(invoices.length).toBe(1);

    // Cleanup
    await prisma.invoice.deleteMany({ where: { invoiceNumber } });
  });
});