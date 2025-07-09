import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'
import { 
  createTestSku, 
  createTestWarehouse, 
  createTestInvoice, 
  createTestCostRate,
  createTestTransaction,
  createTestInventoryBalance 
} from './setup/fixtures'




// Setup test authentication
setupTestAuth()
describe('Finance API Endpoints', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let adminUser: any
  let regularUser: any
  let request: ReturnType<typeof createAuthenticatedRequest>

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl

    // Create test users
    adminUser = await createTestUser(prisma, 'admin')
    regularUser = await createTestUser(prisma, 'staff')
    
    // Create authenticated request helper
    request = createAuthenticatedRequest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  

  describe('GET /api/invoices', () => {
    it('should return list of invoices for authenticated user', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { invoiceNumber: 'INV-001' })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { invoiceNumber: 'INV-002' })

      const response = await request
        .get('/api/invoices')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('invoices')
      expect(response.body.invoices).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should filter invoices by status', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'pending' })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'paid' })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'disputed' })

      const response = await request
        .get('/api/invoices?status=PENDING')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.invoices).toHaveLength(1)
      expect(response.body.invoices[0].status).toBe('pending')
    })

    it('should filter invoices by date range', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { 
        invoiceDate: new Date('2024-01-01') 
      })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { 
        invoiceDate: new Date('2024-02-01') 
      })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { 
        invoiceDate: new Date('2024-03-01') 
      })

      const response = await request
        .get('/api/invoices?startDate=2024-01-15&endDate=2024-02-15')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.invoices).toHaveLength(1)
    })

    it('should return 401 for unauthenticated request', async () => {
      // Use supertest directly without auth headers for unauthenticated request
      const supertest = require('supertest')
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/invoices')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('POST /api/invoices', () => {
    it('should create new invoice with valid data', async () => {
      const warehouse = await createTestWarehouse(prisma)

      // No need for mockGetServerSession with test auth setup

      const newInvoice = {
        invoiceNumber: 'INV-NEW-001',
        warehouseId: warehouse.id,
        totalAmount: 2500.00,
        currency: 'USD',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: 'Storage Fee - January',
            amount: 1500.00,
            unitPrice: 1500.00
          },
          {
            description: 'Handling Fee',
            amount: 1000.00,
            unitPrice: 500.00
          }
        ]
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newInvoice)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        invoiceNumber: newInvoice.invoiceNumber,
        totalAmount: newInvoice.totalAmount,
        status: 'pending'
      })
      expect(response.body.items).toHaveLength(2)
    })

    it('should validate invoice data', async () => {
      const response = await request
        .post('/api/invoices')
        .withAuth('admin', adminUser.id)
        .send({
          invoiceNumber: 'INV-INVALID',
          // Missing required fields
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate invoice numbers', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { invoiceNumber: 'INV-DUP-001' })

      const response = await request
        .post('/api/invoices')
        .withAuth('admin', adminUser.id)
        .send({
          invoiceNumber: 'INV-DUP-001',
          warehouseId: warehouse.id,
          totalAmount: 1000.00,
          currency: 'USD',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/invoices')
        .withAuth('staff', regularUser.id)
        .send({
          invoiceNumber: 'INV-FORBIDDEN'
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('POST /api/invoices/:id/accept', () => {
    it('should accept pending invoice', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const invoice = await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'pending' })

      const response = await request
        .post(`/api/invoices/${invoice.id}/accept`)
        .withAuth('admin', adminUser.id)
        .send({
          paymentReference: 'PAY-REF-001',
          paymentDate: new Date().toISOString()
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('paid')
    })

    it('should not accept already paid invoice', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const invoice = await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'paid' })

      const response = await request
        .post(`/api/invoices/${invoice.id}/accept`)
        .withAuth('admin', adminUser.id)
        .send({
          paymentReference: 'PAY-REF-002'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already paid'))
    })
  })

  describe('POST /api/invoices/:id/dispute', () => {
    it('should dispute pending invoice', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const invoice = await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'pending' })

      const response = await request
        .post(`/api/invoices/${invoice.id}/dispute`)
        .withAuth('admin', adminUser.id)
        .send({
          reason: 'Incorrect calculation',
          details: 'The storage fee is calculated incorrectly for week 2'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('disputed')
      expect(response.body.disputeReason).toBe('Incorrect calculation')
    })
  })

  describe('GET /api/settings/rates', () => {
    it('should return cost rates for authenticated user', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, adminUser.id, { rateName: 'Storage Rate' })
      await createTestCostRate(prisma, warehouse.id, adminUser.id, { rateName: 'Handling Rate', costCategory: 'HANDLING' })

      const response = await request
        .get('/api/settings/rates')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('rates')
      expect(response.body.rates).toHaveLength(2)
    })

    it('should filter rates by warehouse', async () => {
      const warehouse1 = await createTestWarehouse(prisma, { code: 'WH-RATE-001' })
      const warehouse2 = await createTestWarehouse(prisma, { code: 'WH-RATE-002' })
      
      await createTestCostRate(prisma, warehouse1.id, adminUser.id)
      await createTestCostRate(prisma, warehouse2.id, adminUser.id)

      const response = await request
        .get(`/api/settings/rates?warehouseId=${warehouse1.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.rates).toHaveLength(1)
      expect(response.body.rates[0].warehouseId).toBe(warehouse1.id)
    })

    it('should filter rates by type', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, adminUser.id, { costCategory: 'Storage' })
      await createTestCostRate(prisma, warehouse.id, adminUser.id, { costCategory: 'HANDLING' })
      await createTestCostRate(prisma, warehouse.id, adminUser.id, { costCategory: 'SHIPPING' })

      const response = await request
        .get('/api/settings/rates?type=STORAGE')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.rates).toHaveLength(1)
      expect(response.body.rates[0].type).toBe('STORAGE')
    })
  })

  describe('POST /api/settings/rates', () => {
    it('should create new cost rate', async () => {
      const warehouse = await createTestWarehouse(prisma)

      // No need for mockGetServerSession with test auth setup

      const newRate = {
        rateName: 'New Storage Rate',
        warehouseId: warehouse.id,
        costCategory: 'Storage',
        rate: 15.50,
        currency: 'USD',
        uom: 'per_unit_per_month',
        minQuantity: 0,
        maxQuantity: 500,
        effectiveFrom: new Date().toISOString(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/settings/rates')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newRate)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        rateName: newRate.rateName,
        rate: newRate.rate,
        costCategory: newRate.costCategory
      })
    })

    it('should prevent overlapping rate ranges', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, adminUser.id, {
        costCategory: 'Storage',
        minQuantity: 0,
        maxQuantity: 100
      })

      const response = await request
        .post('/api/settings/rates')
        .withAuth('admin', adminUser.id)
        .send({
          rateName: 'Overlapping Rate',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          costValue: 20.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 50, // Overlaps with existing 0-100
          maxQuantity: 150,
          effectiveFrom: new Date().toISOString()
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('overlap'))
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/settings/rates')
        .withAuth('staff', regularUser.id)
        .send({
          rateName: 'Forbidden Rate'
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/settings/rates/check-overlap', () => {
    it('should check for rate overlaps', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, adminUser.id, {
        costCategory: 'Storage',
        minQuantity: 0,
        maxQuantity: 100
      })

      const response = await request
        .get(`/api/settings/rates/check-overlap?warehouseId=${warehouse.id}&type=STORAGE&minQuantity=50&maxQuantity=150`)
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('hasOverlap', true)
      expect(response.body).toHaveProperty('overlappingRates')
      expect(response.body.overlappingRates).toHaveLength(1)
    })
  })

  describe('POST /api/finance/calculate-costs', () => {
    it('should calculate costs for specified period', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      
      // Set up cost rates
      await createTestCostRate(prisma, warehouse.id, adminUser.id, {
        costCategory: 'Storage',
        rate: 10.00,
        uom: 'per_unit_per_month'
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        currentCartons: 10, currentUnits: 240,
        totalQuantity: 100
      })

      const response = await request
        .post('/api/finance/calculate-costs')
        .withAuth('admin', adminUser.id)
        .send({
          warehouseId: warehouse.id,
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-31').toISOString()
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalCost')
      expect(response.body).toHaveProperty('breakdown')
      expect(response.body.totalCost).toBeGreaterThan(0)
    })

    it('should handle missing cost rates', async () => {
      const warehouse = await createTestWarehouse(prisma)

      const response = await request
        .post('/api/finance/calculate-costs')
        .withAuth('admin', adminUser.id)
        .send({
          warehouseId: warehouse.id,
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-31').toISOString()
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('No cost rates'))
    })
  })

  describe('GET /api/finance/dashboard', () => {
    it('should return finance dashboard data', async () => {
      const warehouse = await createTestWarehouse(prisma)
      
      // Create invoices with different statuses
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'pending', totalAmount: 1000 })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'paid', totalAmount: 2000 })
      await createTestInvoice(prisma, warehouse.id, regularUser.id, adminUser.id, { status: 'disputed', totalAmount: 500 })

      const response = await request
        .get('/api/finance/dashboard')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalPending', 1000)
      expect(response.body).toHaveProperty('totalPaid', 2000)
      expect(response.body).toHaveProperty('totalDisputed', 500)
      expect(response.body).toHaveProperty('invoiceCount', 3)
    })
  })

  describe('GET /api/finance/cost-ledger', () => {
    it('should return cost ledger entries', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create cost ledger entries
      const costRate1 = await prisma.costRate.create({
        data: {
          costName: 'Storage Rate',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          costValue: 10.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-TEST-1',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF-1',
          costRateId: costRate1.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date('2024-01-01'),
          billingWeekEnding: new Date('2024-01-07'),
          billingPeriodStart: new Date('2024-01-01'),
          billingPeriodEnd: new Date('2024-01-31'),
          quantityCharged: 10,
          applicableRate: 10.00,
          calculatedCost: 100.00,
          finalExpectedCost: 100.00,
          createdById: adminUser.id
        }
      })

      const costRate2 = await prisma.costRate.create({
        data: {
          costName: 'Handling Rate',
          warehouseId: warehouse.id,
          costCategory: 'Unit',
          costValue: 5.00,
          currency: 'USD',
          uom: 'per_unit',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-TEST-2',
          transactionType: 'HANDLING',
          transactionReferenceId: 'TEST-REF-2',
          costRateId: costRate2.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date('2024-01-01'),
          billingWeekEnding: new Date('2024-01-07'),
          billingPeriodStart: new Date('2024-01-01'),
          billingPeriodEnd: new Date('2024-01-31'),
          quantityCharged: 10,
          applicableRate: 5.00,
          calculatedCost: 50.00,
          finalExpectedCost: 50.00,
          createdById: adminUser.id
        }
      })

      const response = await request
        .get('/api/finance/cost-ledger')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 150.00)
    })

    it('should filter by period', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      const costRate3 = await prisma.costRate.create({
        data: {
          costName: 'Storage Rate Jan',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          costValue: 10.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-TEST-3',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF-3',
          costRateId: costRate3.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date('2024-01-01'),
          billingWeekEnding: new Date('2024-01-07'),
          billingPeriodStart: new Date('2024-01-01'),
          billingPeriodEnd: new Date('2024-01-31'),
          quantityCharged: 10,
          applicableRate: 10.00,
          calculatedCost: 100.00,
          finalExpectedCost: 100.00,
          createdById: adminUser.id
        }
      })

      const costRate4 = await prisma.costRate.create({
        data: {
          costName: 'Storage Rate Feb',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          costValue: 20.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-TEST-4',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF-4',
          costRateId: costRate4.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date('2024-02-01'),
          billingWeekEnding: new Date('2024-02-04'),
          billingPeriodStart: new Date('2024-02-01'),
          billingPeriodEnd: new Date('2024-02-29'),
          quantityCharged: 10,
          applicableRate: 20.00,
          calculatedCost: 200.00,
          finalExpectedCost: 200.00,
          createdById: adminUser.id
        }
      })

      const response = await request
        .get('/api/finance/cost-ledger?period=2024-01')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.entries).toHaveLength(1)
      expect(response.body.entries[0].amount).toBe(100.00)
    })
  })

  describe('GET /api/finance/storage-ledger', () => {
    it('should return storage ledger entries', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await prisma.storageLedger.create({
        data: {
          slId: 'SL-TEST-1',
          skuId: sku.id,
          warehouseId: warehouse.id,
          weekEndingDate: new Date('2024-01-07'),
          batchLot: 'BATCH001',
          cartonsEndOfMonday: 10,
          storagePalletsCharged: 1,
          applicableWeeklyRate: 10.00,
          calculatedWeeklyCost: 10.00,
          billingPeriodStart: new Date('2024-01-01'),
          billingPeriodEnd: new Date('2024-01-31')
        }
      })

      const response = await request
        .get('/api/finance/storage-ledger')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(1)
      expect(response.body.entries[0]).toMatchObject({
        cartonsEndOfMonday: 10,
        applicableWeeklyRate: '10.00',
        calculatedWeeklyCost: '10.00'
      })
    })
  })

  describe('POST /api/finance/storage-calculation/weekly', () => {
    it('should calculate weekly storage costs', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      
      // Set up storage rate
      await createTestCostRate(prisma, warehouse.id, adminUser.id, {
        costCategory: 'Storage',
        rate: 10.00,
        uom: 'per_unit_per_week'
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        currentCartons: 10, currentUnits: 240,
        totalQuantity: 100
      })

      const response = await request
        .post('/api/finance/storage-calculation/weekly')
        .withAuth('admin', adminUser.id)
        .send({
          weekStartDate: '2024-01-01'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('totalCalculated')
      expect(response.body).toHaveProperty('totalAmount')
    })
  })

  describe('GET /api/finance/export/cost-ledger', () => {
    it.skip('should export cost ledger as CSV - skipped: costLedger model not in schema', async () => {
      // This test is skipped because the costLedger model doesn't exist in the current schema
      // TODO: Update this test when cost ledger functionality is implemented
      expect(true).toBe(true)
    })
  })
})