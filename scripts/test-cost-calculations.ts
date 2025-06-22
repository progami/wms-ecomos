#!/usr/bin/env node

/**
 * Test script for cost calculation system
 * This script creates test transactions and verifies that costs are calculated correctly
 */

import { prisma } from '../src/lib/prisma'
import { InventoryService } from '../src/lib/services/inventory-service'
import { CostCalculationService } from '../src/lib/services/cost-calculation-service'
import { TransactionType } from '@prisma/client'

async function testCostCalculations() {
  console.log('=== Testing Cost Calculation System ===')
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  try {
    // Get test data
    const warehouse = await prisma.warehouse.findFirst({
      where: { isActive: true }
    })
    
    if (!warehouse) {
      throw new Error('No active warehouse found')
    }
    
    const sku = await prisma.sku.findFirst({
      where: { isActive: true }
    })
    
    if (!sku) {
      throw new Error('No active SKU found')
    }
    
    const user = await prisma.user.findFirst({
      where: { role: 'admin' }
    })
    
    if (!user) {
      throw new Error('No admin user found')
    }
    
    console.log(`Using warehouse: ${warehouse.name} (${warehouse.code})`)
    console.log(`Using SKU: ${sku.skuCode} - ${sku.description}`)
    console.log(`Using user: ${user.fullName}\n`)
    
    // Test 1: Create a RECEIVE transaction
    console.log('Test 1: Creating RECEIVE transaction...')
    const receiveTransaction = await InventoryService.createTransaction(
      {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-BATCH-001',
        transactionType: TransactionType.RECEIVE,
        referenceId: 'TEST-PO-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
      },
      user.id
    )
    console.log(`✓ Created transaction: ${receiveTransaction.transaction.transactionId}`)
    
    // Wait a moment for async cost calculation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check if costs were calculated
    const receiveCosts = await prisma.calculatedCost.findMany({
      where: {
        transactionReferenceId: receiveTransaction.transaction.transactionId
      },
      include: {
        costRate: true
      }
    })
    
    if (receiveCosts.length > 0) {
      console.log(`✓ Found ${receiveCosts.length} calculated costs:`)
      receiveCosts.forEach(cost => {
        console.log(`  - ${cost.costRate.costCategory}: ${cost.costRate.costName} = $${cost.calculatedCost}`)
      })
    } else {
      console.log('✗ No costs calculated for RECEIVE transaction')
    }
    
    // Test 2: Create a SHIP transaction
    console.log('\nTest 2: Creating SHIP transaction...')
    const shipTransaction = await InventoryService.createTransaction(
      {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-BATCH-001',
        transactionType: TransactionType.SHIP,
        referenceId: 'TEST-SO-001',
        cartonsIn: 0,
        cartonsOut: 50,
        storagePalletsIn: 0,
        shippingPalletsOut: 5,
        transactionDate: new Date(),
        shippingCartonsPerPallet: 10,
      },
      user.id
    )
    console.log(`✓ Created transaction: ${shipTransaction.transaction.transactionId}`)
    
    // Wait for async cost calculation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check if costs were calculated
    const shipCosts = await prisma.calculatedCost.findMany({
      where: {
        transactionReferenceId: shipTransaction.transaction.transactionId
      },
      include: {
        costRate: true
      }
    })
    
    if (shipCosts.length > 0) {
      console.log(`✓ Found ${shipCosts.length} calculated costs:`)
      shipCosts.forEach(cost => {
        console.log(`  - ${cost.costRate.costCategory}: ${cost.costRate.costName} = $${cost.calculatedCost}`)
      })
    } else {
      console.log('✗ No costs calculated for SHIP transaction')
    }
    
    // Test 3: Test weekly storage calculation
    console.log('\nTest 3: Testing weekly storage calculation...')
    const result = await CostCalculationService.calculateWeeklyStorageCosts(
      new Date(),
      user.id,
      warehouse.id
    )
    console.log(`✓ Weekly storage calculation completed: ${result.processed} processed, ${result.errors} errors`)
    
    // Check storage ledger
    const storageLedger = await prisma.storageLedger.findMany({
      where: {
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-BATCH-001'
      },
      orderBy: { weekEndingDate: 'desc' },
      take: 1
    })
    
    if (storageLedger.length > 0) {
      const entry = storageLedger[0]
      console.log(`✓ Storage ledger entry found:`)
      console.log(`  - Week ending: ${entry.weekEndingDate.toLocaleDateString()}`)
      console.log(`  - Cartons: ${entry.cartonsEndOfMonday}`)
      console.log(`  - Pallets charged: ${entry.storagePalletsCharged}`)
      console.log(`  - Weekly cost: $${entry.calculatedWeeklyCost}`)
    } else {
      console.log('✗ No storage ledger entry found')
    }
    
    // Test 4: Test reconciliation preparation
    console.log('\nTest 4: Testing reconciliation preparation...')
    
    // First, check if we have cost rates
    const costRates = await prisma.costRate.findMany({
      where: { warehouseId: warehouse.id },
      take: 5
    })
    
    if (costRates.length === 0) {
      console.log('⚠ No cost rates found for warehouse. Please set up cost rates first.')
    } else {
      console.log(`✓ Found ${costRates.length} cost rates`)
    }
    
    // Summary
    console.log('\n=== Test Summary ===')
    const totalCosts = await prisma.calculatedCost.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    })
    console.log(`Total costs calculated in last 5 minutes: ${totalCosts}`)
    
    // Cleanup test data (optional)
    const cleanup = process.argv.includes('--cleanup')
    if (cleanup) {
      console.log('\nCleaning up test data...')
      
      // Delete test transactions
      await prisma.inventoryTransaction.deleteMany({
        where: {
          referenceId: { in: ['TEST-PO-001', 'TEST-SO-001'] }
        }
      })
      
      // Delete test calculated costs
      await prisma.calculatedCost.deleteMany({
        where: {
          transactionReferenceId: { 
            in: [receiveTransaction.transaction.transactionId, shipTransaction.transaction.transactionId] 
          }
        }
      })
      
      // Delete test storage ledger entries
      await prisma.storageLedger.deleteMany({
        where: {
          batchLot: 'TEST-BATCH-001'
        }
      })
      
      // Delete test inventory balance
      await prisma.inventoryBalance.deleteMany({
        where: {
          batchLot: 'TEST-BATCH-001'
        }
      })
      
      console.log('✓ Test data cleaned up')
    } else {
      console.log('\nNote: Test data was not cleaned up. Run with --cleanup to remove test data.')
    }
    
    console.log('\n✓ Cost calculation system test completed successfully!')
    
  } catch (error) {
    console.error('\n✗ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testCostCalculations()
}

export { testCostCalculations }