import { callApiHandler } from './setup/mock-api-handler'
import { GET as getBalances } from '@/app/api/inventory/balances/route'
import { GET as getTransactions } from '@/app/api/inventory/transactions/route'
import { POST as sendShipmentEmail } from '@/app/api/inventory/shipments/email/route'
import { GET as getIncomplete } from '@/app/api/inventory/incomplete/route'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { sendEmail } from '@/lib/email'

// Mock getServerSession is already set up in jest.setup.integration.js
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>

describe('Inventory API Endpoints', () => {
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

  const mockBalance = {
    id: 'balance-123',
    skuId: mockSku.id,
    warehouseId: mockWarehouse.id,
    batchLot: 'BATCH-001',
    currentCartons: 10,
    currentUnits: 240,
    currentPallets: 1,
    lastTransactionDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: mockSku,
    warehouse: mockWarehouse
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/inventory/balances', () => {
    it('should return inventory balances for authenticated user', async () => {
      // Mock Prisma responses
      ;(prisma.inventoryBalance.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([
        mockBalance,
        { ...mockBalance, id: 'balance-456', skuId: 'sku-456', currentCartons: 20, currentUnits: 480 }
      ])
      ;(prisma.inventoryTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const response = await callApiHandler(getBalances, '/api/inventory/balances')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('balances')
      expect(response.body.balances).toHaveLength(2)
      expect(response.body).toHaveProperty('total', 2)
    })

    it('should filter by warehouse', async () => {
      ;(prisma.inventoryBalance.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([mockBalance])
      ;(prisma.inventoryTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const response = await callApiHandler(
        getBalances,
        '/api/inventory/balances',
        { searchParams: { warehouseId: 'warehouse-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.balances).toHaveLength(1)
      expect(response.body.balances[0].warehouseId).toBe('warehouse-123')
    })

    it('should filter by SKU', async () => {
      ;(prisma.inventoryBalance.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([mockBalance])
      ;(prisma.inventoryTransaction.findFirst as jest.Mock).mockResolvedValue(null)

      const response = await callApiHandler(
        getBalances,
        '/api/inventory/balances',
        { searchParams: { skuId: 'sku-123' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.balances).toHaveLength(1)
      expect(response.body.balances[0].skuId).toBe('sku-123')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const response = await callApiHandler(getBalances, '/api/inventory/balances')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/inventory/transactions', () => {
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

    it('should return inventory transactions', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(2)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([
        mockTransaction,
        { ...mockTransaction, id: 'trans-456', transactionType: 'SHIP', cartonsIn: 0, cartonsOut: 5 }
      ])

      const response = await callApiHandler(getTransactions, '/api/inventory/transactions')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
    })

    it('should filter by date range', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction])

      const response = await callApiHandler(
        getTransactions,
        '/api/inventory/transactions',
        { searchParams: { startDate: '2024-01-15', endDate: '2024-02-15' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
    })

    it('should filter by transaction type', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction])

      const response = await callApiHandler(
        getTransactions,
        '/api/inventory/transactions',
        { searchParams: { type: 'RECEIVE' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions).toHaveLength(1)
      expect(response.body.transactions[0].transactionType).toBe('RECEIVE')
    })

    it('should paginate results', async () => {
      ;(prisma.inventoryTransaction.count as jest.Mock).mockResolvedValue(15)
      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(
        Array(5).fill(mockTransaction).map((t, i) => ({ ...t, id: `trans-${i}` }))
      )

      const response = await callApiHandler(
        getTransactions,
        '/api/inventory/transactions',
        { searchParams: { page: '2', limit: '10' } }
      )

      expect(response.status).toBe(200)
      expect(response.body.transactions.length).toBeLessThanOrEqual(5)
      expect(response.body).toHaveProperty('page', 2)
      expect(response.body).toHaveProperty('totalPages', 2)
    })
  })

  describe('POST /api/inventory/shipments/email', () => {
    it('should send shipment email notification', async () => {
      mockSendEmail.mockResolvedValue({ success: true })

      const emailData = {
        to: 'customer@example.com',
        shipmentId: 'SHIP-001',
        trackingNumber: '1234567890',
        items: [
          { sku: 'TEST-001', description: 'Test Product', cartonsIn: 10 }
        ]
      }

      const response = await callApiHandler(
        sendShipmentEmail,
        '/api/inventory/shipments/email',
        { method: 'POST', body: emailData }
      )

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Email sent successfully')
      expect(mockSendEmail).toHaveBeenCalled()
    })

    it('should validate email data', async () => {
      const response = await callApiHandler(
        sendShipmentEmail,
        '/api/inventory/shipments/email',
        {
          method: 'POST',
          body: {
            // Missing required fields
            shipmentId: 'SHIP-001'
          }
        }
      )

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/inventory/incomplete', () => {
    it('should return incomplete transactions', async () => {
      const incompleteTransaction = {
        ...mockTransaction,
        isReconciled: false
      }

      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([
        incompleteTransaction,
        { ...incompleteTransaction, id: 'trans-789' }
      ])

      const response = await callApiHandler(getIncomplete, '/api/inventory/incomplete')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('transactions')
      expect(response.body.transactions).toHaveLength(2)
      expect(response.body.transactions.every((t: any) => !t.isReconciled)).toBe(true)
    })

    it('should include transaction details', async () => {
      const detailedTransaction = {
        ...mockTransaction,
        isReconciled: false,
        referenceId: 'INC-REF-001',
        sku: { ...mockSku, skuCode: 'INCOMPLETE-001' },
        warehouse: { ...mockWarehouse, name: 'Incomplete Warehouse' }
      }

      ;(prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([detailedTransaction])

      const response = await callApiHandler(getIncomplete, '/api/inventory/incomplete')

      expect(response.status).toBe(200)
      expect(response.body.transactions[0]).toHaveProperty('sku')
      expect(response.body.transactions[0]).toHaveProperty('warehouse')
      expect(response.body.transactions[0].referenceId).toBe('INC-REF-001')
    })
  })
})