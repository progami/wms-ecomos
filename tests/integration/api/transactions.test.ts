import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { createTestSku, createTestWarehouse, createTestTransaction, createTestBatch } from './setup/fixtures'

describe('Transaction API Endpoints', () => {
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

  describe('GET /api/transactions', () => {
    it('should return list of transactions for authenticated user', async () => {
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

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
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

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions?type=RECEIVE')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].transactionType).toBe('RECEIVE')
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

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
    })

    it('should handle pagination', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create 15 transactions
      for (let i = 0; i < 15; i++) {
        await createTestTransaction(prisma, sku.id, warehouse.id, {
          referenceNumber: `TX-${i.toString().padStart(3, '0')}`
        })
      }

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions?page=2&limit=10')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages')
    })
  })

  describe('POST /api/transactions', () => {
    it('should create new transaction with valid data', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const batch = await createTestBatch(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const newTransaction = {
        transactionType: 'RECEIVE',
        transactionSubtype: 'STANDARD',
        skuId: sku.id,
        warehouseId: warehouse.id,
        batchId: batch.id,
        quantity: 50,
        referenceNumber: 'REC-001',
        amazonShipmentId: 'FBA123456',
        transactionDate: new Date().toISOString(),
        notes: 'Test receive transaction'
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newTransaction)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        transactionType: newTransaction.transactionType,
        quantity: newTransaction.quantity,
        referenceNumber: newTransaction.referenceNumber
      })
    })

    it('should update inventory balance on receive transaction', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          transactionType: 'RECEIVE',
          transactionSubtype: 'STANDARD',
          skuId: sku.id,
          warehouseId: warehouse.id,
          quantity: 100,
          referenceNumber: 'REC-002',
          transactionDate: new Date().toISOString()
        })

      expect(response.status).toBe(201)

      // Check inventory balance was created/updated
      const balance = await prisma.inventoryBalance.findFirst({
        where: { skuId: sku.id, warehouseId: warehouse.id }
      })
      expect(balance).toBeTruthy()
      expect(balance?.totalQuantity).toBe(100)
    })

    it('should validate transaction data', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          transactionType: 'INVALID_TYPE',
          quantity: -100 // Invalid for receive
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent ship transaction exceeding available inventory', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        availableQuantity: 50,
        totalQuantity: 50
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          transactionType: 'SHIP',
          transactionSubtype: 'STANDARD',
          skuId: sku.id,
          warehouseId: warehouse.id,
          quantity: -100, // Exceeds available
          referenceNumber: 'SHIP-001',
          transactionDate: new Date().toISOString()
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Insufficient inventory'))
    })

    it('should return 403 for non-admin users', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          transactionType: 'RECEIVE',
          quantity: 100
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details by ID', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/transactions/${transaction.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: transaction.id,
        transactionType: transaction.transactionType,
        quantity: transaction.quantity
      })
    })

    it('should include related data when requested', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'TX-SKU-001' })
      const warehouse = await createTestWarehouse(prisma, { name: 'TX Warehouse' })
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/transactions/${transaction.id}?includeRelated=true`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('sku')
      expect(response.body).toHaveProperty('warehouse')
      expect(response.body.sku.skuCode).toBe('TX-SKU-001')
      expect(response.body.warehouse.name).toBe('TX Warehouse')
    })

    it('should return 404 for non-existent transaction', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions/non-existent-id')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Transaction not found')
    })
  })

  describe('PUT /api/transactions/:id', () => {
    it('should update transaction status', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, {
        status: 'PENDING'
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          status: 'COMPLETED'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('COMPLETED')
    })

    it('should not allow quantity updates', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, {
        quantity: 100
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/transactions/${transaction.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          quantity: 200 // Should not be allowed
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('cannot be modified'))
    })
  })

  describe('POST /api/transactions/:id/attributes', () => {
    it('should add attributes to transaction', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const attributes = {
        customField1: 'value1',
        customField2: 'value2',
        trackingNumber: 'TRACK123'
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/transactions/${transaction.id}/attributes`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(attributes)

      expect(response.status).toBe(200)
      expect(response.body.attributes).toMatchObject(attributes)
    })
  })

  describe('POST /api/transactions/:id/attachments', () => {
    it('should upload attachment to transaction', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/transactions/${transaction.id}/attachments`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from('test file content'), 'test-document.pdf')
        .field('description', 'Test attachment')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('filename', 'test-document.pdf')
    })

    it('should validate file size', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      // Create a large buffer (over 10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/transactions/${transaction.id}/attachments`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', largeBuffer, 'large-file.pdf')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('File size'))
    })
  })

  describe('GET /api/transactions/ledger', () => {
    it('should return transaction ledger', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create transactions to build ledger
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 100,
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -30,
        transactionDate: new Date('2024-01-15')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'ADJUST',
        quantity: -5,
        transactionDate: new Date('2024-01-20')
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/transactions/ledger?skuId=${sku.id}&warehouseId=${warehouse.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(3)
      expect(response.body.entries[2].runningBalance).toBe(65) // 100 - 30 - 5
    })
  })
})