import { PrismaClient } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface CalculationError {
  type: string
  description: string
  expected: string | number
  actual: string | number
  difference: string | number
  context: any
}

async function validateCalculations() {
  console.log('🧮 Starting calculation validation...\n')
  const errors: CalculationError[] = []
  const startTime = Date.now()

  try {
    // 1. Validate inventory balances
    console.log('Validating inventory balances...')
    const inventoryBalances = await prisma.$queryRaw<Array<{
      sku: string
      warehouse_id: string
      transaction_total: string
      batch_total: string
    }>>`
      WITH transaction_totals AS (
        SELECT 
          sku,
          warehouse_id,
          SUM(CASE 
            WHEN type IN ('receipt', 'return', 'adjustment_add') THEN quantity
            WHEN type IN ('shipment', 'adjustment_remove') THEN -quantity
            ELSE 0
          END) as total
        FROM inventory_transactions
        GROUP BY sku, warehouse_id
      ),
      batch_totals AS (
        SELECT 
          sku,
          warehouse_id,
          SUM(current_quantity) as total
        FROM batch_records
        WHERE current_quantity > 0
        GROUP BY sku, warehouse_id
      )
      SELECT 
        COALESCE(t.sku, b.sku) as sku,
        COALESCE(t.warehouse_id, b.warehouse_id) as warehouse_id,
        COALESCE(t.total::text, '0') as transaction_total,
        COALESCE(b.total::text, '0') as batch_total
      FROM transaction_totals t
      FULL OUTER JOIN batch_totals b
        ON t.sku = b.sku AND t.warehouse_id = b.warehouse_id
      WHERE COALESCE(t.total, 0) != COALESCE(b.total, 0)
    `

    inventoryBalances.forEach(balance => {
      errors.push({
        type: 'Inventory Balance Mismatch',
        description: `SKU ${balance.sku} in warehouse ${balance.warehouse_id}`,
        expected: balance.batch_total,
        actual: balance.transaction_total,
        difference: new Decimal(balance.transaction_total).minus(balance.batch_total).toString(),
        context: balance
      })
    })

    // 2. Validate storage cost calculations
    console.log('Validating storage cost calculations...')
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['draft', 'sent', 'paid'] }
      },
      include: {
        lineItems: true,
        calculatedCosts: {
          include: {
            costRate: true
          }
        }
      }
    })

    for (const invoice of invoices) {
      let calculatedTotal = new Decimal(0)
      
      // Recalculate total from line items
      for (const item of invoice.lineItems) {
        const itemTotal = new Decimal(item.quantity).times(item.unitPrice)
        calculatedTotal = calculatedTotal.plus(itemTotal)
      }

      // Compare with stored total
      const storedTotal = new Decimal(invoice.totalAmount)
      if (!calculatedTotal.equals(storedTotal)) {
        errors.push({
          type: 'Invoice Total Mismatch',
          description: `Invoice ${invoice.invoiceNumber}`,
          expected: calculatedTotal.toString(),
          actual: storedTotal.toString(),
          difference: storedTotal.minus(calculatedTotal).toString(),
          context: {
            invoiceId: invoice.id,
            lineItems: invoice.lineItems.length
          }
        })
      }

      // Validate storage costs
      for (const cost of invoice.calculatedCosts) {
        if (cost.costType === 'storage' && cost.costRate) {
          const expectedCost = new Decimal(cost.quantity)
            .times(cost.costRate.rate)
            .times(cost.weeks || 1)
            
          const actualCost = new Decimal(cost.totalCost)
          
          if (!expectedCost.equals(actualCost)) {
            errors.push({
              type: 'Storage Cost Calculation Error',
              description: `SKU ${cost.sku} in invoice ${invoice.invoiceNumber}`,
              expected: expectedCost.toString(),
              actual: actualCost.toString(),
              difference: actualCost.minus(expectedCost).toString(),
              context: {
                sku: cost.sku,
                quantity: cost.quantity,
                rate: cost.costRate.rate,
                weeks: cost.weeks
              }
            })
          }
        }
      }
    }

    // 3. Validate batch quantity tracking
    console.log('Validating batch quantity tracking...')
    const batches = await prisma.batchRecord.findMany({
      where: {
        currentQuantity: { gt: 0 }
      }
    })

    for (const batch of batches) {
      // Get all transactions for this batch
      const transactions = await prisma.inventoryTransaction.findMany({
        where: {
          batchId: batch.id
        }
      })

      let calculatedQuantity = new Decimal(batch.receivedQuantity)
      
      for (const tx of transactions) {
        if (tx.type === 'shipment' || tx.type === 'adjustment_remove') {
          calculatedQuantity = calculatedQuantity.minus(tx.quantity)
        } else if (tx.type === 'return' || tx.type === 'adjustment_add') {
          calculatedQuantity = calculatedQuantity.plus(tx.quantity)
        }
      }

      if (!calculatedQuantity.equals(batch.currentQuantity)) {
        errors.push({
          type: 'Batch Quantity Tracking Error',
          description: `Batch ${batch.batchNumber} (${batch.sku})`,
          expected: calculatedQuantity.toString(),
          actual: batch.currentQuantity.toString(),
          difference: new Decimal(batch.currentQuantity).minus(calculatedQuantity).toString(),
          context: {
            batchId: batch.id,
            receivedQuantity: batch.receivedQuantity,
            transactionCount: transactions.length
          }
        })
      }
    }

    // 4. Validate cost rate application
    console.log('Validating cost rate applications...')
    const costRates = await prisma.costRate.findMany({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' }
    })

    // Check for overlapping active rates
    const ratesByTypeAndWarehouse = new Map<string, typeof costRates>()
    
    for (const rate of costRates) {
      const key = `${rate.type}-${rate.warehouseId}`
      if (!ratesByTypeAndWarehouse.has(key)) {
        ratesByTypeAndWarehouse.set(key, [])
      }
      ratesByTypeAndWarehouse.get(key)!.push(rate)
    }

    for (const [key, rates] of ratesByTypeAndWarehouse) {
      if (rates.length > 1) {
        // Check for overlapping date ranges
        rates.sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())
        
        for (let i = 0; i < rates.length - 1; i++) {
          const current = rates[i]
          const next = rates[i + 1]
          
          if (current.effectiveTo && current.effectiveTo > next.effectiveFrom) {
            errors.push({
              type: 'Overlapping Cost Rates',
              description: `${current.type} rates in warehouse ${current.warehouseId}`,
              expected: 'Non-overlapping date ranges',
              actual: 'Overlapping date ranges',
              difference: 'N/A',
              context: {
                rate1: { id: current.id, from: current.effectiveFrom, to: current.effectiveTo },
                rate2: { id: next.id, from: next.effectiveFrom, to: next.effectiveTo }
              }
            })
          }
        }
      }
    }

    // Generate report
    const endTime = Date.now()
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(endTime - startTime) / 1000}s`,
      totalErrors: errors.length,
      errorsByType: errors.reduce((acc, err) => {
        acc[err.type] = (acc[err.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      errors: errors
    }

    // Save report
    const reportPath = join(__dirname, '../../reports', `calculation-validation-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Console output
    console.log('\n📊 Calculation Validation Complete')
    console.log('===================================')
    console.log(`Duration: ${report.duration}`)
    console.log(`Total Errors: ${report.totalErrors}`)
    console.log('\nErrors by Type:')
    Object.entries(report.errorsByType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`)
    })
    console.log(`\nReport saved to: ${reportPath}`)

    if (report.totalErrors > 0) {
      console.log('\n⚠️  CALCULATION ERRORS FOUND! Review and fix before production.')
      process.exit(1)
    } else {
      console.log('\n✅ All calculations validated successfully!')
    }

  } catch (error) {
    console.error('Error during calculation validation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateCalculations()