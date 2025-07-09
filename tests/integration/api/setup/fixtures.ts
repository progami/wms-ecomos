import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

// SKU fixtures
export async function createTestSku(prisma: PrismaClient, overrides = {}) {
  return prisma.sku.create({
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
      isActive: true,
      ...overrides
    }
  })
}

// Warehouse fixtures
export async function createTestWarehouse(prisma: PrismaClient, overrides = {}) {
  return prisma.warehouse.create({
    data: {
      code: `WH-${randomBytes(4).toString('hex')}`,
      name: 'Test Warehouse',
      address: 'Test Address',
      contactEmail: 'test@warehouse.com',
      contactPhone: '123-456-7890',
      isActive: true,
      ...overrides
    }
  })
}

// Transaction fixtures
export async function createTestTransaction(prisma: PrismaClient, skuId: string, warehouseId: string, createdById: string, overrides = {}) {
  return prisma.inventoryTransaction.create({
    data: {
      transactionId: `TXN-${randomBytes(4).toString('hex')}`,
      transactionType: 'RECEIVE',
      skuId,
      warehouseId,
      batchLot: `BATCH-${randomBytes(4).toString('hex')}`,
      cartonsIn: 10,
      transactionDate: new Date(),
      createdById,
      ...overrides
    }
  })
}

// Invoice fixtures
export async function createTestInvoice(prisma: PrismaClient, warehouseId: string, customerId: string, createdById: string, overrides = {}) {
  const billingPeriodStart = new Date()
  billingPeriodStart.setDate(1) // First day of month
  const billingPeriodEnd = new Date()
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1)
  billingPeriodEnd.setDate(0) // Last day of month
  
  return prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${randomBytes(4).toString('hex')}`,
      warehouseId,
      customerId,
      billingPeriodStart,
      billingPeriodEnd,
      invoiceDate: new Date(),
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subtotal: 1000.00,
      taxAmount: 0,
      totalAmount: 1000.00,
      currency: 'USD',
      status: 'pending',
      createdById,
      lineItems: {
        create: [
          {
            costCategory: 'Storage',
            costName: 'Storage Fee',
            quantity: 1,
            unitRate: 500.00,
            amount: 500.00
          },
          {
            costCategory: 'Unit',
            costName: 'Handling Fee',
            quantity: 1,
            unitRate: 500.00,
            amount: 500.00
          }
        ]
      },
      ...overrides
    },
    include: {
      lineItems: true
    }
  })
}

// Cost rate fixtures
export async function createTestCostRate(prisma: PrismaClient, warehouseId: string, createdById: string, overrides = {}) {
  return prisma.costRate.create({
    data: {
      costName: 'Test Rate',
      warehouseId,
      costCategory: 'Storage',
      costValue: 10.00,
      unitOfMeasure: 'per_unit_per_month',
      effectiveDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true,
      createdById,
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
      batchLot: `BATCH-${randomBytes(4).toString('hex')}`,
      currentCartons: 10,
      currentPallets: 1,
      currentUnits: 240, // 10 cartons * 24 units per carton
      ...overrides
    }
  })
}

// User fixtures
export async function createTestAdminUser(prisma: PrismaClient) {
  return prisma.user.create({
    data: {
      email: `admin-${randomBytes(4).toString('hex')}@example.com`,
      fullName: 'Test Admin',
      passwordHash: '$2a$10$VldXqq6urbAo54EIvz79N.qRZqpI6JRtSBFOXwsnkcCyY5ZAjdVUm', // password: "password123"
      role: 'admin',
      isActive: true
    }
  })
}

// Reconciliation fixtures
export async function createTestReconciliation(prisma: PrismaClient, invoiceId: string, overrides = {}) {
  return prisma.invoiceReconciliation.create({
    data: {
      invoiceId,
      costCategory: 'Storage',
      costName: 'Test Reconciliation',
      expectedAmount: 1000.00,
      invoicedAmount: 1000.00,
      difference: 0,
      status: 'match',
      ...overrides
    }
  })
}