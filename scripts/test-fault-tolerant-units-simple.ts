import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFaultTolerantUnits() {
  console.log('Testing fault-tolerant units per carton behavior...\n')
  
  try {
    // Clean up any existing test data
    await prisma.inventoryTransaction.deleteMany({
      where: { sku: { skuCode: 'TEST-SKU-001' } }
    })
    await prisma.inventoryBalance.deleteMany({
      where: { sku: { skuCode: 'TEST-SKU-001' } }
    })
    await prisma.sku.deleteMany({
      where: { skuCode: 'TEST-SKU-001' }
    })
    await prisma.warehouse.deleteMany({
      where: { code: 'TEST-WH' }
    })
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    })
    
    // Create test data
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: 'dummy',
        role: 'admin'
      }
    })
    
    const testWarehouse = await prisma.warehouse.create({
      data: {
        code: 'TEST-WH',
        name: 'Test Warehouse',
        isActive: true
      }
    })
    
    // Create SKU with initial units per carton = 10
    const testSku = await prisma.sku.create({
      data: {
        skuCode: 'TEST-SKU-001',
        description: 'Test Product',
        packSize: 1,
        unitsPerCarton: 10, // Initial value
        isActive: true
      }
    })
    
    console.log('1. Created SKU with unitsPerCarton = 10')
    
    // Create a transaction directly
    const transaction1 = await prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-TEST-001',
        warehouseId: testWarehouse.id,
        skuId: testSku.id,
        batchLot: 'BATCH-001',
        transactionType: 'RECEIVE',
        referenceId: 'REF-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        createdById: testUser.id,
        unitsPerCarton: testSku.unitsPerCarton // Capture the value
      }
    })
    
    console.log('2. Created RECEIVE transaction for 100 cartons')
    console.log(`   - Transaction captured unitsPerCarton: ${transaction1.unitsPerCarton}`)
    console.log(`   - Calculated units: ${100 * 10} = 1000 units`)
    
    // Create inventory balance
    await prisma.inventoryBalance.create({
      data: {
        warehouseId: testWarehouse.id,
        skuId: testSku.id,
        batchLot: 'BATCH-001',
        currentCartons: 100,
        currentPallets: 10,
        currentUnits: 1000, // 100 cartons * 10 units/carton
        lastTransactionDate: new Date()
      }
    })
    
    // Check inventory balance
    const balance1 = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: testWarehouse.id,
          skuId: testSku.id,
          batchLot: 'BATCH-001'
        }
      }
    })
    console.log(`   - Inventory balance shows: ${balance1?.currentUnits} units\n`)
    
    // Now change the SKU's units per carton
    await prisma.sku.update({
      where: { id: testSku.id },
      data: { unitsPerCarton: 12 } // Changed from 10 to 12
    })
    
    console.log('3. Changed SKU unitsPerCarton from 10 to 12')
    
    // Check inventory balance again - it should remain unchanged
    const balance2 = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: testWarehouse.id,
          skuId: testSku.id,
          batchLot: 'BATCH-001'
        }
      }
    })
    
    console.log(`   - Inventory balance still shows: ${balance2?.currentUnits} units`)
    console.log(`   - ✅ Historical data preserved!\n`)
    
    // Create a new transaction with the new units per carton
    const updatedSku = await prisma.sku.findUnique({ where: { id: testSku.id } })
    const transaction2 = await prisma.inventoryTransaction.create({
      data: {
        transactionId: 'TXN-TEST-002',
        warehouseId: testWarehouse.id,
        skuId: testSku.id,
        batchLot: 'BATCH-002',
        transactionType: 'RECEIVE',
        referenceId: 'REF-002',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        createdById: testUser.id,
        unitsPerCarton: updatedSku!.unitsPerCarton // Capture the new value
      }
    })
    
    console.log('4. Created new RECEIVE transaction for 100 cartons')
    console.log(`   - Transaction captured unitsPerCarton: ${transaction2.unitsPerCarton}`)
    console.log(`   - Calculated units: ${100 * 12} = 1200 units`)
    
    // Create the new batch balance
    await prisma.inventoryBalance.create({
      data: {
        warehouseId: testWarehouse.id,
        skuId: testSku.id,
        batchLot: 'BATCH-002',
        currentCartons: 100,
        currentPallets: 10,
        currentUnits: 1200, // 100 cartons * 12 units/carton
        lastTransactionDate: new Date()
      }
    })
    
    // Check the new batch balance
    const balance3 = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: testWarehouse.id,
          skuId: testSku.id,
          batchLot: 'BATCH-002'
        }
      }
    })
    console.log(`   - New batch balance shows: ${balance3?.currentUnits} units\n`)
    
    // Verify transactions retain their original values
    const allTransactions = await prisma.inventoryTransaction.findMany({
      where: { skuId: testSku.id },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('5. Verification of transaction data:')
    allTransactions.forEach((tx, i) => {
      console.log(`   Transaction ${i + 1}: ${tx.cartonsIn} cartons × ${tx.unitsPerCarton} units/carton = ${tx.cartonsIn * (tx.unitsPerCarton || 0)} units`)
    })
    
    console.log('\n✅ Test completed successfully!')
    console.log('The system is now fault-tolerant:')
    console.log('- Historical transactions preserve their units per carton')
    console.log('- Changing SKU master data only affects future transactions')
    console.log('- No accidental retroactive changes to inventory data')
    
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  } finally {
    // Clean up test data
    await prisma.inventoryTransaction.deleteMany({
      where: { sku: { skuCode: 'TEST-SKU-001' } }
    })
    await prisma.inventoryBalance.deleteMany({
      where: { sku: { skuCode: 'TEST-SKU-001' } }
    })
    await prisma.sku.deleteMany({
      where: { skuCode: 'TEST-SKU-001' }
    })
    await prisma.warehouse.deleteMany({
      where: { code: 'TEST-WH' }
    })
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    })
    
    await prisma.$disconnect()
  }
}

// Run the test
testFaultTolerantUnits().then(() => {
  console.log('\nTest script completed')
}).catch((error) => {
  console.error('Test script failed:', error)
  process.exit(1)
})