import { callApiHandler } from './setup/mock-api-handler'
import { GET as getTransactions, POST as createTransaction } from '@/app/api/transactions/route'
import { GET as getTransaction, PUT as updateTransaction, DELETE as deleteTransaction } from '@/app/api/transactions/[id]/route'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// Mock getServerSession is already set up in jest.setup.integration.js
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Transaction API Endpoints', () => {
  const mockSku = {
    id: 'sku-123',
    skuCode: 'TEST-001',
    description: 'Test Product',
    unitsPerCarton: 24,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockWarehouse = {
    id: 'warehouse-123',
    code: 'WH-001',
    name: 'Test Warehouse',
    type: 'STANDARD' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockTransaction = {
    id: 'trans-123',
    skuId: mockSku.id,
    warehouseId: mockWarehouse.id,
    transactionType: 'RECEIVE',
    transactionDate: new Date(),
    referenceId: 'REF-001',
    batchLot: 'BATCH-001',
    cartonsIn: 10,
    cartonsOut: 0,
    unitsIn: 240,
    unitsOut: 0,
    isReconciled: false,
    createdById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: mockSku,
    warehouse: mockWarehouse
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/transactions', () => {
    it('should return list of transactions for authenticated user', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([
        mockTransaction,
        { ...mockTransaction, id: 'trans-456', transactionType: 'SHIP', cartonsIn: 0, cartonsOut: 5 }
      ])

      const response = await callApiHandler(getTransactions, '/api/transactions')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const response = await callApiHandler(getTransactions, '/api/transactions')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should filter by transaction type', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction])

      const response = await callApiHandler(
        getTransactions,
        '/api/transactions',
        { searchParams: { type: 'RECEIVE' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].transactionType).toBe('RECEIVE')
    })

    it('should filter by date range', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([
        { ...mockTransaction, transactionDate: new Date('2024-02-01') }
      ])

      const response = await callApiHandler(
        getTransactions,
        '/api/transactions',
        { searchParams: { startDate: '2024-01-15', endDate: '2024-02-15' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
    })

    it('should filter by SKU', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction])

      const response = await callApiHandler(
        getTransactions,
        '/api/transactions',
        { searchParams: { skuId: 'sku-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].skuId).toBe('sku-123')
    })

    it('should handle pagination', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(25)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(
        Array(10).fill(mockTransaction).map((t, i) => ({ ...t, id: `trans-${i}` }))
      )

      const response = await callApiHandler(
        getTransactions,
        '/api/transactions',
        { searchParams: { page: '2', limit: '10' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages', 3)
    })
  })

  describe('POST /api/transactions', () => {
    it('should create new transaction with valid data', async () => {
      const newTransaction = {
        skuId: 'sku-123',
        warehouseId: 'warehouse-123',
        transactionType: 'RECEIVE',
        transactionDate: new Date().toISOString(),
        referenceId: 'NEW-REF-001',
        batchLot: 'NEW-BATCH-001',
        cartonsIn: 20,
        notes: 'New shipment received'
      }

      const createdTransaction = { ...mockTransaction, ...newTransaction, id: 'new-trans-id' }
      ;(prisma.inventoryTransaction.create as jest.Mock).mockResolvedValue(createdTransaction)
      ;(prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.inventoryBalance.create as jest.Mock).mockResolvedValue({})
      ;(prisma.inventoryBalance.update as jest.Mock).mockResolvedValue({})

      const response = await callApiHandler(
        createTransaction,
        '/api/transactions',
        { method: 'POST', body: newTransaction }
      )

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.referenceId).toBe('NEW-REF-001')
    })

    it('should validate required fields', async () => {
      const response = await callApiHandler(
        createTransaction,
        '/api/transactions',
        {
          method: 'POST',
          body: {
            // Missing required fields
            skuId: 'sku-123'
          }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should prevent duplicate reference IDs', async () => {
      ;(prisma.inventoryTransaction.findFirst as jest.Mock).mockResolvedValue(mockTransaction)

      const response = await callApiHandler(
        createTransaction,
        '/api/transactions',
        {
          method: 'POST',
          body: {
            skuId: 'sku-123',
            warehouseId: 'warehouse-123',
            transactionType: 'RECEIVE',
            transactionDate: new Date().toISOString(),
            referenceId: 'REF-001', // Duplicate
            batchLot: 'BATCH-002',
            cartonsIn: 10
          }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('already exists'))
    })
  })

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details by ID', async () => {
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)

      const response = await callApiHandler(
        getTransaction,
        '/api/transactions/trans-123',
        { searchParams: { id: 'trans-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: mockTransaction.id,
        referenceId: mockTransaction.referenceId,
        transactionType: mockTransaction.transactionType
      })
    })

    it('should return 404 for non-existent transaction', async () => {
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await callApiHandler(
        getTransaction,
        '/api/transactions/non-existent-id',
        { searchParams: { id: 'non-existent-id' } }
      )

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Transaction not found')
    })
  })

  describe('PUT /api/transactions/:id', () => {
    it('should update transaction with valid data', async () => {
      const updates = {
        notes: 'Updated notes',
        isReconciled: true
      }

      const updatedTransaction = { ...mockTransaction, ...updates }
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue(updatedTransaction)

      const response = await callApiHandler(
        updateTransaction,
        '/api/transactions/trans-123',
        {
          method: 'PUT',
          body: updates,
          searchParams: { id: 'trans-123' }
        }
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updates)
    })

    it('should not allow updating reconciled transactions', async () => {
      const reconciledTransaction = { ...mockTransaction, isReconciled: true }
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(reconciledTransaction)

      const response = await callApiHandler(
        updateTransaction,
        '/api/transactions/trans-123',
        {
          method: 'PUT',
          body: { notes: 'Trying to update' },
          searchParams: { id: 'trans-123' }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('reconciled'))
    })
  })

  describe('DELETE /api/transactions/:id', () => {
    it('should delete transaction', async () => {
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.inventoryTransaction.delete as jest.Mock).mockResolvedValue(mockTransaction)
      ;(prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue({
        id: 'balance-123',
        currentCartons: 10
      })
      ;(prisma.inventoryBalance.update as jest.Mock).mockResolvedValue({})

      const response = await callApiHandler(
        deleteTransaction,
        '/api/transactions/trans-123',
        {
          method: 'DELETE',
          searchParams: { id: 'trans-123' }
        }
      )

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Transaction deleted successfully')
    })

    it('should not allow deleting reconciled transactions', async () => {
      const reconciledTransaction = { ...mockTransaction, isReconciled: true }
      ;(prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(reconciledTransaction)

      const response = await callApiHandler(
        deleteTransaction,
        '/api/transactions/trans-123',
        {
          method: 'DELETE',
          searchParams: { id: 'trans-123' }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('reconciled'))
    })
  })
})