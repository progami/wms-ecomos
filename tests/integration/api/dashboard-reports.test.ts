import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { 
  createTestSku, 
  createTestWarehouse, 
  createTestTransaction, 
  createTestInventoryBalance,
  createTestInvoice 
} from './setup/fixtures'

// Mock next-auth at module level
const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

describe('Dashboard and Reports API Endpoints', () => {
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

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics for authenticated user', async () => {
      // Create test data
      const sku1 = await createTestSku(prisma)
      const sku2 = await createTestSku(prisma)
      const warehouse1 = await createTestWarehouse(prisma)
      const warehouse2 = await createTestWarehouse(prisma)

      // Create inventory balances
      await createTestInventoryBalance(prisma, sku1.id, warehouse1.id, { 
        availableQuantity: 100,
        totalQuantity: 100 
      })
      await createTestInventoryBalance(prisma, sku2.id, warehouse1.id, { 
        availableQuantity: 200,
        totalQuantity: 200 
      })
      await createTestInventoryBalance(prisma, sku1.id, warehouse2.id, { 
        availableQuantity: 150,
        totalQuantity: 150 
      })

      // Create recent transactions
      await createTestTransaction(prisma, sku1.id, warehouse1.id, {
        transactionType: 'RECEIVE',
        quantity: 50,
        transactionDate: new Date()
      })
      await createTestTransaction(prisma, sku2.id, warehouse1.id, {
        transactionType: 'SHIP',
        quantity: -30,
        transactionDate: new Date()
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/dashboard/stats')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalSkus', 2)
      expect(response.body).toHaveProperty('totalWarehouses', 2)
      expect(response.body).toHaveProperty('totalInventory', 450)
      expect(response.body).toHaveProperty('recentTransactions')
      expect(response.body.recentTransactions).toHaveLength(2)
      expect(response.body).toHaveProperty('inventoryByWarehouse')
      expect(response.body).toHaveProperty('transactionSummary')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/dashboard/stats')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should include financial summary when requested', async () => {
      const warehouse = await createTestWarehouse(prisma)
      await createTestInvoice(prisma, warehouse.id, { 
        status: 'PENDING',
        totalAmount: 1000 
      })
      await createTestInvoice(prisma, warehouse.id, { 
        status: 'PAID',
        totalAmount: 2000 
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/dashboard/stats?includeFinancial=true')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('financialSummary')
      expect(response.body.financialSummary).toHaveProperty('totalPending', 1000)
      expect(response.body.financialSummary).toHaveProperty('totalPaid', 2000)
    })

    it('should filter by date range', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Create transactions in different months
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-02-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionDate: new Date('2024-03-01')
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/dashboard/stats?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('recentTransactions')
      expect(response.body.recentTransactions).toHaveLength(1)
    })
  })

  describe('GET /api/reports', () => {
    it('should generate inventory summary report', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'REPORT-001', description: 'Report Product 1' })
      const sku2 = await createTestSku(prisma, { skuCode: 'REPORT-002', description: 'Report Product 2' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Report Warehouse' })

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { 
        availableQuantity: 100,
        totalQuantity: 120 
      })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { 
        availableQuantity: 200,
        totalQuantity: 200 
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=inventory-summary')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'inventory-summary')
      expect(response.body).toHaveProperty('generatedAt')
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('summary')
      expect(response.body.data.summary).toHaveProperty('totalSkus', 2)
      expect(response.body.data.summary).toHaveProperty('totalQuantity', 320)
      expect(response.body.data.summary).toHaveProperty('totalAvailable', 300)
      expect(response.body.data).toHaveProperty('details')
      expect(response.body.data.details).toHaveLength(2)
    })

    it('should generate transaction history report', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'TX-REPORT-001' })
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 100,
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -30,
        transactionDate: new Date('2024-01-15')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'ADJUST',
        quantity: -5,
        transactionDate: new Date('2024-01-20')
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=transaction-history&startDate=2024-01-01&endDate=2024-01-31')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'transaction-history')
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('transactions')
      expect(response.body.data.transactions).toHaveLength(3)
      expect(response.body.data).toHaveProperty('summary')
      expect(response.body.data.summary).toHaveProperty('totalReceived', 100)
      expect(response.body.data.summary).toHaveProperty('totalShipped', 30)
      expect(response.body.data.summary).toHaveProperty('totalAdjusted', 5)
    })

    it('should generate financial summary report', async () => {
      const warehouse = await createTestWarehouse(prisma)
      
      await createTestInvoice(prisma, warehouse.id, { 
        status: 'PENDING',
        totalAmount: 1000,
        invoiceDate: new Date('2024-01-15')
      })
      await createTestInvoice(prisma, warehouse.id, { 
        status: 'PAID',
        totalAmount: 2000,
        invoiceDate: new Date('2024-01-20')
      })
      await createTestInvoice(prisma, warehouse.id, { 
        status: 'DISPUTED',
        totalAmount: 500,
        invoiceDate: new Date('2024-01-25')
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=financial-summary&startDate=2024-01-01&endDate=2024-01-31')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'financial-summary')
      expect(response.body.data).toHaveProperty('totalInvoiced', 3500)
      expect(response.body.data).toHaveProperty('totalPaid', 2000)
      expect(response.body.data).toHaveProperty('totalPending', 1000)
      expect(response.body.data).toHaveProperty('totalDisputed', 500)
      expect(response.body.data).toHaveProperty('invoicesByStatus')
    })

    it('should generate SKU performance report', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'PERF-001' })
      const sku2 = await createTestSku(prisma, { skuCode: 'PERF-002' })
      const warehouse = await createTestWarehouse(prisma)

      // Create transactions for SKU performance
      await createTestTransaction(prisma, sku1.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 1000,
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku1.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -800,
        transactionDate: new Date('2024-01-15')
      })
      
      await createTestTransaction(prisma, sku2.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 500,
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku2.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -100,
        transactionDate: new Date('2024-01-20')
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=sku-performance&startDate=2024-01-01&endDate=2024-01-31')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'sku-performance')
      expect(response.body.data).toHaveProperty('skuMetrics')
      expect(response.body.data.skuMetrics).toHaveLength(2)
      
      const perf001 = response.body.data.skuMetrics.find((m: any) => m.skuCode === 'PERF-001')
      expect(perf001).toHaveProperty('turnoverRate')
      expect(perf001).toHaveProperty('totalReceived', 1000)
      expect(perf001).toHaveProperty('totalShipped', 800)
    })

    it('should generate warehouse utilization report', async () => {
      const warehouse1 = await createTestWarehouse(prisma, { 
        warehouseId: 'WH-UTIL-001',
        name: 'Utilization Warehouse 1' 
      })
      const warehouse2 = await createTestWarehouse(prisma, { 
        warehouseId: 'WH-UTIL-002',
        name: 'Utilization Warehouse 2' 
      })
      const sku = await createTestSku(prisma)

      await createTestInventoryBalance(prisma, sku.id, warehouse1.id, { 
        totalQuantity: 1000 
      })
      await createTestInventoryBalance(prisma, sku.id, warehouse2.id, { 
        totalQuantity: 500 
      })

      // Create transactions
      await createTestTransaction(prisma, sku.id, warehouse1.id, {
        transactionType: 'RECEIVE',
        quantity: 100,
        transactionDate: new Date()
      })
      await createTestTransaction(prisma, sku.id, warehouse2.id, {
        transactionType: 'SHIP',
        quantity: -50,
        transactionDate: new Date()
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=warehouse-utilization')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'warehouse-utilization')
      expect(response.body.data).toHaveProperty('warehouses')
      expect(response.body.data.warehouses).toHaveLength(2)
      
      const wh1 = response.body.data.warehouses.find((w: any) => w.warehouseId === 'WH-UTIL-001')
      expect(wh1).toHaveProperty('totalInventory', 1000)
      expect(wh1).toHaveProperty('transactionCount')
    })

    it('should validate report type', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=invalid-report')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid report type'))
    })

    it('should require date range for certain reports', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=transaction-history')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Date range required'))
    })

    it('should export report as CSV when requested', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'CSV-001' })
      const warehouse = await createTestWarehouse(prisma)
      await createTestInventoryBalance(prisma, sku.id, warehouse.id, { 
        availableQuantity: 100 
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=inventory-summary&format=csv')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('inventory-summary-report')
      expect(response.text).toContain('CSV-001')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/reports?type=inventory-summary')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/admin/dashboard', () => {
    it('should return admin dashboard data for admin users', async () => {
      // Create test users
      await createTestUser(prisma, 'USER')
      await createTestUser(prisma, 'USER')
      await createTestUser(prisma, 'VIEWER')

      // Create audit logs
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'SKU',
          entityId: 'test-sku-id',
          timestamp: new Date()
        }
      })

      mockGetServerSession.mockResolvedValue(adminSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/dashboard')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('userStats')
      expect(response.body.userStats).toHaveProperty('totalUsers')
      expect(response.body.userStats).toHaveProperty('activeUsers')
      expect(response.body.userStats).toHaveProperty('usersByRole')
      expect(response.body).toHaveProperty('systemHealth')
      expect(response.body).toHaveProperty('recentActivity')
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/admin/dashboard')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/finance/reports', () => {
    it('should generate cost analysis report', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'COST-001' })
      const warehouse = await createTestWarehouse(prisma)

      // Create cost ledger entries
      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'STORAGE',
          amount: 100.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })
      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'HANDLING',
          amount: 50.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/reports?type=cost-analysis&period=2024-01')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'cost-analysis')
      expect(response.body.data).toHaveProperty('totalCosts', 150.00)
      expect(response.body.data).toHaveProperty('costsByType')
      expect(response.body.data.costsByType).toHaveProperty('STORAGE', 100.00)
      expect(response.body.data.costsByType).toHaveProperty('HANDLING', 50.00)
    })

    it('should generate profitability report', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'PROFIT-001' })
      const warehouse = await createTestWarehouse(prisma)

      // Create revenue data (from invoices)
      const invoice = await createTestInvoice(prisma, warehouse.id, {
        status: 'PAID',
        totalAmount: 500.00,
        invoiceDate: new Date('2024-01-15')
      })

      // Create cost data
      await prisma.costLedger.create({
        data: {
          skuId: sku.id,
          warehouseId: warehouse.id,
          costType: 'TOTAL',
          amount: 300.00,
          currency: 'USD',
          period: new Date('2024-01-01'),
          calculatedAt: new Date()
        }
      })

      mockGetServerSession.mockResolvedValue(userSession)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/finance/reports?type=profitability&period=2024-01')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('reportType', 'profitability')
      expect(response.body.data).toHaveProperty('revenue', 500.00)
      expect(response.body.data).toHaveProperty('costs', 300.00)
      expect(response.body.data).toHaveProperty('profit', 200.00)
      expect(response.body.data).toHaveProperty('margin', 40)
    })
  })
})