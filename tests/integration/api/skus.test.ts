import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest, setupTestAuth } from './setup/test-auth-setup'
import { createTestSku, createTestWarehouse, createTestTransaction } from './setup/fixtures'


// Setup test authentication
setupTestAuth()
describe('SKU API Endpoints', () => {
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

  describe('GET /api/skus', () => {
    it('should return list of SKUs for authenticated user', async () => {
      // Create test SKUs
      await createTestSku(prisma, { skuCode: 'TEST-001' })
      await createTestSku(prisma, { skuCode: 'TEST-002' })
      await createTestSku(prisma, { skuCode: 'TEST-003', isActive: false })

      const response = await request
        .get('/api/skus')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('skus')
      expect(response.body.skus).toHaveLength(2) // Only active SKUs
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(serverUrl)
        .get('/api/skus')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should filter SKUs by search query', async () => {
      await createTestSku(prisma, { skuCode: 'WIDGET-001', description: 'Blue Widget' })
      await createTestSku(prisma, { skuCode: 'GADGET-001', description: 'Red Gadget' })

      const response = await createAuthenticatedRequest(serverUrl, {
        id: regularUser.id,
        email: regularUser.email,
        name: regularUser.fullName,
        role: regularUser.role
      })
        .get('/api/skus?search=widget')

      expect(response.status).toBe(200)
      expect(response.body.skus).toHaveLength(1)
      expect(response.body.skus[0].skuCode).toBe('WIDGET-001')
    })

    it('should include inactive SKUs when requested', async () => {
      await createTestSku(prisma, { isActive: true })
      await createTestSku(prisma, { isActive: false })

      const response = await request
        .get('/api/skus?includeInactive=true')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle pagination', async () => {
      // Create 15 SKUs
      for (let i = 0; i < 15; i++) {
        await createTestSku(prisma, { skuCode: `BULK-${i.toString().padStart(3, '0')}` })
      }

      const response = await request
        .get('/api/skus?page=2&limit=10')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages')
    })
  })

  describe('POST /api/skus', () => {
    it('should create new SKU with valid data', async () => {
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
        isActive: true
      }

      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
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
      const response = await request
        .post('/api/skus')
        .withAuth('staff', regularUser.id)
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
      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
        .send({
          // Missing required fields
          description: 'Incomplete SKU'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate SKU codes', async () => {
      const existingSku = await createTestSku(prisma, { skuCode: 'DUPLICATE-001' })

      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
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
      const response = await request
        .post('/api/skus')
        .withAuth('admin', adminUser.id)
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

      const response = await request
        .get(`/api/skus/${sku.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: sku.id,
        skuCode: sku.skuCode,
        description: sku.description
      })
    })

    it('should return 404 for non-existent SKU', async () => {
      const response = await request
        .get('/api/skus/non-existent-id')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'SKU not found')
    })
  })

  describe('PUT /api/skus/:id', () => {
    it('should update SKU with valid data', async () => {
      const sku = await createTestSku(prisma)

      const updates = {
        description: 'Updated Description',
        packSize: 20,
      }

      const response = await request
        .put(`/api/skus/${sku.id}`)
        .withAuth('admin', adminUser.id)
        .send(updates)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should validate update data', async () => {
      const sku = await createTestSku(prisma)

      const response = await request
        .put(`/api/skus/${sku.id}`)
        .withAuth('admin', adminUser.id)
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

      const response = await request
        .delete(`/api/skus/${sku.id}`)
        .withAuth('admin', adminUser.id)

      expect(response.status).toBe(200)
      
      // Verify SKU is inactive
      const deletedSku = await prisma.sku.findUnique({
        where: { id: sku.id }
      })
      expect(deletedSku?.isActive).toBe(false)
    })

    it('should return 403 for non-admin users', async () => {
      const sku = await createTestSku(prisma)

      const response = await request
        .delete(`/api/skus/${sku.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/skus/:id/next-batch', () => {
    it('should return next available batch for SKU', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)
      
      // Create transactions with batch info
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        batchLot: 'BATCH-001',
        transactionType: 'RECEIVE',
        cartonsIn: 10,
        transactionDate: new Date('2024-01-01')
      })

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        batchLot: 'BATCH-002',
        transactionType: 'RECEIVE',
        cartonsIn: 10,
        transactionDate: new Date('2024-01-15')
      })

      const response = await request
        .get(`/api/skus/${sku.id}/next-batch`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('batchLot', 'BATCH-001') // FIFO - oldest first
    })
  })
})