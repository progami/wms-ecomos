import { PrismaClient } from '@prisma/client'

import { setupTestDatabase, teardownTestDatabase, createTestUser } from './setup/test-db'
import { createAuthenticatedRequest } from './setup/authenticated-request'
import { createTestSku, createTestWarehouse, createTestTransaction, createTestInventoryBalance } from './setup/fixtures'
import * as fs from 'fs'
import * as path from 'path'




// No need to setup test auth - it's handled by authenticated request
describe('Import/Export API Endpoints', () => {
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

  

  describe('GET /api/import/template', () => {
    it('should return SKU import template', async () => {
      const response = await request
        .get('/api/import/template?type=sku')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('sku-import-template.csv')
      expect(response.text).toContain('skuCode')
      expect(response.text).toContain('description')
      expect(response.text).toContain('packSize')
    })

    it('should return transaction import template', async () => {
      const response = await request
        .get('/api/import/template?type=transaction')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('transaction-import-template.csv')
      expect(response.text).toContain('transactionType')
      expect(response.text).toContain('quantity')
      expect(response.text).toContain('referenceId')
    })

    it('should return 400 for invalid template type', async () => {
      const response = await request
        .get('/api/import/template?type=invalid')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid template type'))
    })

    it('should return 401 for unauthenticated request', async () => {

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .get('/api/import/template?type=sku')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })
  })

  describe('POST /api/import', () => {
    it('should import SKUs from CSV file', async () => {
      // No need for mockGetServerSession with test auth setup

      const csvContent = `skuCode,asin,description,packSize,material,unitDimensionsCm,unitWeightKg,unitsPerCarton,cartonDimensionsCm,cartonWeightKg,packagingType,notes
IMPORT-001,B0IMPORT01,Imported Product 1,5,Plastic,10x10x10,0.5,24,40x40x40,12.5,Box,Test import 1
IMPORT-002,B0IMPORT02,Imported Product 2,10,Metal,15x15x15,1.0,12,50x50x50,13.0,Carton,Test import 2`

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', Buffer.from(csvContent), 'skus.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('imported', 2)
      expect(response.body).toHaveProperty('errors', [])

      // Verify SKUs were created
      const importedSkus = await prisma.sku.findMany({
        where: { skuCode: { in: ['IMPORT-001', 'IMPORT-002'] } }
      })
      expect(importedSkus).toHaveLength(2)
    })

    it('should import transactions from CSV file', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'TX-IMPORT-001' })
      const warehouse = await createTestWarehouse(prisma, { code: 'WH-IMPORT-001' })

      // No need for mockGetServerSession with test auth setup

      const csvContent = `transactionType,transactionSubtype,skuCode,warehouseId,quantity,referenceId,amazonShipmentId,transactionDate,notes
RECEIVE,STANDARD,TX-IMPORT-001,WH-IMPORT-001,100,IMP-REF-001,FBA-IMP-001,2024-01-15,Import test 1
SHIP,STANDARD,TX-IMPORT-001,WH-IMPORT-001,-50,IMP-REF-002,FBA-IMP-002,2024-01-20,Import test 2`

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'transaction')
        .attach('file', Buffer.from(csvContent), 'transactions.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('imported', 2)

      // Verify transactions were created
      const importedTransactions = await prisma.inventoryTransaction.findMany({
        where: { referenceId: { in: ['IMP-REF-001', 'IMP-REF-002'] } }
      })
      expect(importedTransactions).toHaveLength(2)
    })

    it('should handle import errors gracefully', async () => {
      // No need for mockGetServerSession with test auth setup

      const csvContent = `skuCode,description,packSize
INVALID-001,,10
INVALID-002,Valid Description,-5
VALID-001,Valid Description,10`

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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
      // No need for mockGetServerSession with test auth setup

      // Create a large buffer (over 10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024)

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/import')
        .set('Cookie', 'next-auth.session-token=test-token')
        .field('type', 'sku')
        .attach('file', largeBuffer, 'large.csv')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', expect.stringContaining('File size'))
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/import')
        .withAuth('staff', regularUser.id)
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

      const response = await request
        .get('/api/export?type=sku')
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toContain('sku-export')
      expect(response.text).toContain('EXPORT-SKU-001')
      expect(response.text).toContain('EXPORT-SKU-002')
    })

    it('should export with filters', async () => {
      const warehouse1 = await createTestWarehouse(prisma, { code: 'WH-EXP-001' })
      const warehouse2 = await createTestWarehouse(prisma, { code: 'WH-EXP-002' })
      const sku = await createTestSku(prisma)

      await createTestTransaction(prisma, sku.id, warehouse1.id, adminUser.id, { transactionId: 'EXP-001' })
      await createTestTransaction(prisma, sku.id, warehouse2.id, adminUser.id, { transactionId: 'EXP-002' })

      const response = await request
        .get(`/api/export?type=transaction&warehouseId=${warehouse1.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.text).toContain('EXP-001')
      expect(response.text).not.toContain('EXP-002')
    })

    it('should return 401 for unauthenticated request', async () => {

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
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

      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { currentCartons: 10, currentUnits: 240 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { currentCartons: 20, currentUnits: 480 })

      const response = await request
        .get('/api/export/inventory')
        .withAuth('staff', regularUser.id)

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
      const warehouse1 = await createTestWarehouse(prisma, { code: 'WH-INV-001' })
      const warehouse2 = await createTestWarehouse(prisma, { code: 'WH-INV-002' })

      await createTestInventoryBalance(prisma, sku.id, warehouse1.id)
      await createTestInventoryBalance(prisma, sku.id, warehouse2.id)

      const response = await request
        .get(`/api/export/inventory?warehouseId=${warehouse1.id}`)
        .withAuth('staff', regularUser.id)

      expect(response.status).toBe(200)
      expect(response.text).toContain('WH-INV-001')
      expect(response.text).not.toContain('WH-INV-002')
    })
  })

  describe('GET /api/export/ledger', () => {
    it('should export transaction ledger', async () => {
      const sku = await createTestSku(prisma, { skuCode: 'LEDGER-001' })
      const warehouse = await createTestWarehouse(prisma)

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'RECEIVE',
        cartonsIn: 10,
        referenceId: 'LED-001',
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        transactionType: 'SHIP',
        cartonsOut: 3,
        referenceId: 'LED-002',
        transactionDate: new Date('2024-01-15')
      })

      const response = await request
        .get('/api/export/ledger')
        .withAuth('staff', regularUser.id)

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

      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        referenceId: 'JAN-001',
        transactionDate: new Date('2024-01-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        referenceId: 'FEB-001',
        transactionDate: new Date('2024-02-01')
      })
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        referenceId: 'MAR-001',
        transactionDate: new Date('2024-03-01')
      })

      const response = await request
        .get('/api/export/ledger?startDate=2024-01-15&endDate=2024-02-15')
        .withAuth('staff', regularUser.id)

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
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        referenceId: 'COMPLETE-001',
      })

      // Transaction with missing attributes
      await createTestTransaction(prisma, sku.id, warehouse.id, regularUser.id, {
        referenceId: 'INCOMPLETE-001',
      })

      const response = await request
        .get('/api/export/missing-attributes')
        .withAuth('staff', regularUser.id)

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
      const warehouse = await createTestWarehouse(prisma, { code: 'WH-ADJ-001' })

      // Create existing balances
      await createTestInventoryBalance(prisma, sku1.id, warehouse.id, { currentCartons: 10, currentUnits: 240 })
      await createTestInventoryBalance(prisma, sku2.id, warehouse.id, { currentCartons: 20, currentUnits: 480 })

      // No need for mockGetServerSession with test auth setup

      const csvContent = `skuCode,warehouseId,newQuantity,reason
ADJ-001,WH-ADJ-001,150,Physical count adjustment
ADJ-002,WH-ADJ-001,180,Damaged goods write-off`

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/upload/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from(csvContent), 'inventory-adjustment.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('adjustments', 2)

      // Verify adjustments were created
      const adjustments = await prisma.inventoryTransaction.findMany({
        where: { 
          transactionType: 'ADJUST_OUT',
          skuId: { in: [sku1.id, sku2.id] }
        }
      })
      expect(adjustments).toHaveLength(2)
    })

    it('should validate adjustment data', async () => {
      // No need for mockGetServerSession with test auth setup

      const csvContent = `skuCode,warehouseId,newQuantity,reason
INVALID-SKU,WH-001,100,Invalid SKU
ADJ-001,INVALID-WH,100,Invalid warehouse`

      const supertest = require('supertest');
      const response = await supertest(process.env.TEST_SERVER_URL || 'http://localhost:3000')
        .post('/api/upload/inventory')
        .set('Cookie', 'next-auth.session-token=test-token')
        .attach('file', Buffer.from(csvContent), 'invalid-adjustments.csv')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('errors')
      expect(response.body.errors).toHaveLength(2)
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request
        .post('/api/upload/inventory')
        .withAuth('staff', regularUser.id)
        .attach('file', Buffer.from('test'), 'test.csv')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Forbidden')
    })
  })
})