import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { createTestSku, createTestWarehouse, createTestInventoryBalance, createTestTransaction } from './setup/fixtures'

// Mock next-auth at module level
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

describe('Inventory API Endpoints', () => {
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

  describe('GET /api/inventory/balances', () => {
    it('should return inventory balances for authenticated user', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'INV-001' })
      const sku2 = await createTestSku(prisma, { skuCode: 'INV-002' })
      const warehouse = await createTestWarehouse(prisma, { warehouseId: 'WH-INV-001' })

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { availableQuantity: 100 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { availableQuantity: 200 })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/balances')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('balances')
      expect(response.body.balances).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should filter by warehouse', async () => {
      const sku = await createTestSku(prisma)
      const warehouse1 = await createTestWarehouse(prisma, { warehouseId: 'WH-001' })
      const warehouse2 = await createTestWarehouse(prisma, { warehouseId: 'WH-002' })

      await createTestInventoryBalance(prisma, sku.id, warehouse1.id)
      await createTestInventoryBalance(prisma, sku.id, warehouse2.id)

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/inventory/balances?warehouseId=${warehouse1.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.balances).toHaveLength(1)
      expect(response.body.balances[0].warehouseId).toBe(warehouse1.id)
    })

    it('should filter by SKU', async () => {
      const sku1 = await createTestSku(prisma)
      const sku2 = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id)
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id)

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/inventory/balances?skuId=${sku1.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.balances).toHaveLength(1)
      expect(response.body.balances[0].skuId).toBe(sku1.id)
    })

    it('should include SKU and warehouse details when requested', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'DETAIL-SKU' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Detail Warehouse' })
      await createTestInventoryBalance(prisma, sku.id, warehouse.id)

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/balances?includeDetails=true')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.balances[0]).toHaveProperty('sku')
      expect(response.body.balances[0]).toHaveProperty('warehouse')
      expect(response.body.balances[0].sku.skuCode).toBe('DETAIL-SKU')
      expect(response.body.balances[0].warehouse.name).toBe('Detail Warehouse')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/balances')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/inventory/transactions', () => {
    it('should return inventory transactions', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 100
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -50
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
    })

    it('should filter by date range', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-02-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-03-01')
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
    })

    it('should filter by transaction type', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'RECEIVE'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'SHIP'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'ADJUST'
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions?type=RECEIVE')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].transactionType).toBe('RECEIVE')
    })

    it('should paginate results', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create 15 transactions
      for (let i = 0; i < 15; i++) {
        await createTestTransaction(prisma, sku.id, warehouse.id, {
          referenceNumber: `REF-${i.toString().padStart(3, '0')}`
        })
      }

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions?page=2&limit=10')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions.length).toBeLessThanOrEqual(5)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages', 2)
    })
  })

  describe('POST /api/inventory/shipments/email', () => {
    it('should send shipment email notification', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const emailData = {
        to: 'customer@example.com',
        shipmentId: 'SHIP-001',
        trackingNumber: '1234567890',
        items: [
          { sku: 'TEST-001', description: 'Test Product', quantity: 5 }
        ]
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/inventory/shipments/email')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(emailData)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Email sent successfully')
    })

    it('should validate email data', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/inventory/shipments/email')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          // Missing required fields
          shipmentId: 'SHIP-001'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/inventory/incomplete', () => {
    it('should return incomplete transactions', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        status: 'PENDING'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        status: 'IN_PROGRESS'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        status: 'COMPLETED'
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/incomplete')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body.transactions.every((t: any) => t.status !== 'COMPLETED')).toBe(true)
    })

    it('should include transaction details', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'INCOMPLETE-001' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Incomplete Warehouse' })

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        status: 'PENDING',
        referenceNumber: 'INC-REF-001'
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/incomplete')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions[0]).toHaveProperty('sku')
      expect(response.body.transactions[0]).toHaveProperty('warehouse')
      expect(response.body.transactions[0].referenceNumber).toBe('INC-REF-001')
    })
  })
})