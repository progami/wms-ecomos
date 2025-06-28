#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { 
  UserRole, 
  TransactionType, 
  CostCategory, 
  InvoiceStatus, 
  ReconciliationStatus,
  DisputeStatus,
  NotificationType,
  ResolutionType,
  FileAttachmentType
} from '@prisma/client'
import { 
  addDays, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  addWeeks,
  differenceInDays
} from 'date-fns'
import { calculateRestockMetrics } from '../lib/algorithms/restock-algorithm'
import { CostCalculationService } from '../lib/services/cost-calculation-service'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// Logger setup
const LOG_FILE = path.join(process.cwd(), 'dev.log')

async function log(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' = 'INFO') {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [${level}] ${message}\n`
  
  // console.log(logEntry.trim())
  
  try {
    await fs.appendFile(LOG_FILE, logEntry)
  } catch (error) {
    // console.error('Failed to write to log file:', error)
  }
}

// Test data definitions
const TEST_SKUS = [
  // High velocity items
  { 
    skuCode: 'TEST-HIGH-001', 
    asin: 'B0TEST001', 
    description: 'Test High Velocity Item - Phone Cases', 
    packSize: 10, 
    unitsPerCarton: 100,
    dailySalesVelocity: 150,
    currentStock: 1500,
    leadTimeDays: 7
  },
  { 
    skuCode: 'TEST-HIGH-002', 
    asin: 'B0TEST002', 
    description: 'Test High Velocity Item - Charging Cables', 
    packSize: 5, 
    unitsPerCarton: 50,
    dailySalesVelocity: 200,
    currentStock: 500,
    leadTimeDays: 10
  },
  
  // Medium velocity items
  { 
    skuCode: 'TEST-MED-001', 
    asin: 'B0TEST003', 
    description: 'Test Medium Velocity - Bluetooth Speakers', 
    packSize: 1, 
    unitsPerCarton: 12,
    dailySalesVelocity: 25,
    currentStock: 300,
    leadTimeDays: 14
  },
  { 
    skuCode: 'TEST-MED-002', 
    asin: 'B0TEST004', 
    description: 'Test Medium Velocity - Kitchen Utensils', 
    packSize: 6, 
    unitsPerCarton: 24,
    dailySalesVelocity: 30,
    currentStock: 720,
    leadTimeDays: 12
  },
  { 
    skuCode: 'TEST-MED-003', 
    asin: 'B0TEST005', 
    description: 'Test Medium Velocity - Yoga Mats', 
    packSize: 1, 
    unitsPerCarton: 8,
    dailySalesVelocity: 15,
    currentStock: 120,
    leadTimeDays: 21
  },
  
  // Low velocity items
  { 
    skuCode: 'TEST-LOW-001', 
    asin: 'B0TEST006', 
    description: 'Test Low Velocity - Specialty Tools', 
    packSize: 1, 
    unitsPerCarton: 6,
    dailySalesVelocity: 3,
    currentStock: 60,
    leadTimeDays: 30
  },
  { 
    skuCode: 'TEST-LOW-002', 
    asin: 'B0TEST007', 
    description: 'Test Low Velocity - Art Supplies', 
    packSize: 12, 
    unitsPerCarton: 48,
    dailySalesVelocity: 5,
    currentStock: 240,
    leadTimeDays: 25
  },
  
  // Critical stock items
  { 
    skuCode: 'TEST-CRIT-001', 
    asin: 'B0TEST008', 
    description: 'Test Critical Stock - Popular Game', 
    packSize: 1, 
    unitsPerCarton: 20,
    dailySalesVelocity: 50,
    currentStock: 100,
    leadTimeDays: 14
  },
  { 
    skuCode: 'TEST-CRIT-002', 
    asin: 'B0TEST009', 
    description: 'Test Critical Stock - Seasonal Item', 
    packSize: 2, 
    unitsPerCarton: 24,
    dailySalesVelocity: 40,
    currentStock: 80,
    leadTimeDays: 10
  },
  
  // Out of stock items
  { 
    skuCode: 'TEST-OOS-001', 
    asin: 'B0TEST010', 
    description: 'Test Out of Stock - Discontinued', 
    packSize: 1, 
    unitsPerCarton: 10,
    dailySalesVelocity: 10,
    currentStock: 0,
    leadTimeDays: 30
  },
  
  // Bulk items
  { 
    skuCode: 'TEST-BULK-001', 
    asin: 'B0TEST011', 
    description: 'Test Bulk Item - Industrial Supplies', 
    packSize: 100, 
    unitsPerCarton: 1000,
    dailySalesVelocity: 500,
    currentStock: 10000,
    leadTimeDays: 45
  },
  { 
    skuCode: 'TEST-BULK-002', 
    asin: 'B0TEST012', 
    description: 'Test Bulk Item - Paper Products', 
    packSize: 50, 
    unitsPerCarton: 500,
    dailySalesVelocity: 250,
    currentStock: 7500,
    leadTimeDays: 30
  },
  
  // Different packaging configurations
  { 
    skuCode: 'TEST-PKG-001', 
    asin: 'B0TEST013', 
    description: 'Test Small Package - Electronics', 
    packSize: 1, 
    unitsPerCarton: 144,
    dailySalesVelocity: 72,
    currentStock: 1440,
    leadTimeDays: 10
  },
  { 
    skuCode: 'TEST-PKG-002', 
    asin: 'B0TEST014', 
    description: 'Test Large Package - Home Goods', 
    packSize: 1, 
    unitsPerCarton: 4,
    dailySalesVelocity: 8,
    currentStock: 40,
    leadTimeDays: 20
  },
  { 
    skuCode: 'TEST-PKG-003', 
    asin: 'B0TEST015', 
    description: 'Test Multi-Pack - Consumables', 
    packSize: 24, 
    unitsPerCarton: 96,
    dailySalesVelocity: 48,
    currentStock: 960,
    leadTimeDays: 15
  }
]

