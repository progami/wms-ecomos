import { POST, GET } from '@/app/api/inventory/transactions/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inventoryTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryBalance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      inventoryTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      inventoryBalance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    })),
  },
}))

describe('Inventory API', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('POST /api/inventory/transactions', () => {
    it('should create a new inventory transaction', async () => {
      const { prisma } = require('@/lib/prisma')
      
      const mockTransaction = {
        id: 'trans-123',
        transactionId: 'TRX-001',
        transactionType: 'RECEIVE',
        cartonsIn: 100,
        cartonsOut: 0,
        createdAt: new Date(),
      }

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          inventoryTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
          inventoryBalance: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'bal-123',
              currentCartons: 100,
              currentUnits: 1000,
            }),
          },
        }
        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/inventory/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionType: 'RECEIVE',
          warehouseId: 'warehouse-123',
          skuId: 'sku-123',
          batchLot: 'BATCH001',
          cartonsIn: 100,
          cartonsOut: 0,
          storageCartonsPerPallet: 40,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.transaction).toBeDefined()
    })

    it('should prevent negative inventory', async () => {
      const { prisma } = require('@/lib/prisma')
      
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          inventoryBalance: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'bal-123',
              currentCartons: 50,
              currentUnits: 500,
            }),
          },
        }
        return callback(tx)
      })

      const request = new NextRequest('http://localhost:3000/api/inventory/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionType: 'SHIP',
          warehouseId: 'warehouse-123',
          skuId: 'sku-123',
          batchLot: 'BATCH001',
          cartonsIn: 0,
          cartonsOut: 100, // More than available
          shippingCartonsPerPallet: 40,
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Insufficient inventory')
    })

    it('should handle concurrent transactions safely', async () => {
      const { prisma } = require('@/lib/prisma')
      
      // Simulate multiple concurrent requests
      const requests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/inventory/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionType: 'SHIP',
            warehouseId: 'warehouse-123',
            skuId: 'sku-123',
            batchLot: 'BATCH001',
            cartonsIn: 0,
            cartonsOut: 20,
            shippingCartonsPerPallet: 40,
          }),
        })
      )

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          inventoryBalance: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'bal-123',
              currentCartons: 100,
              currentUnits: 1000,
            }),
            update: jest.fn().mockResolvedValue({
              currentCartons: 80,
              currentUnits: 800,
            }),
          },
          inventoryTransaction: {
            create: jest.fn().mockResolvedValue({
              id: 'trans-123',
              transactionId: 'TRX-001',
            }),
          },
        }
        return callback(tx)
      })

      // Process requests concurrently
      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // All should succeed due to transaction isolation
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('GET /api/inventory/transactions', () => {
    it('should return paginated transactions', async () => {
      const { prisma } = require('@/lib/prisma')
      
      prisma.inventoryTransaction.findMany.mockResolvedValue([
        {
          id: 'trans-1',
          transactionId: 'TRX-001',
          transactionType: 'RECEIVE',
          cartonsIn: 100,
          cartonsOut: 0,
        },
        {
          id: 'trans-2',
          transactionId: 'TRX-002',
          transactionType: 'SHIP',
          cartonsIn: 0,
          cartonsOut: 50,
        },
      ])
      
      prisma.inventoryTransaction.count.mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/inventory/transactions?page=1&limit=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.page).toBe(1)
    })

    it('should filter transactions by date range', async () => {
      const { prisma } = require('@/lib/prisma')
      
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      
      const request = new NextRequest(
        `http://localhost:3000/api/inventory/transactions?startDate=${startDate}&endDate=${endDate}`
      )

      await GET(request)

      expect(prisma.inventoryTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            transactionDate: {
              gte: new Date(startDate),
              lte: expect.any(Date),
            },
          }),
        })
      )
    })
  })
})