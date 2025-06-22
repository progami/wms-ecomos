#!/usr/bin/env node
import { PrismaClient, TransactionType } from '@prisma/client'
import { InventoryService } from '../src/lib/services/inventory-service.js'

const prisma = new PrismaClient()

async function setupTestData() {
  console.log('Setting up test data...')
  
  // Clean up existing test data
  await prisma.inventoryBalance.deleteMany({
    where: { batchLot: { startsWith: 'RACE-TEST-' } }
  })
  await prisma.inventoryTransaction.deleteMany({
    where: { batchLot: { startsWith: 'RACE-TEST-' } }
  })
  
  // Create test warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'TEST-RACE' },
    update: {},
    create: {
      name: 'Test Race Warehouse',
      code: 'TEST-RACE',
      address: '123 Test St',
      status: 'active'
    }
  })
  
  // Create test SKU
  const sku = await prisma.sku.upsert({
    where: { skuCode: 'TEST-RACE-SKU' },
    update: {},
    create: {
      skuCode: 'TEST-RACE-SKU',
      description: 'Test SKU for Race Conditions',
      unitsPerCarton: 10,
      status: 'active'
    }
  })
  
  // Create initial inventory
  await InventoryService.createTransaction({
    warehouseId: warehouse.id,
    skuId: sku.id,
    batchLot: 'RACE-TEST-001',
    transactionType: TransactionType.RECEIVE,
    cartonsIn: 100,
    cartonsOut: 0,
    storagePalletsIn: 2,
    shippingPalletsOut: 0,
    transactionDate: new Date(),
    storageCartonsPerPallet: 50,
    shippingCartonsPerPallet: 50
  }, 'SYSTEM')
  
  console.log('Test data setup complete')
  return { warehouse, sku }
}

async function testConcurrentShipments(warehouseId: string, skuId: string) {
  console.log('\n=== Testing Concurrent Shipments ===')
  console.log('Initial inventory: 100 cartons')
  console.log('Attempting 5 concurrent shipments of 30 cartons each (150 total)')
  
  const shipmentPromises = []
  
  for (let i = 0; i < 5; i++) {
    shipmentPromises.push(
      InventoryService.createTransaction({
        warehouseId,
        skuId,
        batchLot: 'RACE-TEST-001',
        transactionType: TransactionType.SHIP,
        cartonsIn: 0,
        cartonsOut: 30,
        storagePalletsIn: 0,
        shippingPalletsOut: 1,
        transactionDate: new Date()
      }, 'SYSTEM').catch(err => ({ error: err.message }))
    )
  }
  
  const results = await Promise.allSettled(shipmentPromises)
  
  const successful = results.filter(r => r.status === 'fulfilled' && !('error' in r.value)).length
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && 'error' in r.value)).length
  
  console.log(`Successful shipments: ${successful}`)
  console.log(`Failed shipments: ${failed}`)
  
  // Check final balance
  const balance = await prisma.inventoryBalance.findFirst({
    where: { warehouseId, skuId, batchLot: 'RACE-TEST-001' }
  })
  
  console.log(`Final inventory: ${balance?.currentCartons || 0} cartons`)
  console.log(`Expected: 0 or more (no negative inventory)`)
  console.log(`Result: ${balance?.currentCartons >= 0 ? 'PASS ✓' : 'FAIL ✗'}`)
  
  return balance?.currentCartons >= 0
}

async function testConcurrentAdjustments(warehouseId: string, skuId: string) {
  console.log('\n=== Testing Concurrent Adjustments ===')
  
  // Reset inventory to 100
  await prisma.inventoryBalance.update({
    where: {
      warehouseId_skuId_batchLot: {
        warehouseId,
        skuId,
        batchLot: 'RACE-TEST-001'
      }
    },
    data: { currentCartons: 100, currentUnits: 1000 }
  })
  
  console.log('Initial inventory: 100 cartons')
  console.log('Attempting 10 concurrent adjustments, each adding 5 cartons')
  
  const adjustmentPromises = []
  
  for (let i = 0; i < 10; i++) {
    adjustmentPromises.push(
      InventoryService.createTransaction({
        warehouseId,
        skuId,
        batchLot: 'RACE-TEST-001',
        transactionType: TransactionType.ADJUST_IN,
        cartonsIn: 5,
        cartonsOut: 0,
        storagePalletsIn: 0,
        shippingPalletsOut: 0,
        transactionDate: new Date()
      }, 'SYSTEM')
    )
  }
  
  await Promise.all(adjustmentPromises)
  
  // Check final balance
  const balance = await prisma.inventoryBalance.findFirst({
    where: { warehouseId, skuId, batchLot: 'RACE-TEST-001' }
  })
  
  console.log(`Final inventory: ${balance?.currentCartons || 0} cartons`)
  console.log(`Expected: 150 cartons (100 + 10*5)`)
  console.log(`Result: ${balance?.currentCartons === 150 ? 'PASS ✓' : 'FAIL ✗'}`)
  
  return balance?.currentCartons === 150
}