// Test summary storage
interface TestResult {
  step: string
  status: 'PASS' | 'FAIL'
  message: string
  error?: string
  data?: any
}

const testResults: TestResult[] = []

function recordResult(step: string, status: 'PASS' | 'FAIL', message: string, error?: string, data?: any) {
  const result: TestResult = { step, status, message, error, data }
  testResults.push(result)
  log(`${step}: ${status} - ${message}${error ? ` (Error: ${error})` : ''}`, status === 'FAIL' ? 'ERROR' : 'INFO')
}

// Cleanup tracking
const createdRecords = {
  users: [] as string[],
  warehouses: [] as string[],
  skus: [] as string[],
  transactions: [] as string[],
  invoices: [] as string[],
  costRates: [] as string[]
}

async function createTestData() {
  await log('=== STARTING TEST DATA CREATION ===', 'INFO')
  
  try {
    // Step 1: Create test user
    await log('Creating test user...', 'INFO')
    const hashedPassword = await hash('TestPassword123!', 10)
    const testUser = await prisma.user.create({
      data: {
        email: 'test.operations@warehouse.com',
        username: 'test_operations',
        passwordHash: hashedPassword,
        fullName: 'Test Operations User',
        role: UserRole.ADMIN,
        isDemo: true
      }
    })
    createdRecords.users.push(testUser.id)
    recordResult('Create Test User', 'PASS', 'Test user created successfully', undefined, { userId: testUser.id })
    
    // Step 2: Create test warehouse
    await log('Creating test warehouse...', 'INFO')
    const testWarehouse = await prisma.warehouse.create({
      data: {
        code: 'TEST-WH-001',
        name: 'Test Operations Warehouse',
        address: '123 Test Street, Test City, TC 12345',
        latitude: 40.7128,
        longitude: -74.0060,
        contactEmail: 'test@warehouse.com',
        contactPhone: '+1-555-TEST-001',
        isActive: true
      }
    })
    createdRecords.warehouses.push(testWarehouse.id)
    recordResult('Create Test Warehouse', 'PASS', 'Test warehouse created successfully', undefined, { warehouseId: testWarehouse.id })
    
    // Step 3: Create cost rates
    await log('Creating cost rates...', 'INFO')
    const costRates = [
      { costCategory: CostCategory.INBOUND, costName: 'Receiving Fee', costValue: 2.50, unitOfMeasure: 'per carton' },
      { costCategory: CostCategory.OUTBOUND, costName: 'Shipping Fee', costValue: 3.00, unitOfMeasure: 'per carton' },
      { costCategory: CostCategory.STORAGE, costName: 'Pallet Storage', costValue: 15.00, unitOfMeasure: 'per pallet per week' },
      { costCategory: CostCategory.STORAGE, costName: 'Overflow Storage', costValue: 0.50, unitOfMeasure: 'per carton per week' },
      { costCategory: CostCategory.HANDLING, costName: 'Special Handling', costValue: 5.00, unitOfMeasure: 'per unit' }
    ]
    
    for (const rate of costRates) {
      const costRate = await prisma.costRate.create({
        data: {
          warehouseId: testWarehouse.id,
          ...rate,
          costValue: new Decimal(rate.costValue),
          effectiveDate: subDays(new Date(), 90),
          createdById: testUser.id
        }
      })
      createdRecords.costRates.push(costRate.id)
    }
    recordResult('Create Cost Rates', 'PASS', `Created ${costRates.length} cost rates`, undefined, { count: costRates.length })
    
    // Step 4: Create test SKUs
    await log('Creating test SKUs...', 'INFO')
    const skuMap = new Map<string, string>()
    
    for (const skuData of TEST_SKUS) {
      const sku = await prisma.sku.create({
        data: {
          skuCode: skuData.skuCode,
          asin: skuData.asin,
          description: skuData.description,
          packSize: skuData.packSize,
          material: 'Mixed Materials',
          unitDimensionsCm: '10x10x5',
          unitWeightKg: new Decimal(0.5),
          unitsPerCarton: skuData.unitsPerCarton,
          cartonDimensionsCm: '40x30x30',
          cartonWeightKg: new Decimal(skuData.unitsPerCarton * 0.5 + 0.5),
          packagingType: 'Box',
          isActive: true
        }
      })
      createdRecords.skus.push(sku.id)
      skuMap.set(skuData.skuCode, sku.id)
      
      // Create warehouse SKU config
      await prisma.warehouseSkuConfig.create({
        data: {
          warehouseId: testWarehouse.id,
          skuId: sku.id,
          storageCartonsPerPallet: 48,
          shippingCartonsPerPallet: 48,
          maxStackingHeightCm: 180,
          effectiveDate: subDays(new Date(), 90),
          createdById: testUser.id
        }
      })
    }
    recordResult('Create Test SKUs', 'PASS', `Created ${TEST_SKUS.length} SKUs with configurations`, undefined, { count: TEST_SKUS.length })
    
    // Step 5: Generate inventory transactions
    await log('Generating inventory transactions...', 'INFO')
    const transactionCount = await generateInventoryTransactions(testWarehouse.id, testUser.id, skuMap)
    recordResult('Generate Transactions', 'PASS', `Generated ${transactionCount} inventory transactions`, undefined, { count: transactionCount })
    
    // Step 6: Test cost calculation triggers
    await log('Testing cost calculation triggers...', 'INFO')
    const costCalcResult = await testCostCalculations(testWarehouse.id, testUser.id, skuMap)
    recordResult('Test Cost Calculations', costCalcResult.success ? 'PASS' : 'FAIL', costCalcResult.message, costCalcResult.error)
    
    // Step 7: Test import/export functionality
    await log('Testing import/export functionality...', 'INFO')
    const importExportResult = await testImportExport(testWarehouse.id)
    recordResult('Test Import/Export', importExportResult.success ? 'PASS' : 'FAIL', importExportResult.message, importExportResult.error)
    
    // Step 8: Test restock algorithm
    await log('Testing restock algorithm...', 'INFO')
    const restockResult = await testRestockAlgorithm(skuMap)
    recordResult('Test Restock Algorithm', restockResult.success ? 'PASS' : 'FAIL', restockResult.message, restockResult.error, restockResult.data)
    
    await log('=== TEST DATA CREATION COMPLETED ===', 'INFO')
    
  } catch (error) {
    await log(`Critical error during test data creation: ${error}`, 'ERROR')
    recordResult('Overall Test', 'FAIL', 'Critical error occurred', error?.toString())
    throw error
  }
}

