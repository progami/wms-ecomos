import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Function to generate transaction IDs
function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Setup test data function
async function setupTestData() {
  const user = await prisma.user.create({
    data: {
      email: 'test-concurrency@example.com',
      fullName: 'Test Concurrency User',
      passwordHash: 'dummy',
      role: 'admin'
    }
  })
  
  const warehouse = await prisma.warehouse.create({
    data: {
      code: 'TEST-CONC',
      name: 'Test Concurrency Warehouse',
      isActive: true
    }
  })
  
  const sku = await prisma.sku.create({
    data: {
      skuCode: 'TEST-CONC-001',
      description: 'Test Concurrency Product',
      packSize: 1,
      unitsPerCarton: 10,
      isActive: true
    }
  })
  
  return { user, warehouse, sku }
}

// Cleanup test data function
async function cleanupTestData() {
  await prisma.inventoryTransaction.deleteMany({
    where: { sku: { skuCode: { startsWith: 'TEST-CONC' } } }
  })
  await prisma.inventoryBalance.deleteMany({
    where: { sku: { skuCode: { startsWith: 'TEST-CONC' } } }
  })
  await prisma.sku.deleteMany({
    where: { skuCode: { startsWith: 'TEST-CONC' } }
  })
  await prisma.warehouse.deleteMany({
    where: { code: 'TEST-CONC' }
  })
  await prisma.user.deleteMany({
    where: { email: 'test-concurrency@example.com' }
  })
}