async function testBatchSplitting(warehouseId: string, skuId: string) {
  console.log('\n=== Testing Concurrent Batch Splitting ===')
  
  // Reset inventory
  await prisma.inventoryBalance.update({
    where: {
      warehouseId_skuId_batchLot: {
        warehouseId,
        skuId,
        batchLot: 'RACE-TEST-001'
      }
    },
    data: { currentCartons: 100, currentUnits: 1000 }
  })
  
  console.log('Initial inventory: 100 cartons in batch RACE-TEST-001')
  console.log('Attempting 3 concurrent splits of 40 cartons each')
  
  const splitPromises = []
  
  for (let i = 0; i < 3; i++) {
    splitPromises.push(
      (async () => {
        try {
          // Simulate batch splitting by creating adjustment transactions
          await InventoryService.createTransaction({
            warehouseId,
            skuId,
            batchLot: 'RACE-TEST-001',
            transactionType: TransactionType.ADJUST_OUT,
            cartonsIn: 0,
            cartonsOut: 40,
            storagePalletsIn: 0,
            shippingPalletsOut: 0,
            transactionDate: new Date()
          }, 'SYSTEM')
          
          await InventoryService.createTransaction({
            warehouseId,
            skuId,
            batchLot: `RACE-TEST-SPLIT-${i}`,
            transactionType: TransactionType.ADJUST_IN,
            cartonsIn: 40,
            cartonsOut: 0,
            storagePalletsIn: 1,
            shippingPalletsOut: 0,
            transactionDate: new Date()
          }, 'SYSTEM')
          
          return { success: true }
        } catch (err) {
          return { error: err.message }
        }
      })()
    )
  }
  
  const results = await Promise.allSettled(splitPromises)
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  
  console.log(`Successful splits: ${successful}`)
  console.log(`Expected: 2 (only 100 cartons available, 2*40=80)`)
  
  // Check total inventory
  const allBatches = await prisma.inventoryBalance.findMany({
    where: { warehouseId, skuId, batchLot: { startsWith: 'RACE-TEST-' } }
  })
  
  const totalCartons = allBatches.reduce((sum, b) => sum + b.currentCartons, 0)
  console.log(`Total inventory across all batches: ${totalCartons} cartons`)
  console.log(`Expected: 100 cartons (inventory conserved)`)
  console.log(`Result: ${totalCartons === 100 ? 'PASS ✓' : 'FAIL ✗'}`)
  
  return totalCartons === 100 && successful <= 2
}

async function main() {
  try {
    console.log('🔧 Testing Database Transaction Fixes for Race Conditions\n')
    
    const { warehouse, sku } = await setupTestData()
    
    const tests = [
      await testConcurrentShipments(warehouse.id, sku.id),
      await testConcurrentAdjustments(warehouse.id, sku.id),
      await testBatchSplitting(warehouse.id, sku.id)
    ]
    
    const passed = tests.filter(t => t).length
    const total = tests.length
    
    console.log('\n=== Summary ===')
    console.log(`Tests passed: ${passed}/${total}`)
    console.log(passed === total ? '✅ All tests passed!' : '❌ Some tests failed')
    
    // Cleanup
    await prisma.inventoryBalance.deleteMany({
      where: { batchLot: { startsWith: 'RACE-TEST-' } }
    })
    await prisma.inventoryTransaction.deleteMany({
      where: { batchLot: { startsWith: 'RACE-TEST-' } }
    })
    
  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()