async function generateInventoryTransactions(warehouseId: string, userId: string, skuMap: Map<string, string>): Promise<number> {
  const transactions = []
  const startDate = subDays(new Date(), 30)
  const batchNumbers = ['BATCH001', 'BATCH002', 'BATCH003', 'BATCH004', 'BATCH005']
  
  for (const [skuCode, skuId] of skuMap.entries()) {
    const skuData = TEST_SKUS.find(s => s.skuCode === skuCode)!
    
    // Generate initial receive transactions
    for (let i = 0; i < 3; i++) {
      const transactionDate = addDays(startDate, Math.floor(Math.random() * 10))
      const cartonsReceived = Math.floor(Math.random() * 50) + 20
      const batchLot = batchNumbers[Math.floor(Math.random() * batchNumbers.length)]
      
      const transaction = {
        transactionId: `TEST-RCV-${skuCode}-${i + 1}`,
        warehouseId,
        skuId,
        batchLot,
        transactionType: TransactionType.RECEIVE,
        referenceId: `PO-${Date.now()}-${i}`,
        cartonsIn: cartonsReceived,
        cartonsOut: 0,
        storagePalletsIn: Math.ceil(cartonsReceived / 48),
        shippingPalletsOut: 0,
        transactionDate,
        createdById: userId,
        storageCartonsPerPallet: 48,
        shippingCartonsPerPallet: 48
      }
      
      const created = await prisma.inventoryTransaction.create({ data: transaction })
      createdRecords.transactions.push(created.id)
      transactions.push(created)
    }
    
    // Generate ship transactions
    for (let i = 0; i < 5; i++) {
      const transactionDate = addDays(startDate, 10 + Math.floor(Math.random() * 20))
      const cartonsShipped = Math.floor(Math.random() * 20) + 5
      const batchLot = batchNumbers[Math.floor(Math.random() * batchNumbers.length)]
      
      const transaction = {
        transactionId: `TEST-SHP-${skuCode}-${i + 1}`,
        warehouseId,
        skuId,
        batchLot,
        transactionType: TransactionType.SHIP,
        referenceId: `SO-${Date.now()}-${i}`,
        cartonsIn: 0,
        cartonsOut: cartonsShipped,
        storagePalletsIn: 0,
        shippingPalletsOut: Math.ceil(cartonsShipped / 48),
        transactionDate,
        pickupDate: addDays(transactionDate, 1),
        createdById: userId,
        storageCartonsPerPallet: 48,
        shippingCartonsPerPallet: 48,
        shipName: `Test Shipment ${i + 1}`,
        trackingNumber: `1Z999AA1${Date.now()}${i}`,
        modeOfTransportation: ['Ground', 'Air', 'Ocean'][Math.floor(Math.random() * 3)]
      }
      
      const created = await prisma.inventoryTransaction.create({ data: transaction })
      createdRecords.transactions.push(created.id)
      transactions.push(created)
    }
    
    // Generate a transfer transaction
    if (Math.random() > 0.5) {
      const transactionDate = addDays(startDate, 15)
      const cartonsTransferred = Math.floor(Math.random() * 10) + 5
      const batchLot = batchNumbers[Math.floor(Math.random() * batchNumbers.length)]
      
      const transaction = {
        transactionId: `TEST-TRF-${skuCode}-1`,
        warehouseId,
        skuId,
        batchLot,
        transactionType: TransactionType.TRANSFER,
        referenceId: `TRF-${Date.now()}`,
        cartonsIn: 0,
        cartonsOut: cartonsTransferred,
        storagePalletsIn: 0,
        shippingPalletsOut: Math.ceil(cartonsTransferred / 48),
        transactionDate,
        createdById: userId,
        storageCartonsPerPallet: 48,
        shippingCartonsPerPallet: 48
      }
      
      const created = await prisma.inventoryTransaction.create({ data: transaction })
      createdRecords.transactions.push(created.id)
      transactions.push(created)
    }
  }
  
  return transactions.length
}

