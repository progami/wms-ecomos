import { callApiHandler } from './setup/mock-api-handler'
import { GET as getSkus, POST as createSku } from '@/app/api/skus/route'
import { GET as getSku, PUT as updateSku, DELETE as deleteSku } from '@/app/api/skus/[id]/route'
import { GET as getNextBatch } from '@/app/api/skus/[id]/next-batch/route'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// Mock getServerSession is already set up in jest.setup.integration.js
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('SKU API Endpoints', () => {
  const mockSku = {
    id: 'sku-123',
    skuCode: 'TEST-001',
    asin: null,
    description: 'Test Product',
    packSize: 1,
    material: null,
    unitDimensionsCm: null,
    unitWeightKg: null,
    unitsPerCarton: 24,
    cartonDimensionsCm: null,
    cartonWeightKg: null,
    packagingType: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/skus', () => {
    it('should return list of SKUs for authenticated user', async () => {
      ;(prisma.sku.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.sku.findMany as jest.Mock).mockResolvedValue([
        mockSku,
        { ...mockSku, id: 'sku-456', skuCode: 'TEST-002' }
      ])

      const response = await callApiHandler(getSkus, '/api/skus')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('skus')
      expect(response.body.skus).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const response = await callApiHandler(getSkus, '/api/skus')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should filter SKUs by search query', async () => {
      ;(prisma.sku.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.sku.findMany as jest.Mock).mockResolvedValue([mockSku])

      const response = await callApiHandler(
        getSkus,
        '/api/skus',
        { searchParams: { search: 'widget' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.skus).toHaveLength(1)
    })

    it('should include inactive SKUs when requested', async () => {
      ;(prisma.sku.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.sku.findMany as jest.Mock).mockResolvedValue([
        mockSku,
        { ...mockSku, id: 'sku-789', isActive: false }
      ])

      const response = await callApiHandler(
        getSkus,
        '/api/skus',
        { searchParams: { includeInactive: 'true' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBe(2)
    })

    it('should handle pagination', async () => {
      ;(prisma.sku.count as jest.Mock).mockResolvedValue(15)
      ;(prisma.sku.findMany as jest.Mock).mockResolvedValue(
        Array(5).fill(mockSku).map((s, i) => ({ ...s, id: `sku-${i}` }))
      )

      const response = await callApiHandler(
        getSkus,
        '/api/skus',
        { searchParams: { page: '2', limit: '10' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.skus.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages')
    })
  })

  describe('POST /api/skus', () => {
    it('should create new SKU with valid data', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

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

      const createdSku = { ...mockSku, ...newSku, id: 'new-sku-id' }
      ;(prisma.sku.findUnique as jest.Mock).mockResolvedValue(null) // No duplicate
      ;(prisma.sku.create as jest.Mock).mockResolvedValue(createdSku)

      const response = await callApiHandler(
        createSku,
        '/api/skus',
        { method: 'POST', body: newSku }
      )

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toMatchObject({
        skuCode: newSku.skuCode,
        description: newSku.description,
        packSize: newSku.packSize
      })
    })

    it('should return 403 for non-admin users', async () => {
      const response = await callApiHandler(
        createSku,
        '/api/skus',
        {
          method: 'POST',
          body: {
            skuCode: 'FORBIDDEN-SKU',
            description: 'Should not be created',
            packSize: 1,
            unitsPerCarton: 1
          }
        }
      )

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })

    it('should validate required fields', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

      const response = await callApiHandler(
        createSku,
        '/api/skus',
        {
          method: 'POST',
          body: {
            // Missing required fields
            description: 'Incomplete SKU'
          }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate SKU codes', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

      ;(prisma.sku.findUnique as jest.Mock).mockResolvedValue(mockSku) // Duplicate exists

      const response = await callApiHandler(
        createSku,
        '/api/skus',
        {
          method: 'POST',
          body: {
            skuCode: 'DUPLICATE-001',
            description: 'Duplicate SKU',
            packSize: 1,
            unitsPerCarton: 1
          }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })
  })

  describe('GET /api/skus/:id', () => {
    it('should return SKU details by ID', async () => {
      ;(prisma.sku.findUnique as jest.Mock).mockResolvedValue(mockSku)

      const response = await callApiHandler(
        getSku,
        '/api/skus/sku-123',
        { searchParams: { id: 'sku-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: mockSku.id,
        skuCode: mockSku.skuCode,
        description: mockSku.description
      })
    })

    it('should return 404 for non-existent SKU', async () => {
      ;(prisma.sku.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await callApiHandler(
        getSku,
        '/api/skus/non-existent-id',
        { searchParams: { id: 'non-existent-id' } }
      )

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'SKU not found')
    })
  })

  describe('PUT /api/skus/:id', () => {
    it('should update SKU with valid data', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

      const updates = {
        description: 'Updated Description',
        packSize: 20,
      }

      const updatedSku = { ...mockSku, ...updates }
      ;(prisma.sku.update as jest.Mock).mockResolvedValue(updatedSku)

      const response = await callApiHandler(
        updateSku,
        '/api/skus/sku-123',
        {
          method: 'PUT',
          body: updates,
          searchParams: { id: 'sku-123' }
        }
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should validate update data', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

      const response = await callApiHandler(
        updateSku,
        '/api/skus/sku-123',
        {
          method: 'PUT',
          body: {
            packSize: -5 // Invalid negative value
          },
          searchParams: { id: 'sku-123' }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/skus/:id', () => {
    it('should soft delete SKU (set inactive)', async () => {
      const adminSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          warehouseId: undefined,
          isDemo: false
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      mockGetServerSession.mockResolvedValueOnce(adminSession)

      const updatedSku = { ...mockSku, isActive: false }
      ;(prisma.sku.update as jest.Mock).mockResolvedValue(updatedSku)

      const response = await callApiHandler(
        deleteSku,
        '/api/skus/sku-123',
        {
          method: 'DELETE',
          searchParams: { id: 'sku-123' }
        }
      )

      expect(response.status).toBe(200)
      expect(prisma.sku.update).toHaveBeenCalledWith({
        where: { id: 'sku-123' },
        data: { isActive: false }
      })
    })

    it('should return 403 for non-admin users', async () => {
      const response = await callApiHandler(
        deleteSku,
        '/api/skus/sku-123',
        {
          method: 'DELETE',
          searchParams: { id: 'sku-123' }
        }
      )

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/skus/:id/next-batch', () => {
    it('should return next available batch for SKU', async () => {
      const mockTransaction = {
        id: 'trans-123',
        batchLot: 'BATCH-001',
        currentCartons: 10,
        skuId: 'sku-123',
        warehouseId: 'warehouse-123',
        transactionDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue({
        batchLot: 'BATCH-001',
        currentCartons: 10
      })

      const response = await callApiHandler(
        getNextBatch,
        '/api/skus/sku-123/next-batch',
        { searchParams: { id: 'sku-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('batchLot', 'BATCH-001')
    })
  })
})