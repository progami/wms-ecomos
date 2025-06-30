import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

// SKU fixtures
export async function createTestSku(prisma: PrismaClient, overrides = {}) {
  return prisma.sKU.create({
    data: {
      skuCode: `TEST-${randomBytes(4).toString('hex')}`,
      asin: `B0${randomBytes(4).toString('hex').toUpperCase()}`,
      description: 'Test Product Description',
      packSize: 10,
      material: 'Plastic',
      unitDimensionsCm: '10x10x10',
      unitWeightKg: 0.5,
      unitsPerCarton: 24,
      cartonDimensionsCm: '40x40x40',
      cartonWeightKg: 12.5,
      packagingType: 'Box',
      notes: 'Test notes',
      isActive: true,
      ...overrides
    }
  })
}

// Warehouse fixtures
export async function createTestWarehouse(prisma: PrismaClient, overrides = {}) {
  return prisma.warehouse.create({
    data: {
      warehouseId: `WH-${randomBytes(4).toString('hex')}`,
      name: 'Test Warehouse',
      type: 'FBA',
      country: 'US',
      isActive: true,
      ...overrides
    }
  })
}

// Transaction fixtures
export async function createTestTransaction(prisma: PrismaClient, skuId: string, warehouseId: string, overrides = {}) {
  return prisma.transaction.create({
    data: {
      transactionType: 'RECEIVE',
      transactionSubtype: 'STANDARD',
      skuId,
      warehouseId,
      quantity: 100,
      referenceNumber: `REF-${randomBytes(4).toString('hex')}`,
      amazonShipmentId: `FBA${randomBytes(4).toString('hex').toUpperCase()}`,
      transactionDate: new Date(),
      status: 'COMPLETED',
      ...overrides
    }
  })
}

// Invoice fixtures
export async function createTestInvoice(prisma: PrismaClient, warehouseId: string, overrides = {}) {
  return prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${randomBytes(4).toString('hex')}`,
      warehouseId,
      totalAmount: 1000.00,
      currency: 'USD',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'PENDING',
      items: {
        create: [
          {
            description: 'Storage Fee',
            amount: 500.00,
            quantity: 1,
            unitPrice: 500.00
          },
          {
            description: 'Handling Fee',
            amount: 500.00,
            quantity: 1,
            unitPrice: 500.00
          }
        ]
      },
      ...overrides
    },
    include: {
      items: true
    }
  })
}

// Cost rate fixtures
export async function createTestCostRate(prisma: PrismaClient, warehouseId: string, overrides = {}) {
  return prisma.costRate.create({
    data: {
      rateName: 'Test Rate',
      warehouseId,
      type: 'STORAGE',
      rate: 10.00,
      currency: 'USD',
      uom: 'per_unit_per_month',
      minQuantity: 0,
      maxQuantity: 1000,
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true,
      ...overrides
    }
  })
}

// Inventory balance fixtures
export async function createTestInventoryBalance(prisma: PrismaClient, skuId: string, warehouseId: string, overrides = {}) {
  return prisma.inventoryBalance.create({
    data: {
      skuId,
      warehouseId,
      availableQuantity: 100,
      totalQuantity: 100,
      lastUpdated: new Date(),
      ...overrides
    }
  })
}

// Batch fixtures
export async function createTestBatch(prisma: PrismaClient, skuId: string, warehouseId: string, overrides = {}) {
  return prisma.batch.create({
    data: {
      batchNumber: `BATCH-${randomBytes(4).toString('hex')}`,
      skuId,
      warehouseId,
      quantity: 100,
      receivedDate: new Date(),
      status: 'ACTIVE',
      ...overrides
    }
  })
}

// User fixtures
export async function createTestAdminUser(prisma: PrismaClient) {
  return prisma.user.create({
    data: {
      email: `admin-${randomBytes(4).toString('hex')}@example.com`,
      name: 'Test Admin',
      password: '$2a$10$K7L1mrbVHC5SZxyoakG6wuqJPqm3WNmRuW9fhJz1w9TNJLXdJ1aJS', // password: "password123"
      role: 'ADMIN',
      emailVerified: new Date(),
      isActive: true
    }
  })
}

// Reconciliation fixtures
export async function createTestReconciliation(prisma: PrismaClient, warehouseId: string, overrides = {}) {
  return prisma.reconciliation.create({
    data: {
      warehouseId,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(),
      status: 'PENDING',
      totalDiscrepancies: 0,
      totalSkus: 0,
      ...overrides
    }
  })
}