async function testCostCalculations(warehouseId: string, userId: string, skuMap: Map<string, string>) {
  try {
    // Get a sample transaction
    const sampleTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        warehouseId,
        transactionType: TransactionType.RECEIVE
      }
    })
    
    if (!sampleTransaction) {
      return { success: false, message: 'No sample transaction found', error: 'No data' }
    }
    
    // Test cost calculation
    await CostCalculationService.calculateTransactionCosts(
      {
        transactionId: sampleTransaction.transactionId,
        warehouseId: sampleTransaction.warehouseId,
        skuId: sampleTransaction.skuId,
        batchLot: sampleTransaction.batchLot,
        transactionType: sampleTransaction.transactionType,
        transactionDate: sampleTransaction.transactionDate,
        cartonsIn: sampleTransaction.cartonsIn,
        cartonsOut: sampleTransaction.cartonsOut,
        storagePalletsIn: sampleTransaction.storagePalletsIn,
        shippingPalletsOut: sampleTransaction.shippingPalletsOut,
        storageCartonsPerPallet: sampleTransaction.storageCartonsPerPallet,
        shippingCartonsPerPallet: sampleTransaction.shippingCartonsPerPallet
      },
      userId
    )
    
    // Verify costs were calculated
    const calculatedCosts = await prisma.calculatedCost.findMany({
      where: {
        transactionReferenceId: sampleTransaction.transactionId
      }
    })
    
    if (calculatedCosts.length > 0) {
      return { 
        success: true, 
        message: `Cost calculations triggered successfully. Found ${calculatedCosts.length} calculated costs.`,
        data: { costCount: calculatedCosts.length }
      }
    } else {
      return { success: false, message: 'No calculated costs found', error: 'Calculation may have failed' }
    }
    
  } catch (error) {
    return { success: false, message: 'Cost calculation test failed', error: error?.toString() }
  }
}

