import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { createTestSku } from './setup/fixtures'

// Mock next-auth at module level
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

describe('SKU API Endpoints', () => {
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

  describe('GET /api/skus', () => {
    it('should return list of SKUs for authenticated user', async () => {
      // Create test SKUs
      await createTestSku(prisma, { skuCode: 'TEST-001' })
      await createTestSku(prisma, { skuCode: 'TEST-002' })
      await createTestSku(prisma, { skuCode: 'TEST-003', isActive: false })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('skus')
      expect(response.body.skus).toHaveLength(2) // Only active SKUs
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should filter SKUs by search query', async () => {
      await createTestSku(prisma, { skuCode: 'WIDGET-001', description: 'Blue Widget' })
      await createTestSku(prisma, { skuCode: 'GADGET-001', description: 'Red Gadget' })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus?search=widget')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.skus).toHaveLength(1)
      expect(response.body.skus[0].skuCode).toBe('WIDGET-001')
    })

    it('should include inactive SKUs when requested', async () => {
      await createTestSku(prisma, { isActive: true })
      await createTestSku(prisma, { isActive: false })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus?includeInactive=true')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle pagination', async () => {
      // Create 15 SKUs
      for (let i = 0; i < 15; i++) {
        await createTestSku(prisma, { skuCode: `BULK-${i.toString().padStart(3, '0')}` })
      }

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus?page=2&limit=10')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages')
    })
  })

  describe('POST /api/skus', () => {
    it('should create new SKU with valid data', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const newSku = {
        skuCode: 'NEW-SKU-001',
        asin: 'B0123456789',
        description: 'New Test Product',
        packSize: 5,
        material: 'Metal',
        unitDimensionsCm: '15x15x15',
        unitWeightKg: 1.2,
        unitsPerCarton: 12,
        cartonDimensionsCm: '50x50x50',
        cartonWeightKg: 15.5,
        packagingType: 'Carton',
        notes: 'Test SKU creation',
        isActive: true
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(newSku)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        skuCode: newSku.skuCode,
        description: newSku.description,
        packSize: newSku.packSize
      })
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          skuCode: 'FORBIDDEN-SKU',
          description: 'Should not be created',
          packSize: 1,
          unitsPerCarton: 1
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          // Missing required fields
          description: 'Incomplete SKU'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate SKU codes', async () => {
      const existingSku = await createTestSku(prisma, { skuCode: 'DUPLICATE-001' })

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          skuCode: 'DUPLICATE-001',
          description: 'Duplicate SKU',
          packSize: 1,
          unitsPerCarton: 1
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })

    it('should sanitize input data', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/skus')
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          skuCode: '<script>alert("XSS")</script>',
          description: 'Test <b>Product</b>',
          packSize: 1,
          unitsPerCarton: 1
        })

      expect(response.status).toBe(201)
      expect(response.body.skuCode).not.toContain('<script>')
      expect(response.body.description).not.toContain('<b>')
    })
  })

  describe('GET /api/skus/:id', () => {
    it('should return SKU details by ID', async () => {
      const sku = await createTestSku(prisma)

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/skus/${sku.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: sku.id,
        skuCode: sku.skuCode,
        description: sku.description
      })
    })

    it('should return 404 for non-existent SKU', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/skus/non-existent-id')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'SKU not found')
    })
  })

  describe('PUT /api/skus/:id', () => {
    it('should update SKU with valid data', async () => {
      const sku = await createTestSku(prisma)

      mockGetServerSession.mockResolvedValue(adminSession)

      const updates = {
        description: 'Updated Description',
        packSize: 20,
        notes: 'Updated notes'
      }

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/skus/${sku.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send(updates)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should validate update data', async () => {
      const sku = await createTestSku(prisma)

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .put(`/api/skus/${sku.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')
        .send({
          packSize: -5 // Invalid negative value
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/skus/:id', () => {
    it('should soft delete SKU (set inactive)', async () => {
      const sku = await createTestSku(prisma)

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .delete(`/api/skus/${sku.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      
      // Verify SKU is inactive
      const deletedSku = await prisma.sKU.findUnique({
        where: { id: sku.id }
      })
      expect(deletedSku?.isActive).toBe(false)
    })

    it('should return 403 for non-admin users', async () => {
      const sku = await createTestSku(prisma)

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .delete(`/api/skus/${sku.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/skus/:id/next-batch', () => {
    it('should return next available batch for SKU', async () => {
      const sku = await createTestSku(prisma)
      
      // Create batches with different quantities
      await prisma.batch.create({
        data: {
          batchNumber: 'BATCH-001',
          skuId: sku.id,
          warehouseId: 'WH-001',
          quantity: 50,
          receivedDate: new Date('2024-01-01'),
          status: 'ACTIVE'
        }
      })

      await prisma.batch.create({
        data: {
          batchNumber: 'BATCH-002',
          skuId: sku.id,
          warehouseId: 'WH-001',
          quantity: 100,
          receivedDate: new Date('2024-01-15'),
          status: 'ACTIVE'
        }
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/skus/${sku.id}/next-batch`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('batchNumber', 'BATCH-001') // FIFO - oldest first
    })
  })
})