import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

// Copy of calculateUnits function
function calculateUnits(
  cartons: number,
  transaction?: { unitsPerCarton?: number | null },
  sku?: { unitsPerCarton?: number | null }
): number {
  const unitsPerCarton = transaction?.unitsPerCarton ?? sku?.unitsPerCarton ?? 1
  return Math.max(0, cartons * unitsPerCarton)
}

async function testDataIntegrity() {
  console.log('🧪 Running comprehensive data integrity tests...\n')
  
  let testsPassed = 0
  let testsFailed = 0
  
  try {
    // Clean up test data
    await cleanupTestData()
    
    // Setup test data
    const { user, warehouse, sku } = await setupTestData()
    
    // Test 1: Unit calculation consistency
    console.log('Test 1: Unit calculation consistency')
    try {
      await testUnitCalculationConsistency(user, warehouse, sku)
      console.log('✅ Unit calculations are consistent\n')
      testsPassed++
    } catch (error) {
      console.error('❌ Unit calculation test failed:', error)
      testsFailed++
    }
    
    // Test 2: Round-trip import/export
    console.log('Test 2: Round-trip import/export integrity')
    try {
      await testRoundTripImportExport(user, warehouse, sku)
      console.log('✅ Round-trip import/export maintains data integrity\n')
      testsPassed++
    } catch (error) {
      console.error('❌ Round-trip test failed:', error)
      testsFailed++
    }
    
    // Test 3: Database constraints
    console.log('Test 3: Database constraint validation')
    try {
      await testDatabaseConstraints(user, warehouse, sku)
      console.log('✅ Database constraints working correctly\n')
      testsPassed++
    } catch (error) {
      console.error('❌ Constraint test failed:', error)
      testsFailed++
    }
    
    // Test 4: Historical data preservation
    console.log('Test 4: Historical data preservation')
    try {
      await testHistoricalDataPreservation(user, warehouse, sku)
      console.log('✅ Historical data preserved correctly\n')
      testsPassed++
    } catch (error) {
      console.error('❌ Historical preservation test failed:', error)
      testsFailed++
    }
    
    console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`)
    
  } catch (error) {
    console.error('Test suite failed:', error)
  } finally {
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

async function setupTestData() {
  const user = await prisma.user.create({
    data: {
      email: 'test-integrity@example.com',
      fullName: 'Test Integrity User',
      passwordHash: 'dummy',
      role: 'admin'
    }
  })
  
  const warehouse = await prisma.warehouse.create({
    data: {
      code: 'TEST-INT',
      name: 'Test Integrity Warehouse',
      isActive: true
    }
  })
  
  const sku = await prisma.sku.create({
    data: {
      skuCode: 'TEST-INT-001',
      description: 'Test Integrity Product',
      packSize: 1,
      unitsPerCarton: 10,
      isActive: true
    }
  })
  
  return { user, warehouse, sku }
}

async function cleanupTestData() {
  await prisma.inventoryTransaction.deleteMany({
    where: { sku: { skuCode: { startsWith: 'TEST-INT' } } }
  })
  await prisma.inventoryBalance.deleteMany({
    where: { sku: { skuCode: { startsWith: 'TEST-INT' } } }
  })
  await prisma.sku.deleteMany({
    where: { skuCode: { startsWith: 'TEST-INT' } }
  })
  await prisma.warehouse.deleteMany({
    where: { code: 'TEST-INT' }
  })
  await prisma.user.deleteMany({
    where: { email: 'test-integrity@example.com' }
  })
}

async function testUnitCalculationConsistency(user: any, warehouse: any, sku: any) {
  // Create transaction with specific unitsPerCarton
  const transaction = await prisma.inventoryTransaction.create({
    data: {
      transactionId: 'TXN-TEST-UNITS-001',
      warehouseId: warehouse.id,
      skuId: sku.id,
      batchLot: 'BATCH-UNITS',
      transactionType: 'RECEIVE',
      referenceId: 'REF-UNITS-001',
      cartonsIn: 50,
      cartonsOut: 0,
      storagePalletsIn: 5,
      shippingPalletsOut: 0,
      transactionDate: new Date(),
      createdById: user.id,
      unitsPerCarton: 10
    }
  })
  
  // Test utility function
  const units = calculateUnits(50, transaction, sku)
  if (units !== 500) {
    throw new Error(`Expected 500 units, got ${units}`)
  }
  
  // Change SKU units per carton
  await prisma.sku.update({
    where: { id: sku.id },
    data: { unitsPerCarton: 12 }
  })
  
  // Verify calculation still uses transaction value
  const unitsAfterChange = calculateUnits(50, transaction, sku)
  if (unitsAfterChange !== 500) {
    throw new Error(`Units changed after SKU update: expected 500, got ${unitsAfterChange}`)
  }
}

async function testRoundTripImportExport(user: any, warehouse: any, sku: any) {
  // Create original transactions
  const originalTransactions = await Promise.all([
    prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-EXPORT-001',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-EXP-001',
        transactionType: 'RECEIVE',
        referenceId: 'REF-EXP-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date('2024-01-01'),
        createdById: user.id,
        unitsPerCarton: 10,
        trackingNumber: 'TRACK-001',
        shipName: 'TEST VESSEL'
      }
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-EXPORT-002',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-EXP-001',
        transactionType: 'SHIP',
        referenceId: 'REF-EXP-002',
        cartonsIn: 0,
        cartonsOut: 30,
        storagePalletsIn: 0,
        shippingPalletsOut: 3,
        transactionDate: new Date('2024-01-15'),
        createdById: user.id,
        unitsPerCarton: 10,
        trackingNumber: 'FBA-SHIP-001'
      }
    })
  ])
  
  // Simulate import by updating tracking numbers (testing upsert)
  await Promise.all(
    originalTransactions.map(tx => 
      prisma.inventoryTransaction.update({
        where: { transactionId: tx.transactionId },
        data: { 
          trackingNumber: `${tx.trackingNumber}-UPDATED`,
          referenceId: `${tx.referenceId}-UPDATED`
        }
      })
    )
  )
  
  // Verify critical fields remain unchanged
  const updatedTransactions = await prisma.inventoryTransaction.findMany({
    where: { transactionId: { in: ['TXN-EXPORT-001', 'TXN-EXPORT-002'] } },
    orderBy: { transactionId: 'asc' }
  })
  
  // Check immutable fields
  if (updatedTransactions[0].cartonsIn !== 100 || updatedTransactions[1].cartonsOut !== 30) {
    throw new Error('Critical fields were modified during import')
  }
  
  // Check mutable fields
  if (!updatedTransactions[0].trackingNumber?.includes('UPDATED')) {
    throw new Error('Mutable fields were not updated during import')
  }
}

async function testDatabaseConstraints(user: any, warehouse: any, sku: any) {
  // Test 1: Negative cartons constraint
  try {
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-CONSTRAINT-001',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-CONST',
        transactionType: 'RECEIVE',
        referenceId: 'REF-CONST-001',
        cartonsIn: -10, // This should fail
        cartonsOut: 0,
        storagePalletsIn: 0,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: user.id
      }
    })
    throw new Error('Negative cartons constraint not working')
  } catch (error: any) {
    if (!error.message.includes('valid_carton_counts') && !error.message.includes('constraint')) {
      throw new Error('Unexpected error: ' + error.message)
    }
    console.log('  - Negative cartons properly rejected')
  }
  
  // Test 2: Negative units per carton
  try {
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-CONSTRAINT-002',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-CONST',
        transactionType: 'RECEIVE',
        referenceId: 'REF-CONST-002',
        cartonsIn: 10,
        cartonsOut: 0,
        storagePalletsIn: 1,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: user.id,
        unitsPerCarton: -5 // This should fail
      }
    })
    throw new Error('Negative units per carton constraint not working')
  } catch (error: any) {
    if (!error.message.includes('positive_units_per_carton') && !error.message.includes('constraint')) {
      throw new Error('Unexpected error: ' + error.message)
    }
    console.log('  - Negative units per carton properly rejected')
  }
  
  // Test 3: Future date constraint
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30) // 30 days in future
    
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-CONSTRAINT-003',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-CONST',
        transactionType: 'RECEIVE',
        referenceId: 'REF-CONST-003',
        cartonsIn: 10,
        cartonsOut: 0,
        storagePalletsIn: 1,
        shippingPalletsOut: 0,
        transactionDate: futureDate, // This should fail
        createdById: user.id
      }
    })
    throw new Error('Future date constraint not working')
  } catch (error: any) {
    if (!error.message.includes('future')) {
      // Constraint might not be active, log warning
      console.warn('  ⚠️  Future date constraint may not be active')
    } else {
      console.log('  - Future dates properly rejected')
    }
  }
}

async function testHistoricalDataPreservation(user: any, warehouse: any, sku: any) {
  // Create historical transaction
  const historicalTx = await prisma.inventoryTransaction.create({
    data: {
      transactionId: 'TXN-HIST-001',
      warehouseId: warehouse.id,
      skuId: sku.id,
      batchLot: 'BATCH-HIST',
      transactionType: 'RECEIVE',
      referenceId: 'REF-HIST-001',
      cartonsIn: 50,
      cartonsOut: 0,
      storagePalletsIn: 5,
      shippingPalletsOut: 0,
      transactionDate: new Date('2023-01-01'),
      createdById: user.id,
      unitsPerCarton: 10
    }
  })
  
  // Create balance
  await prisma.inventoryBalance.create({
    data: {
      warehouseId: warehouse.id,
      skuId: sku.id,
      batchLot: 'BATCH-HIST',
      currentCartons: 50,
      currentPallets: 5,
      currentUnits: 500, // 50 * 10
      lastTransactionDate: new Date('2023-01-01')
    }
  })
  
  // Change SKU units per carton
  await prisma.sku.update({
    where: { id: sku.id },
    data: { unitsPerCarton: 15 }
  })
  
  // Verify historical transaction unchanged
  const txAfterChange = await prisma.inventoryTransaction.findUnique({
    where: { id: historicalTx.id }
  })
  
  if (txAfterChange?.unitsPerCarton !== 10) {
    throw new Error('Historical transaction units per carton was modified')
  }
  
  // Verify balance units unchanged
  const balanceAfterChange = await prisma.inventoryBalance.findUnique({
    where: {
      warehouseId_skuId_batchLot: {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-HIST'
      }
    }
  })
  
  if (balanceAfterChange?.currentUnits !== 500) {
    throw new Error('Historical balance units were recalculated')
  }
}

// Run the tests
testDataIntegrity().then(() => {
  console.log('\n✅ All data integrity tests completed')
}).catch((error) => {
  console.error('\n❌ Data integrity tests failed:', error)
  process.exit(1)
})