async function testImportExport(warehouseId: string) {
  try {
    // Export inventory data
    const exportDir = path.join(process.cwd(), 'test-exports')
    await fs.mkdir(exportDir, { recursive: true })
    
    // Get inventory data
    const inventory = await prisma.inventoryBalance.findMany({
      where: { warehouseId },
      include: {
        sku: true,
        warehouse: true
      }
    })
    
    // Create CSV export
    const csvHeaders = ['SKU Code', 'Description', 'Batch/Lot', 'Current Cartons', 'Current Pallets', 'Current Units']
    const csvRows = inventory.map(inv => [
      inv.sku.skuCode,
      inv.sku.description,
      inv.batchLot,
      inv.currentCartons,
      inv.currentPallets,
      inv.currentUnits
    ])
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')
    
    const exportFile = path.join(exportDir, `inventory-export-${Date.now()}.csv`)
    await fs.writeFile(exportFile, csvContent)
    
    // Test import by reading the file back
    const importedContent = await fs.readFile(exportFile, 'utf-8')
    const lines = importedContent.split('\n')
    
    if (lines.length === inventory.length + 1) { // +1 for header
      // Clean up
      await fs.unlink(exportFile)
      await fs.rmdir(exportDir)
      
      return { 
        success: true, 
        message: `Export/Import test successful. Exported ${inventory.length} inventory records.`,
        data: { recordCount: inventory.length }
      }
    } else {
      return { success: false, message: 'Import/Export mismatch', error: 'Row count mismatch' }
    }
    
  } catch (error) {
    return { success: false, message: 'Import/Export test failed', error: error?.toString() }
  }
}

