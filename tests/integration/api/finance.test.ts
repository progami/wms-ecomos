import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { 
  createTestSku, 
  createTestWarehouse, 
  createTestInvoice, 
  createTestCostRate,
  createTestTransaction,
  createTestInventoryBalance 
} from './setup/fixtures'

describe('Finance API Endpoints', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let adminUser: any
  let regularUser: any
  let adminSession: any
  let userSession: any

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl

    // Create test users
    adminUser = await createTestUser(prisma, 'ADMIN')
    regularUser = await createTestUser(prisma, 'USER')
    
    // Create sessions
    adminSession = await createTestSession(adminUser.id)
    userSession = await createTestSession(regularUser.id)
  })

  afterAll(async () => {
    await teardownTestDatabase(prisma, databaseUrl)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/invoices', () => {
    it('should return list of invoices for authenticated user', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, { invoiceNumber: 'INV-001' })
      await createTestInvoice(prisma, warehouse.id, { invoiceNumber: 'INV-002' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('invoices')
      expect(response.body.invoices).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should filter invoices by status', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, { status: 'PENDING' })
      await createTestInvoice(prisma, warehouse.id, { status: 'PAID' })
      await createTestInvoice(prisma, warehouse.id, { status: 'DISPUTED' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/invoices?status=PENDING')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.invoices).toHaveLength(1)
      expect(response.body.invoices[0].status).toBe('PENDING')
    })

    it('should filter invoices by date range', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, { 
        invoiceDate: new Date('2024-01-01') 
      })
      await createTestInvoice(prisma, warehouse.id, { 
        invoiceDate: new Date('2024-02-01') 
      })
      await createTestInvoice(prisma, warehouse.id, { 
        invoiceDate: new Date('2024-03-01') 
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/invoices?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.invoices).toHaveLength(1)
    })

    it('should return 401 for unauthenticated request', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/invoices')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('POST /api/invoices', () => {
    it('should create new invoice with valid data', async () => {
      const warehouse = await createTestWarehouse(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

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
            quantity: 1,
            unitPrice: 1500.00
          },
          {
            description: 'Handling Fee',
            amount: 1000.00,
            quantity: 2,
            unitPrice: 500.00
          }
        ]
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newInvoice)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        invoiceNumber: newInvoice.invoiceNumber,
        totalAmount: newInvoice.totalAmount,
        status: 'PENDING'
      })
      expect(response.body.items).toHaveLength(2)
    })

    it('should validate invoice data', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          invoiceNumber: 'INV-INVALID',
          // Missing required fields
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate invoice numbers', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, { invoiceNumber: 'INV-DUP-001' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')
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
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/invoices')
        .set('Cookie', 'next-auth.session-token=test-token')
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
      const invoice = await createTestInvoice(prisma, warehouse.id, { status: 'PENDING' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/invoices/${invoice.id}/accept`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          paymentReference: 'PAY-REF-001',
          paymentDate: new Date().toISOString()
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('PAID')
    })

    it('should not accept already paid invoice', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const invoice = await createTestInvoice(prisma, warehouse.id, { status: 'PAID' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/invoices/${invoice.id}/accept`)
        .set('Cookie', 'next-auth.session-token=test-token')
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
      const invoice = await createTestInvoice(prisma, warehouse.id, { status: 'PENDING' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/invoices/${invoice.id}/dispute`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          reason: 'Incorrect calculation',
          details: 'The storage fee is calculated incorrectly for week 2'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('DISPUTED')
      expect(response.body.disputeReason).toBe('Incorrect calculation')
    })
  })

  describe('GET /api/settings/rates', () => {
    it('should return cost rates for authenticated user', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, { rateName: 'Storage Rate' })
      await createTestCostRate(prisma, warehouse.id, { rateName: 'Handling Rate', type: 'HANDLING' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/settings/rates')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('rates')
      expect(response.body.rates).toHaveLength(2)
    })

    it('should filter rates by warehouse', async () => {
      const warehouse1 = await createTestWarehouse(prisma, { warehouseId: 'WH-RATE-001' })
      const warehouse2 = await createTestWarehouse(prisma, { warehouseId: 'WH-RATE-002' })
      
      await createTestCostRate(prisma, warehouse1.id)
      await createTestCostRate(prisma, warehouse2.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/settings/rates?warehouseId=${warehouse1.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.rates).toHaveLength(1)
      expect(response.body.rates[0].warehouseId).toBe(warehouse1.id)
    })

    it('should filter rates by type', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, { type: 'STORAGE' })
      await createTestCostRate(prisma, warehouse.id, { type: 'HANDLING' })
      await createTestCostRate(prisma, warehouse.id, { type: 'SHIPPING' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/settings/rates?type=STORAGE')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.rates).toHaveLength(1)
      expect(response.body.rates[0].type).toBe('STORAGE')
    })
  })

  describe('POST /api/settings/rates', () => {
    it('should create new cost rate', async () => {
      const warehouse = await createTestWarehouse(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const newRate = {
        rateName: 'New Storage Rate',
        warehouseId: warehouse.id,
        type: 'STORAGE',
        rate: 15.50,
        currency: 'USD',
        uom: 'per_unit_per_month',
        minQuantity: 0,
        maxQuantity: 500,
        effectiveFrom: new Date().toISOString(),
        effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/settings/rates')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newRate)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        rateName: newRate.rateName,
        rate: newRate.rate,
        type: newRate.type
      })
    })

    it('should prevent overlapping rate ranges', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestCostRate(prisma, warehouse.id, {
        type: 'STORAGE',
        minQuantity: 0,
        maxQuantity: 100
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/settings/rates')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          rateName: 'Overlapping Rate',
          warehouseId: warehouse.id,
          type: 'STORAGE',
          rate: 20.00,
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
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/settings/rates')
        .set('Cookie', 'next-auth.session-token=test-token')
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
      await createTestCostRate(prisma, warehouse.id, {
        type: 'STORAGE',
        minQuantity: 0,
        maxQuantity: 100
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/settings/rates/check-overlap?warehouseId=${warehouse.id}&type=STORAGE&minQuantity=50&maxQuantity=150`)
        .set('Cookie', 'next-auth.session-token=test-token')

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
      await createTestCostRate(prisma, warehouse.id, {
        type: 'STORAGE',
        rate: 10.00,
        uom: 'per_unit_per_month'
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        availableQuantity: 100,
        totalQuantity: 100
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/finance/calculate-costs')
        .set('Cookie', 'next-auth.session-token=test-token')
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

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/finance/calculate-costs')
        .set('Cookie', 'next-auth.session-token=test-token')
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
      await createTestInvoice(prisma, warehouse.id, { status: 'PENDING', totalAmount: 1000 })
      await createTestInvoice(prisma, warehouse.id, { status: 'PAID', totalAmount: 2000 })
      await createTestInvoice(prisma, warehouse.id, { status: 'DISPUTED', totalAmount: 500 })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/dashboard')
        .set('Cookie', 'next-auth.session-token=test-token')

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
      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'STORAGE',
          amount: 100.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'HANDLING',
          amount: 50.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/cost-ledger')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 150.00)
    })

    it('should filter by period', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'STORAGE',
          amount: 100.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'STORAGE',
          amount: 200.00,
          currency: 'USD',
          period: new Date('2024-02-01'),
          calculatedAt: new Date()
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/cost-ledger?period=2024-01')
        .set('Cookie', 'next-auth.session-token=test-token')

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
          skuId: sku.id,
          warehouseId: warehouse.id,
          date: new Date('2024-01-15'),
          quantity: 100,
          rate: 10.00,
          amount: 1000.00,
          currency: 'USD'
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/storage-ledger')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(1)
      expect(response.body.entries[0]).toMatchObject({
        quantity: 100,
        rate: 10.00,
        amount: 1000.00
      })
    })
  })

  describe('POST /api/finance/storage-calculation/weekly', () => {
    it('should calculate weekly storage costs', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      
      // Set up storage rate
      await createTestCostRate(prisma, warehouse.id, {
        type: 'STORAGE',
        rate: 10.00,
        uom: 'per_unit_per_week'
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        availableQuantity: 100,
        totalQuantity: 100
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/finance/storage-calculation/weekly')
        .set('Cookie', 'next-auth.session-token=test-token')
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
    it('should export cost ledger as CSV', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'EXPORT-001' })
      const warehouse = await createTestWarehouse(prisma)

      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'STORAGE',
          amount: 100.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/export/cost-ledger?period=2024-01')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.text).toContain('EXPORT-001')
    })
  })
})