import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, createTestUser, createTestSession } from './setup/test-db'
import { createTestSku, createTestWarehouse, createTestTransaction, createTestInventoryBalance } from './setup/fixtures'
import * as fs from 'fs'
import * as path from 'path'

describe('Import/Export API Endpoints', () => {
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

  describe('GET /api/import/template', () => {
    it('should return SKU import template', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/import/template?type=sku')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('sku-import-template.csv')
      expect(response.text).toContain('skuCode')
      expect(response.text).toContain('description')
      expect(response.text).toContain('packSize')
    })

    it('should return transaction import template', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/import/template?type=transaction')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('transaction-import-template.csv')
      expect(response.text).toContain('transactionType')
      expect(response.text).toContain('quantity')
      expect(response.text).toContain('referenceNumber')
    })

    it('should return 400 for invalid template type', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/import/template?type=invalid')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid template type'))
    })

    it('should return 401 for unauthenticated request', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/import/template?type=sku')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('POST /api/import', () => {
    it('should import SKUs from CSV file', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const csvContent = `skuCode,asin,description,packSize,material,unitDimensionsCm,unitWeightKg,unitsPerCarton,cartonDimensionsCm,cartonWeightKg,packagingType,notes
IMPORT-001,B0IMPORT01,Imported Product 1,5,Plastic,10x10x10,0.5,24,40x40x40,12.5,Box,Test import 1
IMPORT-002,B0IMPORT02,Imported Product 2,10,Metal,15x15x15,1.0,12,50x50x50,13.0,Carton,Test import 2`

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', Buffer.from(csvContent), 'skus.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('imported', 2)
      expect(response.body).toHaveProperty('errors', [])

      // Verify SKUs were created
      const importedSkus = await prisma.sKU.findMany({
        where: { skuCode: { in: ['IMPORT-001', 'IMPORT-002'] } }
      })
      expect(importedSkus).toHaveLength(2)
    })

    it('should import transactions from CSV file', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'TX-IMPORT-001' })
      const warehouse = await createTestWarehouse(prisma, { warehouseId: 'WH-IMPORT-001' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const csvContent = `transactionType,transactionSubtype,skuCode,warehouseId,quantity,referenceNumber,amazonShipmentId,transactionDate,notes
RECEIVE,STANDARD,TX-IMPORT-001,WH-IMPORT-001,100,IMP-REF-001,FBA-IMP-001,2024-01-15,Import test 1
SHIP,STANDARD,TX-IMPORT-001,WH-IMPORT-001,-50,IMP-REF-002,FBA-IMP-002,2024-01-20,Import test 2`

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'transaction')
        .attach('file', Buffer.from(csvContent), 'transactions.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('imported', 2)

      // Verify transactions were created
      const importedTransactions = await prisma.transaction.findMany({
        where: { referenceNumber: { in: ['IMP-REF-001', 'IMP-REF-002'] } }
      })
      expect(importedTransactions).toHaveLength(2)
    })

    it('should handle import errors gracefully', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const csvContent = `skuCode,description,packSize
INVALID-001,,10
INVALID-002,Valid Description,-5
VALID-001,Valid Description,10`

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', Buffer.from(csvContent), 'skus.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('imported', 1)
      expect(response.body).toHaveProperty('errors')
      expect(response.body.errors).toHaveLength(2)
      expect(response.body.errors[0]).toHaveProperty('row', 2)
      expect(response.body.errors[1]).toHaveProperty('row', 3)
    })

    it('should validate file size', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      // Create a large buffer (over 10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024)

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', largeBuffer, 'large.csv')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('File size'))
    })

    it('should return 403 for non-admin users', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', Buffer.from('test'), 'test.csv')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })

  describe('GET /api/export', () => {
    it('should export data based on type', async () => {
      await createTestSku(prisma, { skuCode: 'EXPORT-SKU-001' })
      await createTestSku(prisma, { skuCode: 'EXPORT-SKU-002' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export?type=sku')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('sku-export')
      expect(response.text).toContain('EXPORT-SKU-001')
      expect(response.text).toContain('EXPORT-SKU-002')
    })

    it('should export with filters', async () => {
      const warehouse1 = await createTestWarehouse(prisma, { warehouseId: 'WH-EXP-001' })
      const warehouse2 = await createTestWarehouse(prisma, { warehouseId: 'WH-EXP-002' })
      const sku = await createTestSku(prisma)

      await createTestTransaction(prisma, sku.id, warehouse1.id, { referenceNumber: 'EXP-001' })
      await createTestTransaction(prisma, sku.id, warehouse2.id, { referenceNumber: 'EXP-002' })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/export?type=transaction&warehouseId=${warehouse1.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.text).toContain('EXP-001')
      expect(response.text).not.toContain('EXP-002')
    })

    it('should return 401 for unauthenticated request', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export?type=sku')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('GET /api/export/inventory', () => {
    it('should export current inventory balances', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'INV-EXP-001' })
      const sku2 = await createTestSku(prisma, { skuCode: 'INV-EXP-002' })
      const warehouse = await createTestWarehouse(prisma, { name: 'Export Warehouse' })

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { availableQuantity: 100 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { availableQuantity: 200 })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('inventory-export')
      expect(response.text).toContain('INV-EXP-001')
      expect(response.text).toContain('INV-EXP-002')
      expect(response.text).toContain('100')
      expect(response.text).toContain('200')
    })

    it('should filter by warehouse', async () => {
      const sku = await createTestSku(prisma)
      const warehouse1 = await createTestWarehouse(prisma, { warehouseId: 'WH-INV-001' })
      const warehouse2 = await createTestWarehouse(prisma, { warehouseId: 'WH-INV-002' })

      await createTestInventoryBalance(prisma, sku.id, warehouse1.id)
      await createTestInventoryBalance(prisma, sku.id, warehouse2.id)

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get(`/api/export/inventory?warehouseId=${warehouse1.id}`)
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.text).toContain('WH-INV-001')
      expect(response.text).not.toContain('WH-INV-002')
    })
  })

  describe('GET /api/export/ledger', () => {
    it('should export transaction ledger', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'LEDGER-001' })
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'RECEIVE',
        quantity: 100,
        referenceNumber: 'LED-001',
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        transactionType: 'SHIP',
        quantity: -30,
        referenceNumber: 'LED-002',
        transactionDate: new Date('2024-01-15')
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export/ledger')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.text).toContain('LEDGER-001')
      expect(response.text).toContain('LED-001')
      expect(response.text).toContain('LED-002')
      expect(response.text).toContain('100')
      expect(response.text).toContain('-30')
    })

    it('should filter by date range', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, {
        referenceNumber: 'JAN-001',
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        referenceNumber: 'FEB-001',
        transactionDate: new Date('2024-02-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        referenceNumber: 'MAR-001',
        transactionDate: new Date('2024-03-01')
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export/ledger?startDate=2024-01-15&endDate=2024-02-15')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.text).not.toContain('JAN-001')
      expect(response.text).toContain('FEB-001')
      expect(response.text).not.toContain('MAR-001')
    })
  })

  describe('GET /api/export/missing-attributes', () => {
    it('should export transactions with missing attributes', async () => {
      const sku = await createTestSku(prisma)
      const warehouse = await createTestWarehouse(prisma)

      // Transaction with all attributes
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        referenceNumber: 'COMPLETE-001',
        amazonShipmentId: 'FBA123',
        notes: 'Complete transaction'
      })

      // Transaction with missing attributes
      await createTestTransaction(prisma, sku.id, warehouse.id, {
        referenceNumber: 'INCOMPLETE-001',
        amazonShipmentId: null,
        notes: null
      })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/export/missing-attributes')
        .set('Cookie', 'next-auth.session-token=test-token')

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.text).toContain('INCOMPLETE-001')
      expect(response.text).not.toContain('COMPLETE-001')
    })
  })

  describe('POST /api/upload/inventory', () => {
    it('should upload inventory adjustment file', async () => {
      const sku1 = await createTestSku(prisma, { skuCode: 'ADJ-001' })
      const sku2 = await createTestSku(prisma, { skuCode: 'ADJ-002' })
      const warehouse = await createTestWarehouse(prisma, { warehouseId: 'WH-ADJ-001' })

      // Create existing balances
      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { availableQuantity: 100 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { availableQuantity: 200 })

      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const csvContent = `skuCode,warehouseId,newQuantity,reason
ADJ-001,WH-ADJ-001,150,Physical count adjustment
ADJ-002,WH-ADJ-001,180,Damaged goods write-off`

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/upload/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from(csvContent), 'inventory-adjustment.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('adjustments', 2)

      // Verify adjustments were created
      const adjustments = await prisma.transaction.findMany({
        where: { 
          transactionType: 'ADJUST',
          skuId: { in: [sku1.id, sku2.id] }
        }
      })
      expect(adjustments).toHaveLength(2)
    })

    it('should validate adjustment data', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(adminSession)
      }))

      const csvContent = `skuCode,warehouseId,newQuantity,reason
INVALID-SKU,WH-001,100,Invalid SKU
ADJ-001,INVALID-WH,100,Invalid warehouse`

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/upload/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from(csvContent), 'invalid-adjustments.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('errors')
      expect(response.body.errors).toHaveLength(2)
    })

    it('should return 403 for non-admin users', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(userSession)
      }))

      const response = await request(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/upload/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from('test'), 'test.csv')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })
})