async function testRestockAlgorithm(skuMap: Map<string, string>) {
  try {
    const restockAnalysis = []
    
    for (const [skuCode, skuId] of skuMap.entries()) {
      const skuData = TEST_SKUS.find(s => s.skuCode === skuCode)!
      
      // Get current inventory
      const inventory = await prisma.inventoryBalance.findMany({
        where: { skuId }
      })
      
      const totalCartons = inventory.reduce((sum, inv) => sum + inv.currentCartons, 0)
      const totalUnits = inventory.reduce((sum, inv) => sum + inv.currentUnits, 0)
      
      // Calculate restock metrics
      const metrics = calculateRestockMetrics({
        currentStock: totalUnits,
        dailySalesVelocity: skuData.dailySalesVelocity,
        leadTimeDays: skuData.leadTimeDays,
        safetyStockDays: 7,
        unitsPerCarton: skuData.unitsPerCarton,
        cartonsPerPallet: 48,
        targetStockDays: 30
      })
      
      restockAnalysis.push({
        skuCode,
        currentStock: totalUnits,
        daysOfStock: metrics.daysOfStockRemaining,
        urgencyLevel: metrics.urgencyLevel,
        urgencyScore: metrics.urgencyScore,
        recommendation: metrics.recommendation,
        suggestedCartons: metrics.suggestedCartons,
        suggestedPallets: metrics.suggestedPallets
      })
    }
    
    // Count urgency levels
    const urgencyCount = {
      critical: restockAnalysis.filter(a => a.urgencyLevel === 'critical').length,
      high: restockAnalysis.filter(a => a.urgencyLevel === 'high').length,
      medium: restockAnalysis.filter(a => a.urgencyLevel === 'medium').length,
      low: restockAnalysis.filter(a => a.urgencyLevel === 'low').length
    }
    
    return {
      success: true,
      message: `Restock algorithm tested on ${restockAnalysis.length} SKUs`,
      data: {
        totalSkus: restockAnalysis.length,
        urgencyBreakdown: urgencyCount,
        criticalSkus: restockAnalysis.filter(a => a.urgencyLevel === 'critical').map(a => ({
          sku: a.skuCode,
          daysRemaining: a.daysOfStock,
          recommendation: a.recommendation
        }))
      }
    }
    
  } catch (error) {
    return { success: false, message: 'Restock algorithm test failed', error: error?.toString() }
  }
}

async function generateSummaryReport() {
  await log('=== GENERATING TEST SUMMARY REPORT ===', 'INFO')
  
  const reportPath = path.join(process.cwd(), `test-summary-${Date.now()}.md`)
  
  const reportContent = [
    '# Operations Workflow Test Summary Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Test Results Overview',
    '',
    '| Step | Status | Message |',
    '|------|--------|---------|'
  ]
  
  let passCount = 0
  let failCount = 0
  
  for (const result of testResults) {
    reportContent.push(`| ${result.step} | ${result.status} | ${result.message} |`)
    if (result.status === 'PASS') passCount++
    else failCount++
  }
  
  reportContent.push('')
  reportContent.push(`### Summary: ${passCount} PASSED, ${failCount} FAILED`)
  reportContent.push('')
  
  // Add detailed results
  reportContent.push('## Detailed Results')
  reportContent.push('')
  
  for (const result of testResults) {
    reportContent.push(`### ${result.step}`)
    reportContent.push(`- **Status**: ${result.status}`)
    reportContent.push(`- **Message**: ${result.message}`)
    if (result.error) {
      reportContent.push(`- **Error**: ${result.error}`)
    }
    if (result.data) {
      reportContent.push(`- **Data**: ${JSON.stringify(result.data, null, 2)}`)
    }
    reportContent.push('')
  }
  
  // Add record counts
  reportContent.push('## Created Records Summary')
  reportContent.push('')
  reportContent.push(`- Users: ${createdRecords.users.length}`)
  reportContent.push(`- Warehouses: ${createdRecords.warehouses.length}`)
  reportContent.push(`- SKUs: ${createdRecords.skus.length}`)
  reportContent.push(`- Transactions: ${createdRecords.transactions.length}`)
  reportContent.push(`- Invoices: ${createdRecords.invoices.length}`)
  reportContent.push(`- Cost Rates: ${createdRecords.costRates.length}`)
  
  await fs.writeFile(reportPath, reportContent.join('\n'))
  await log(`Test summary report saved to: ${reportPath}`, 'INFO')
  
  return reportPath
}

