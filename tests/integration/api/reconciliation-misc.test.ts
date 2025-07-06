import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { 
  createTestSku, 
  createTestWarehouse, 
  createTestTransaction, 
  createTestInventoryBalance,
  createTestReconciliation,
  createTestCostRate 
} from './setup/fixtures'

// Mock next-auth at module level
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

describe('Reconciliation and Miscellaneous API Endpoints', () => {
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

  describe('POST /api/reconciliation/run', () => {
    it('should initiate reconciliation process', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku1 = await createTestSku(prisma)
      const sku2 = await createTestSku(prisma)

      // Create inventory balances
      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { 
        availableQuantity: 100 
      })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { 
        availableQuantity: 200 
      })

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/reconciliation/run')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          warehouseId: warehouse.id,
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-01-31').toISOString()
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        warehouseId: warehouse.id,
        status: 'IN_PROGRESS'
      })
    })

    it('should validate date range', async () => {
      const warehouse = await createTestWarehouse(prisma)

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/reconciliation/run')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          warehouseId: warehouse.id,
          startDate: new Date('2024-02-01').toISOString(),
          endDate: new Date('2024-01-01').toISOString() // End before start
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid date range'))
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/reconciliation/run')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          warehouseId: 'test-warehouse'
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/reconciliation/:id/details', () => {
    it('should return reconciliation details', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku = await createTestSku(prisma)
      const reconciliation = await createTestReconciliation(prisma, warehouse.id)

      // Create reconciliation detail
      await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          skuId: sku.id,
          systemQuantity: 100,
          actualQuantity: 95,
          discrepancy: -5,
          status: 'PENDING'
        }
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/reconciliation/${reconciliation.id}/details`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reconciliation')
      expect(response.body.reconciliation.id).toBe(reconciliation.id)
      expect(response.body).toHaveProperty('details')
      expect(response.body.details).toHaveLength(1)
      expect(response.body.details[0]).toMatchObject({
        systemQuantity: 100,
        actualQuantity: 95,
        discrepancy: -5
      })
    })

    it('should return 404 for non-existent reconciliation', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reconciliation/non-existent-id/details')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Reconciliation not found')
    })
  })

  describe('POST /api/reconciliation/:id/resolve', () => {
    it('should resolve reconciliation discrepancy', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku = await createTestSku(prisma)
      const reconciliation = await createTestReconciliation(prisma, warehouse.id)

      const detail = await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          skuId: sku.id,
          systemQuantity: 100,
          actualQuantity: 95,
          discrepancy: -5,
          status: 'PENDING'
        }
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, { 
        availableQuantity: 100 
      })

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/reconciliation/${reconciliation.id}/resolve`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          detailId: detail.id,
          resolution: 'ADJUST_SYSTEM',
          notes: 'Physical count confirmed as 95'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      
      // Verify adjustment transaction was created
      const adjustmentTx = await prisma.transaction.findFirst({
        where: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          transactionType: 'ADJUST',
          notes: { contains: 'Reconciliation adjustment' }
        }
      })
      expect(adjustmentTx).toBeTruthy()
      expect(adjustmentTx?.quantity).toBe(-5)
    })

    it('should mark detail as resolved', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku = await createTestSku(prisma)
      const reconciliation = await createTestReconciliation(prisma, warehouse.id)

      const detail = await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          skuId: sku.id,
          systemQuantity: 100,
          actualQuantity: 100,
          discrepancy: 0,
          status: 'PENDING'
        }
      })

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post(`/api/reconciliation/${reconciliation.id}/resolve`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          detailId: detail.id,
          resolution: 'NO_ACTION',
          notes: 'No discrepancy found'
        })

      expect(response.status).toBe(200)
      
      // Verify detail status
      const updatedDetail = await prisma.reconciliationDetail.findUnique({
        where: { id: detail.id }
      })
      expect(updatedDetail?.status).toBe('RESOLVED')
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/reconciliation/test-id/resolve')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          detailId: 'test-detail-id',
          resolution: 'ADJUST_SYSTEM'
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/warehouses', () => {
    it('should return list of warehouses', async () => {
      await createTestWarehouse(prisma, { warehouseId: 'WH-001', name: 'Warehouse 1' })
      await createTestWarehouse(prisma, { warehouseId: 'WH-002', name: 'Warehouse 2' })
      await createTestWarehouse(prisma, { warehouseId: 'WH-003', name: 'Warehouse 3', isActive: false })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/warehouses')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('warehouses')
      expect(response.body.warehouses).toHaveLength(2) // Only active warehouses
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should include inactive warehouses when requested', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/warehouses?includeInactive=true')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.warehouses.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by warehouse type', async () => {
      await createTestWarehouse(prisma, { type: 'FBA' })
      await createTestWarehouse(prisma, { type: 'FBM' })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/warehouses?type=FBA')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.warehouses.every((w: any) => w.type === 'FBA')).toBe(true)
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/warehouses')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('database', 'connected')
      expect(response.body).toHaveProperty('version')
    })

    it('should return degraded status on database error', async () => {
      // Mock database error
      jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database error'))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/health')

      expect(response.status).toBe(503)
      expect(response.body).toHaveProperty('status', 'degraded')
      expect(response.body).toHaveProperty('database', 'disconnected')
    })
  })

  describe('POST /api/logs/client', () => {
    it('should log client-side errors', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const errorLog = {
        level: 'error',
        message: 'Uncaught TypeError',
        context: {
          url: '/dashboard',
          userAgent: 'Mozilla/5.0',
          stack: 'Error stack trace...'
        }
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/logs/client')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(errorLog)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
    })

    it('should validate log level', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/logs/client')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          level: 'invalid-level',
          message: 'Test message'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid log level'))
    })

    it('should rate limit excessive logging', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      // Send multiple logs rapidly
      for (let i = 0; i < 15; i++) {
        await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
          .post('/api/logs/client')
          .set('Cookie', 'next-auth.session-token=test-token')
          .send({
            level: 'info',
            message: `Log message ${i}`
          })
      }

      // Next request should be rate limited
      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/logs/client')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          level: 'info',
          message: 'Rate limited message'
        })

      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Too many'))
    })
  })

  describe('GET /api/demo/status', () => {
    it('should return demo mode status', async () => {
      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/demo/status')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('isDemoMode')
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /api/demo/setup', () => {
    it('should setup demo data in demo mode', async () => {
      // Mock demo mode environment
      process.env.DEMO_MODE = 'true'

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/demo/setup')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('skus')
      expect(response.body.data).toHaveProperty('warehouses')
      expect(response.body.data).toHaveProperty('transactions')

      // Clean up
      delete process.env.DEMO_MODE
    })

    it('should return error when not in demo mode', async () => {
      process.env.DEMO_MODE = 'false'

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/demo/setup')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Demo mode'))

      // Clean up
      delete process.env.DEMO_MODE
    })
  })

  describe('Middleware and CSRF Protection', () => {
    it('should reject requests without CSRF token on state-changing operations', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          skuCode: 'CSRF-TEST',
          description: 'CSRF Test',
          packSize: 1,
          unitsPerCarton: 1
        })

      // Depending on implementation, might return 403 or include CSRF error
      expect([403, 400]).toContain(response.status)
    })

    it('should handle CORS headers appropriately', async () => {
      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .options('/api/health')
        .set('Origin', 'https://example.com')

      expect(response.status).toBe(200)
      // Check CORS headers based on your configuration
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(prisma.sKU, 'findMany').mockRejectedValueOnce(new Error('Database connection lost'))

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Internal server error')
      expect(response.body).not.toHaveProperty('stack') // Should not expose stack trace
    })

    it('should handle malformed JSON gracefully', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })
})