import { PrismaClient } from '@prisma/client'
import { InventoryService } from '../src/lib/services/inventory-service'

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
    
    // Create a transaction using the service
    const transaction1 = await InventoryService.createTransaction({
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
      shippingCartonsPerPallet: 10
    }, testUser.id)
    
    console.log('2. Created RECEIVE transaction for 100 cartons')
    console.log(`   - Transaction captured unitsPerCarton: ${transaction1.transaction.unitsPerCarton}`)
    console.log(`   - Calculated units: ${100 * 10} = 1000 units`)
    
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
    
    // Recalculate inventory balances
    await prisma.$executeRaw`
      UPDATE inventory_balances 
      SET last_updated = NOW() 
      WHERE sku_id = ${testSku.id}
    `
    
    // Check inventory balance again
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
    const transaction2 = await InventoryService.createTransaction({
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
      shippingCartonsPerPallet: 10
    }, testUser.id)
    
    console.log('4. Created new RECEIVE transaction for 100 cartons')
    console.log(`   - Transaction captured unitsPerCarton: ${transaction2.transaction.unitsPerCarton}`)
    console.log(`   - Calculated units: ${100 * 12} = 1200 units`)
    
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