async function cleanupTestData() {
  await log('=== STARTING CLEANUP ===', 'INFO')
  
  try {
    // Delete in reverse order of dependencies
    
    // Delete calculated costs
    await prisma.calculatedCost.deleteMany({
      where: {
        warehouseId: { in: createdRecords.warehouses }
      }
    })
    await log('Deleted calculated costs', 'INFO')
    
    // Delete storage ledger entries
    await prisma.storageLedger.deleteMany({
      where: {
        warehouseId: { in: createdRecords.warehouses }
      }
    })
    await log('Deleted storage ledger entries', 'INFO')
    
    // Delete inventory balances
    await prisma.inventoryBalance.deleteMany({
      where: {
        warehouseId: { in: createdRecords.warehouses }
      }
    })
    await log('Deleted inventory balances', 'INFO')
    
    // Delete inventory transactions
    await prisma.inventoryTransaction.deleteMany({
      where: {
        id: { in: createdRecords.transactions }
      }
    })
    await log(`Deleted ${createdRecords.transactions.length} inventory transactions`, 'INFO')
    
    // Delete cost rates
    await prisma.costRate.deleteMany({
      where: {
        id: { in: createdRecords.costRates }
      }
    })
    await log(`Deleted ${createdRecords.costRates.length} cost rates`, 'INFO')
    
    // Delete warehouse SKU configs
    await prisma.warehouseSkuConfig.deleteMany({
      where: {
        warehouseId: { in: createdRecords.warehouses }
      }
    })
    await log('Deleted warehouse SKU configs', 'INFO')
    
    // Delete SKUs
    await prisma.sku.deleteMany({
      where: {
        id: { in: createdRecords.skus }
      }
    })
    await log(`Deleted ${createdRecords.skus.length} SKUs`, 'INFO')
    
    // Delete warehouses
    await prisma.warehouse.deleteMany({
      where: {
        id: { in: createdRecords.warehouses }
      }
    })
    await log(`Deleted ${createdRecords.warehouses.length} warehouses`, 'INFO')
    
    // Delete users
    await prisma.user.deleteMany({
      where: {
        id: { in: createdRecords.users }
      }
    })
    await log(`Deleted ${createdRecords.users.length} users`, 'INFO')
    
    await log('=== CLEANUP COMPLETED SUCCESSFULLY ===', 'INFO')
    
  } catch (error) {
    await log(`Error during cleanup: ${error}`, 'ERROR')
    throw error
  }
}

// Main execution
async function main() {
  // console.log('Starting Operations Workflow Test...')
  
  try {
    // Run tests
    await createTestData()
    
    // Generate report
    const reportPath = await generateSummaryReport()
    
    // console.log('\n=== TEST EXECUTION COMPLETED ===')
    // console.log(`Summary report saved to: ${reportPath}`)
    // console.log(`Log file saved to: ${LOG_FILE}`)
    
    // Ask for cleanup
    // console.log('\nDo you want to clean up the test data? (y/n)')
    
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase()
      
      if (answer === 'y' || answer === 'yes') {
        await cleanupTestData()
        // console.log('Cleanup completed successfully!')
      } else {
        // console.log('Test data retained. Remember to clean up manually if needed.')
        // console.log('Created record IDs have been logged for reference.')
      }
      
      await prisma.$disconnect()
      process.exit(0)
    })
    
  } catch (error) {
    // console.error('Fatal error:', error)
    await log(`Fatal error: ${error}`, 'ERROR')
    await prisma.$disconnect()
    process.exit(1)
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  // console.log('\nScript interrupted. Disconnecting from database...')
  await prisma.$disconnect()
  process.exit(0)
})

// Run the script
main()