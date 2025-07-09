import { PrismaClient } from '@prisma/client'
import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createTestSku, createTestWarehouse, createTestInventoryBalance, createTestTransaction } from './setup/fixtures'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'

// Setup test authentication
setupTestAuth()

describe('Inventory API Endpoints', () => {
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

  describe('GET /api/inventory/balances', () => {
    it('should return inventory balances for authenticated user', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'INV-001' })
      const sku2 = await createTestSku(prisma, { skuCode: 'INV-002' })
      const warehouse = await createTestWarehouse(prisma, { code: 'WH-INV-001' })

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { currentCartons: 10, currentUnits: 240 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { currentCartons: 20, currentUnits: 480 })

      const response = await request
        .get('/api/inventory/balances')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('balances')
      expect(response.body.balances).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should filter by warehouse', async () => {
      const sku = await createTestSku(prisma)
      const warehouse1 = await createTestWarehouse(prisma, { code: 'WH-001' })
      const warehouse2 = await createTestWarehouse(prisma, { code: 'WH-002' })

      await createTestInventoryBalance(prisma, sku.id, warehouse1.id)
      await createTestInventoryBalance(prisma, sku.id, warehouse2.id)

      const response = await request
        .get(`/api/inventory/balances?warehouseId=${warehouse1.id}`)
        .withAuth('staff', regularUser.id)

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

      const response = await request
        .get(`/api/inventory/balances?skuId=${sku1.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.balances).toHaveLength(1)
      expect(response.body.balances[0].skuId).toBe(sku1.id)
    })

    it('should include SKU and warehouse details when requested', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'DETAIL-SKU' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Detail Warehouse' })
      await createTestInventoryBalance(prisma, sku.id, warehouse.id)

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/balances?includeDetails=true')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.balances[0]).toHaveProperty('sku')
      expect(response.body.balances[0]).toHaveProperty('warehouse')
      expect(response.body.balances[0].sku.skuCode).toBe('DETAIL-SKU')
      expect(response.body.balances[0].warehouse.name).toBe('Detail Warehouse')
    })

    it('should return 401 for unauthenticated request', async () => {
      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/balances')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/inventory/transactions', () => {
    it('should return inventory transactions', async () => {
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

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
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

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/transactions?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
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

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
        await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
          referenceId: `REF-${i.toString().padStart(3, '0')}`
        })
      }

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
      // No need for mockGetServerSession with test auth setup

      const emailData = {
        to: 'customer@example.com',
        shipmentId: 'SHIP-001',
        trackingNumber: '1234567890',
        items: [
          { sku: 'TEST-001', description: 'Test Product', cartonsIn: 10 }
        ]
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/inventory/shipments/email')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(emailData)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Email sent successfully')
    })

    it('should validate email data', async () => {
      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        isReconciled: false
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        isReconciled: false
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        isReconciled: true
      })

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/incomplete')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body.transactions.every((t: any) => !t.isReconciled)).toBe(true)
    })

    it('should include transaction details', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'INCOMPLETE-001' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Incomplete Warehouse' })

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        isReconciled: false,
        referenceId: 'INC-REF-001'
      })

      // No need for mockGetServerSession with test auth setup

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/inventory/incomplete')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.transactions[0]).toHaveProperty('sku')
      expect(response.body.transactions[0]).toHaveProperty('warehouse')
      expect(response.body.transactions[0].referenceId).toBe('INC-REF-001')
    })
  })
})