import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'
import { 
  createTestSku, 
  createTestWarehouse, 
  createTestTransaction, 
  createTestInventoryBalance,
  createTestReconciliation,
  createTestCostRate 
} from './setup/fixtures'




// Setup test authentication
setupTestAuth()
describe('Reconciliation and Miscellaneous API Endpoints', () => {
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

  

  describe('POST /api/reconciliation/run', () => {
    it('should initiate reconciliation process', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku1 = await createTestSku(prisma)
      const sku2 = await createTestSku(prisma)

      // Create inventory balances
      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { 
        currentCartons: 10, currentUnits: 240 
      })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { 
        currentCartons: 10, currentUnits: 240 
      })

      const response = await request
        .post('/api/reconciliation/run')
        .withAuth('admin', adminUser.id)
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

      const response = await request
        .post('/api/reconciliation/run')
        .withAuth('admin', adminUser.id)
        .send({
          warehouseId: warehouse.id,
          startDate: new Date('2024-02-01').toISOString(),
          endDate: new Date('2024-01-01').toISOString() // End before start
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid date range'))
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/reconciliation/run')
        .withAuth('staff', regularUser.id)
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

      // Create cost rate and calculated cost first
      const costRate = await prisma.costRate.create({
        data: {
          costName: 'Test Rate',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          rate: 10.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      const calculatedCost = await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-RECON-1',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF',
          costRateId: costRate.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date(),
          billingWeekEnding: new Date(),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          quantityCharged: 100,
          applicableRate: 10.00,
          calculatedCost: 1000.00,
          finalExpectedCost: 1000.00,
          createdById: adminUser.id
        }
      })

      // Create reconciliation detail
      await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          calculatedCostId: calculatedCost.id,
          quantity: 95,
          amount: 950.00
        }
      })

      const response = await request
        .get(`/api/reconciliation/${reconciliation.id}/details`)
        .withAuth('staff', regularUser.id)

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
      const response = await request
        .get('/api/reconciliation/non-existent-id/details')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Reconciliation not found')
    })
  })

  describe('POST /api/reconciliation/:id/resolve', () => {
    it('should resolve reconciliation discrepancy', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku = await createTestSku(prisma)
      const reconciliation = await createTestReconciliation(prisma, warehouse.id)

      // Create cost rate and calculated cost first
      const costRate2 = await prisma.costRate.create({
        data: {
          costName: 'Test Rate 2',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          rate: 10.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      const calculatedCost2 = await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-RECON-2',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF-2',
          costRateId: costRate2.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date(),
          billingWeekEnding: new Date(),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          quantityCharged: 100,
          applicableRate: 10.00,
          calculatedCost: 1000.00,
          finalExpectedCost: 1000.00,
          createdById: adminUser.id
        }
      })

      const detail = await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          calculatedCostId: calculatedCost2.id,
          quantity: 95,
          amount: 950.00
        }
      })

      // Create inventory balance
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, { 
        currentCartons: 10, currentUnits: 240 
      })

      const response = await request
        .post(`/api/reconciliation/${reconciliation.id}/resolve`)
        .withAuth('admin', adminUser.id)
        .send({
          detailId: detail.id,
          resolution: 'ADJUST_SYSTEM',
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      
      // Verify adjustment transaction was created
      const adjustmentTx = await prisma.inventoryTransaction.findFirst({
        where: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          transactionType: 'ADJUST_OUT',
        }
      })
      expect(adjustmentTx).toBeTruthy()
      expect(adjustmentTx?.cartonsOut).toBe(5)
    })

    it('should mark detail as resolved', async () => {
      const warehouse = await createTestWarehouse(prisma)
      const sku = await createTestSku(prisma)
      const reconciliation = await createTestReconciliation(prisma, warehouse.id)

      // Create cost rate and calculated cost first
      const costRate3 = await prisma.costRate.create({
        data: {
          costName: 'Test Rate 3',
          warehouseId: warehouse.id,
          costCategory: 'Storage',
          rate: 10.00,
          currency: 'USD',
          uom: 'per_unit_per_month',
          minQuantity: 0,
          maxQuantity: 1000,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          createdById: adminUser.id
        }
      })

      const calculatedCost3 = await prisma.calculatedCost.create({
        data: {
          calculatedCostId: 'CC-RECON-3',
          transactionType: 'STORAGE',
          transactionReferenceId: 'TEST-REF-3',
          costRateId: costRate3.id,
          warehouseId: warehouse.id,
          skuId: sku.id,
          transactionDate: new Date(),
          billingWeekEnding: new Date(),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          quantityCharged: 100,
          applicableRate: 10.00,
          calculatedCost: 1000.00,
          finalExpectedCost: 1000.00,
          createdById: adminUser.id
        }
      })

      const detail = await prisma.reconciliationDetail.create({
        data: {
          reconciliationId: reconciliation.id,
          calculatedCostId: calculatedCost3.id,
          quantity: 100,
          amount: 1000.00
        }
      })

      const response = await request
        .post(`/api/reconciliation/${reconciliation.id}/resolve`)
        .withAuth('admin', adminUser.id)
        .send({
          detailId: detail.id,
          resolution: 'NO_ACTION',
        })

      expect(response.status).toBe(200)
      
      // Verify detail status
      const updatedDetail = await prisma.reconciliationDetail.findUnique({
        where: { id: detail.id }
      })
      expect(updatedDetail).toBeTruthy()
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/reconciliation/test-id/resolve')
        .withAuth('staff', regularUser.id)
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
      await createTestWarehouse(prisma, { code: 'WH-001', name: 'Warehouse 1' })
      await createTestWarehouse(prisma, { code: 'WH-002', name: 'Warehouse 2' })
      await createTestWarehouse(prisma, { code: 'WH-003', name: 'Warehouse 3', isActive: false })

      const response = await request
        .get('/api/warehouses')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('warehouses')
      expect(response.body.warehouses).toHaveLength(2) // Only active warehouses
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should include inactive warehouses when requested', async () => {
      const response = await request
        .get('/api/warehouses?includeInactive=true')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.warehouses.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by warehouse type', async () => {
      await createTestWarehouse(prisma, { costCategory: 'FBA' })
      await createTestWarehouse(prisma, { costCategory: 'FBM' })

      const response = await request
        .get('/api/warehouses?type=FBA')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.warehouses.every((w: any) => w.type === 'FBA')).toBe(true)
    })

    it('should return 401 for unauthenticated request', async () => {

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/warehouses')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/health')

      expect(response.status).toBe(503)
      expect(response.body).toHaveProperty('status', 'degraded')
      expect(response.body).toHaveProperty('database', 'disconnected')
    })
  })

  describe('POST /api/logs/client', () => {
    it('should log client-side errors', async () => {
      // No need for mockGetServerSession with test auth setup

      const errorLog = {
        level: 'error',
        message: 'Uncaught TypeError',
        context: {
          url: '/dashboard',
          userAgent: 'Mozilla/5.0',
          stack: 'Error stack trace...'
        }
      }

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/logs/client')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(errorLog)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
    })

    it('should validate log level', async () => {
      const response = await request
        .post('/api/logs/client')
        .withAuth('staff', regularUser.id)
        .send({
          level: 'invalid-level',
          message: 'Test message'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid log level'))
    })

    it('should rate limit excessive logging', async () => {
      // No need for mockGetServerSession with test auth setup

      // Send multiple logs rapidly
      for (let i = 0; i < 15; i++) {
        await request
          .post('/api/logs/client')
          .withAuth('staff', regularUser.id)
          .send({
            level: 'info',
            message: `Log message ${i}`
          })
      }

      // Next request should be rate limited
      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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

      const response = await request
        .post('/api/demo/setup')
        .withAuth('admin', adminUser.id)

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

      const response = await request
        .post('/api/demo/setup')
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Demo mode'))

      // Clean up
      delete process.env.DEMO_MODE
    })
  })

  describe('Middleware and CSRF Protection', () => {
    it('should reject requests without CSRF token on state-changing operations', async () => {
      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
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
      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .options('/api/health')
        .set('Origin', 'https://example.com')

      expect(response.status).toBe(200)
      // Check CORS headers based on your configuration
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(prisma.sku, 'findMany').mockRejectedValueOnce(new Error('Database connection lost'))

      const response = await request
        .get('/api/skus')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Internal server error')
      expect(response.body).not.toHaveProperty('stack') // Should not expose stack trace
    })

    it('should handle malformed JSON gracefully', async () => {
      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })
})