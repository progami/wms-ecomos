import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'
import { createTestSku, createTestWarehouse, createTestTransaction } from './setup/fixtures'




// Setup test authentication
setupTestAuth()
describe('Transaction API Endpoints', () => {
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

  

  describe('GET /api/transactions', () => {
    it('should return list of transactions for authenticated user', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'RECEIVE',
        cartonsIn: 10
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'SHIP',
        cartonsOut: 5
      })

      const response = await request
        .get('/api/transactions')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/transactions')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should filter by transaction type', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'RECEIVE'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'SHIP'
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'ADJUST_OUT'
      })

      const response = await request
        .get('/api/transactions?type=RECEIVE')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].transactionType).toBe('RECEIVE')
    })

    it('should filter by date range', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionDate: new Date('2024-02-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionDate: new Date('2024-03-01')
      })

      const response = await request
        .get('/api/transactions?startDate=2024-01-15&endDate=2024-02-15')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
    })

    it('should handle pagination', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create 15 transactions
      for (let i = 0; i < 15; i++) {
        await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
          referenceId: `TX-${i.toString().padStart(3, '0')}`
        })
      }

      const response = await request
        .get('/api/transactions?page=2&limit=10')
        .withAuth('staff', regularUser.id)

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
      // No need for mockGetServerSession with test auth setup

      const newTransaction = {
        transactionType: 'RECEIVE',
        skuId: sku.id,
        warehouseId: warehouse.id,
        batchLot: 'BATCH-001',
        cartonsIn: 10,
        referenceId: 'REC-001',
        transactionDate: new Date().toISOString(),
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newTransaction)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        transactionType: newTransaction.transactionType,
        cartonsIn: newTransaction.cartonsIn,
        referenceId: newTransaction.referenceId
      })
    })

    it('should update inventory balance on receive transaction', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      const response = await request
        .post('/api/transactions')
        .withAuth('admin', adminUser.id)
        .send({
          transactionType: 'RECEIVE',
          transactionSubtype: 'STANDARD',
          skuId: sku.id,
          warehouseId: warehouse.id,
          cartonsIn: 10,
          referenceId: 'REC-002',
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
      const response = await request
        .post('/api/transactions')
        .withAuth('admin', adminUser.id)
        .send({
          transactionType: 'INVALID_TYPE',
          cartonsOut: 3 // Invalid for receive
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent ship transaction exceeding available inventory', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, {
        currentCartons: 10, currentUnits: 240,
        totalQuantity: 50
      })

      const response = await request
        .post('/api/transactions')
        .withAuth('admin', adminUser.id)
        .send({
          transactionType: 'SHIP',
          transactionSubtype: 'STANDARD',
          skuId: sku.id,
          warehouseId: warehouse.id,
          cartonsOut: 3, // Exceeds available
          referenceId: 'SHIP-001',
          transactionDate: new Date().toISOString()
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Insufficient inventory'))
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/transactions')
        .withAuth('staff', regularUser.id)
        .send({
          transactionType: 'RECEIVE',
          cartonsIn: 10
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details by ID', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id)

      const response = await request
        .get(`/api/transactions/${transaction.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: transaction.id,
        transactionType: transaction.transactionType,
        cartonsIn: transaction.cartonsIn
      })
    })

    it('should include related data when requested', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'TX-SKU-001' })
      const warehouse = await createTestWarehouse(prisma, { name: 'TX Warehouse' })
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id)

      const response = await request
        .get(`/api/transactions/${transaction.id}?includeRelated=true`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('sku')
      expect(response.body).toHaveProperty('warehouse')
      expect(response.body.sku.skuCode).toBe('TX-SKU-001')
      expect(response.body.warehouse.name).toBe('TX Warehouse')
    })

    it('should return 404 for non-existent transaction', async () => {
      const response = await request
        .get('/api/transactions/non-existent-id')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Transaction not found')
    })
  })

  describe('PUT /api/transactions/:id', () => {
    it('should update transaction status', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        isReconciled: false
      })

      const response = await request
        .put(`/api/transactions/${transaction.id}`)
        .withAuth('admin', adminUser.id)
        .send({
          isReconciled: true
        })

      expect(response.status).toBe(200)
      expect(response.body.isReconciled).toBe(true)
    })

    it('should not allow quantity updates', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        cartonsIn: 10
      })

      const response = await request
        .put(`/api/transactions/${transaction.id}`)
        .withAuth('admin', adminUser.id)
        .send({
          cartonsIn: 10 // Should not be allowed
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('cannot be modified'))
    })
  })

  describe('POST /api/transactions/:id/attributes', () => {
    it('should add attributes to transaction', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id)

      // No need for mockGetServerSession with test auth setup

      const attributes = {
        customField1: 'value1',
        customField2: 'value2',
        trackingNumber: 'TRACK123'
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id)

      const response = await request
        .post(`/api/transactions/${transaction.id}/attachments`)
        .withAuth('admin', adminUser.id)
        .attach('file', Buffer.from('test file content'), 'test-document.pdf')
        .field('description', 'Test attachment')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('filename', 'test-document.pdf')
    })

    it('should validate file size', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      const transaction = await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id)

      // No need for mockGetServerSession with test auth setup

      // Create a large buffer (over 10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024)

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'RECEIVE',
        cartonsIn: 10,
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'SHIP',
        cartonsOut: 3,
        transactionDate: new Date('2024-01-15')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'ADJUST_OUT',
        cartonsOut: 3,
        transactionDate: new Date('2024-01-20')
      })

      const response = await request
        .get(`/api/transactions/ledger?skuId=${sku.id}&warehouseId=${warehouse.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('entries')
      expect(response.body.entries).toHaveLength(3)
      expect(response.body.entries[2].runningBalance).toBe(65) // 100 - 30 - 5
    })
  })
})