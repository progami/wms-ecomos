#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { CostCalculationService } from '../src/lib/services/cost-calculation-service'

const prisma = new PrismaClient()

async function testReconciliation() {
  try {
    console.log('🔍 Testing Reconciliation Workflow...\n')

    // Get a test warehouse
    const warehouse = await prisma.warehouse.findFirst({
      where: { isActive: true }
    })

    if (!warehouse) {
      console.error('❌ No active warehouse found')
      return
    }

    console.log(`✅ Using warehouse: ${warehouse.name} (${warehouse.code})`)

    // Define test billing period (last month)
    const now = new Date()
    const billingPeriod = {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 16),
      end: new Date(now.getFullYear(), now.getMonth(), 15)
    }

    console.log(`📅 Billing Period: ${billingPeriod.start.toDateString()} - ${billingPeriod.end.toDateString()}`)

    // Get transactions in this period
    const transactions = await prisma.inventoryTransaction.count({
      where: {
        warehouseId: warehouse.id,
        transactionDate: {
          gte: billingPeriod.start,
          lte: billingPeriod.end
        }
      }
    })

    console.log(`📦 Found ${transactions} transactions in period`)

    // Calculate costs
    console.log('\n💰 Calculating costs...')
    
    // Get a test user (admin)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!adminUser) {
      console.error('❌ No admin user found')
      return
    }

    await CostCalculationService.calculateAndStoreCosts(
      warehouse.id,
      billingPeriod,
      adminUser.id
    )

    // Get calculated costs summary
    const summary = await CostCalculationService.getCalculatedCostsForReconciliation(
      warehouse.id,
      billingPeriod
    )

    console.log('\n📊 Cost Summary:')
    console.log('================')
    
    let totalAmount = 0
    const costsByCategory: Record<string, number> = {}

    for (const cost of summary) {
      console.log(`\n${cost.costCategory} - ${cost.costName}:`)
      console.log(`  Quantity: ${cost.totalQuantity}`)
      console.log(`  Unit Rate: $${cost.unitRate}`)
      console.log(`  Total: $${cost.totalAmount.toFixed(2)}`)
      console.log(`  Calculated Cost IDs: ${cost.calculatedCostIds.length} records`)
      
      totalAmount += cost.totalAmount
      
      if (!costsByCategory[cost.costCategory]) {
        costsByCategory[cost.costCategory] = 0
      }
      costsByCategory[cost.costCategory] += cost.totalAmount
    }

    console.log('\n💵 Total by Category:')
    console.log('====================')
    for (const [category, amount] of Object.entries(costsByCategory)) {
      console.log(`${category}: $${amount.toFixed(2)}`)
    }
    
    console.log(`\n🏷️  Grand Total: $${totalAmount.toFixed(2)}`)

    // Check if we have any invoices for this period
    const invoice = await prisma.invoice.findFirst({
      where: {
        warehouseId: warehouse.id,
        billingPeriodStart: {
          gte: billingPeriod.start
        },
        billingPeriodEnd: {
          lte: billingPeriod.end
        }
      },
      include: {
        lineItems: true
      }
    })

    if (invoice) {
      console.log(`\n📄 Found Invoice: ${invoice.invoiceNumber}`)
      console.log(`   Total Amount: $${invoice.totalAmount}`)
      console.log(`   Line Items: ${invoice.lineItems.length}`)
      console.log(`   Status: ${invoice.status}`)
      
      // Show variance
      const variance = Number(invoice.totalAmount) - totalAmount
      console.log(`\n🔍 Variance: $${Math.abs(variance).toFixed(2)} ${variance > 0 ? '(Overbilled)' : variance < 0 ? '(Underbilled)' : '(Match)'}`)
    } else {
      console.log('\n📄 No invoice found for this period')
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testReconciliation().catch(console.error)