// Main test function
async function testConcurrentTransactions() {
  console.log('🧪 Testing concurrent transaction handling with advisory locks...\n')
  
  let testsPassed = 0
  let testsFailed = 0
  
  try {
    // Clean up test data
    await cleanupTestData()
    
    // Setup test data
    const { user, warehouse, sku } = await setupTestData()
    
    // Create initial inventory using direct insert
    const initialTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionId: generateTransactionId(),
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-CONC',
        transactionType: 'RECEIVE',
        referenceId: 'REF-CONC-INIT',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: user.id,
        unitsPerCarton: sku.unitsPerCarton
      }
    })
    
    // Create initial balance
    await prisma.inventoryBalance.create({
      data: {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-CONC',
        currentCartons: 100,
        currentPallets: 10,
        currentUnits: 100 * sku.unitsPerCarton,
        lastTransactionDate: new Date(),
        version: 1
      }
    })
    
    console.log('Initial inventory created: 100 cartons')
    
    // Try concurrent shipments using raw transaction handling
    console.log('Attempting 5 concurrent shipments of 20 cartons each...')
    
    const shipmentPromises = Array(5).fill(null).map(async (_, i) => {
      try {
        // Use a transaction with advisory lock
        return await prisma.$transaction(async (tx: any) => {
          // Try to get advisory lock - this is the key to preventing race conditions
          const lockString = `${warehouse.id.replace(/-/g, '').slice(0, 8)}${sku.id.replace(/-/g, '').slice(0, 8)}`.slice(0, 15)
          const lockKey = BigInt('0x' + lockString)
          
          const lockResult = await tx.$queryRaw<[{ pg_try_advisory_xact_lock: boolean }]>`
            SELECT pg_try_advisory_xact_lock(${lockKey}::bigint)
          `
          
          if (!lockResult[0]?.pg_try_advisory_xact_lock) {
            throw new Error('Could not acquire lock')
          }
          
          // Get current balance with FOR UPDATE lock
          const balances = await tx.$queryRaw<any[]>`
            SELECT * FROM "inventory_balances" 
            WHERE "warehouse_id" = ${warehouse.id} 
            AND "sku_id" = ${sku.id} 
            AND "batch_lot" = ${'BATCH-CONC'}
            FOR UPDATE
          `
          
          const balance = balances[0]
          
          if (!balance || balance.current_cartons < 20) {
            throw new Error('Insufficient inventory')
          }
          
          // Create shipment transaction
          const transaction = await tx.inventoryTransaction.create({
            data: {
              transactionId: generateTransactionId(),
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'BATCH-CONC',
              transactionType: 'SHIP',
              referenceId: `REF-CONC-SHIP-${i}`,
              cartonsIn: 0,
              cartonsOut: 20,
              storagePalletsIn: 0,
              shippingPalletsOut: 2,
              transactionDate: new Date(),
              createdById: user.id,
              unitsPerCarton: sku.unitsPerCarton
            }
          })
          
          // Update balance
          await tx.inventoryBalance.update({
            where: {
              warehouseId_skuId_batchLot: {
                warehouseId: warehouse.id,
                skuId: sku.id,
                batchLot: 'BATCH-CONC'
              }
            },
            data: {
              currentCartons: balance.current_cartons - 20,
              currentPallets: Math.ceil((balance.current_cartons - 20) / 10),
              currentUnits: (balance.current_cartons - 20) * sku.unitsPerCarton,
              lastTransactionDate: new Date(),
              version: { increment: 1 }
            }
          })
          
          return { success: true, shipment: i }
        }, {
          isolationLevel: 'Serializable' as any,
          timeout: 10000
        })
      } catch (error: any) {
        return { success: false, shipment: i, error: error.message }
      }
    })
    
    const results = await Promise.all(shipmentPromises)
    
    // Count successful and failed transactions
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`\nResults: ${successful} succeeded, ${failed} failed`)
    
    // Log details of failed transactions
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - Shipment ${r.shipment} failed: ${(r as any).error}`)
    })
    
    // Verify final balance
    const finalBalance = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-CONC'
        }
      }
    })
    
    console.log(`\nFinal inventory: ${finalBalance?.currentCartons} cartons`)
    console.log(`Version: ${finalBalance?.version} (should be ${successful + 1})`)
    
    // Validate results
    if (!finalBalance || finalBalance.currentCartons < 0) {
      console.error('❌ Inventory went negative - race condition occurred!')
      testsFailed++
    } else if (finalBalance.currentCartons !== 100 - (successful * 20)) {
      console.error(`❌ Unexpected final carton count: ${finalBalance.currentCartons}`)
      testsFailed++
    } else if (finalBalance.version !== successful + 1) {
      console.error(`❌ Version mismatch: expected ${successful + 1}, got ${finalBalance.version}`)
      testsFailed++
    } else {
      console.log('✅ Concurrent transactions handled correctly')
      testsPassed++
    }
    
    // Test race condition without proper locking (for comparison)
    console.log('\n\nTesting WITHOUT advisory locks (should show race conditions)...')
    
    // Reset inventory
    await prisma.inventoryBalance.update({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-CONC'
        }
      },
      data: {
        currentCartons: 100,
        currentPallets: 10,
        currentUnits: 100 * sku.unitsPerCarton,
        version: 1
      }
    })
    
    // Try concurrent updates without advisory locks
    const unsafePromises = Array(5).fill(null).map(async (_, i) => {
      try {
        // Get current balance (without lock)
        const balance = await prisma.inventoryBalance.findUnique({
          where: {
            warehouseId_skuId_batchLot: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'BATCH-CONC'
            }
          }
        })
        
        if (!balance || balance.currentCartons < 20) {
          throw new Error('Insufficient inventory')
        }
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        
        // Update balance (this can cause race conditions)
        await prisma.inventoryBalance.update({
          where: {
            warehouseId_skuId_batchLot: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: 'BATCH-CONC'
            }
          },
          data: {
            currentCartons: balance.currentCartons - 20,
            currentPallets: Math.ceil((balance.currentCartons - 20) / 10),
            currentUnits: (balance.currentCartons - 20) * sku.unitsPerCarton
          }
        })
        
        return { success: true, shipment: i }
      } catch (error: any) {
        return { success: false, shipment: i, error: error.message }
      }
    })
    
    const unsafeResults = await Promise.all(unsafePromises)
    const unsafeSuccessful = unsafeResults.filter(r => r.success).length
    
    const unsafeFinalBalance = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-CONC'
        }
      }
    })
    
    console.log(`\nWithout locks - Final inventory: ${unsafeFinalBalance?.currentCartons} cartons`)
    console.log(`Expected: ${100 - (unsafeSuccessful * 20)} cartons`)
    
    if (unsafeFinalBalance && unsafeFinalBalance.currentCartons !== 100 - (unsafeSuccessful * 20)) {
      console.log('⚠️  Race condition detected - inventory count is incorrect')
      console.log('This demonstrates why advisory locks are necessary')
    }
    
    console.log(`\n\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`)
    
  } catch (error) {
    console.error('Test failed:', error)
    testsFailed++
  } finally {
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

// Run the test
testConcurrentTransactions().then(() => {
  console.log('\n✅ Concurrency test completed')
}).catch((error) => {
  console.error('\n❌ Concurrency test failed:', error)
  process.exit(1)
})