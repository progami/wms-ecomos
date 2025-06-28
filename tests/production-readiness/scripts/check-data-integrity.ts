import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface IntegrityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  affectedRecords: number
  details?: any
}

async function checkDataIntegrity() {
  console.log('🔍 Starting data integrity check...\n')
  const issues: IntegrityIssue[] = []
  const startTime = Date.now()

  try {
    // 1. Check for orphaned inventory transactions
    console.log('Checking orphaned inventory transactions...')
    const orphanedTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        OR: [
          { warehouse: null },
          { createdBy: null }
        ]
      },
      select: {
        id: true,
        sku: true,
        warehouseId: true,
        createdById: true
      }
    })

    if (orphanedTransactions.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Orphaned Records',
        description: 'Inventory transactions without valid warehouse or user references',
        affectedRecords: orphanedTransactions.length,
        details: orphanedTransactions.slice(0, 5)
      })
    }

    // 2. Check for SKUs without warehouse
    console.log('Checking SKUs without warehouse...')
    const orphanedSkus = await prisma.sku.findMany({
      where: { warehouse: null },
      select: { id: true, sku: true, warehouseId: true }
    })

    if (orphanedSkus.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Orphaned Records',
        description: 'SKUs without valid warehouse references',
        affectedRecords: orphanedSkus.length
      })
    }

    // 3. Check for negative inventory
    console.log('Checking for negative inventory...')
    const negativeInventory = await prisma.$queryRaw<Array<{ 
      sku: string
      warehouse_id: string
      total_quantity: number 
    }>>`
      SELECT 
        sku,
        warehouse_id,
        SUM(CASE 
          WHEN type IN ('receipt', 'return', 'adjustment_add') THEN quantity
          WHEN type IN ('shipment', 'adjustment_remove') THEN -quantity
          ELSE 0
        END) as total_quantity
      FROM inventory_transactions
      GROUP BY sku, warehouse_id
      HAVING SUM(CASE 
        WHEN type IN ('receipt', 'return', 'adjustment_add') THEN quantity
        WHEN type IN ('shipment', 'adjustment_remove') THEN -quantity
        ELSE 0
      END) < 0
    `

    if (negativeInventory.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Data Consistency',
        description: 'SKUs with negative inventory balance',
        affectedRecords: negativeInventory.length,
        details: negativeInventory
      })
    }

    // 4. Check batch records consistency
    console.log('Checking batch records consistency...')
    const inconsistentBatches = await prisma.$queryRaw<Array<{
      batch_id: string
      received_quantity: number
      current_quantity: number
    }>>`
      SELECT 
        id as batch_id,
        received_quantity,
        current_quantity
      FROM batch_records
      WHERE current_quantity > received_quantity
    `

    if (inconsistentBatches.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Data Consistency',
        description: 'Batch records with current quantity exceeding received quantity',
        affectedRecords: inconsistentBatches.length
      })
    }

    // 5. Check for invoices without line items
    console.log('Checking invoices without line items...')
    const emptyInvoices = await prisma.invoice.findMany({
      where: {
        lineItems: {
          none: {}
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true
      }
    })

    if (emptyInvoices.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Data Completeness',
        description: 'Invoices without any line items',
        affectedRecords: emptyInvoices.length,
        details: emptyInvoices.slice(0, 5)
      })
    }

    // 6. Check for duplicate SKU codes within warehouses
    console.log('Checking for duplicate SKUs...')
    const duplicateSkus = await prisma.$queryRaw<Array<{
      sku: string
      warehouse_id: string
      count: number
    }>>`
      SELECT sku, warehouse_id, COUNT(*) as count
      FROM skus
      GROUP BY sku, warehouse_id
      HAVING COUNT(*) > 1
    `

    if (duplicateSkus.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Data Uniqueness',
        description: 'Duplicate SKU codes within the same warehouse',
        affectedRecords: duplicateSkus.length,
        details: duplicateSkus
      })
    }

    // 7. Check reconciliation status consistency
    console.log('Checking reconciliation consistency...')
    const pendingReconWithResolvedInvoices = await prisma.invoiceReconciliation.findMany({
      where: {
        status: 'pending',
        invoice: {
          status: 'paid'
        }
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            status: true
          }
        }
      }
    })

    if (pendingReconWithResolvedInvoices.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'Status Consistency',
        description: 'Pending reconciliations for paid invoices',
        affectedRecords: pendingReconWithResolvedInvoices.length
      })
    }

    // 8. Check for cost rates without warehouses
    console.log('Checking cost rates integrity...')
    const orphanedCostRates = await prisma.costRate.findMany({
      where: { warehouse: null },
      select: { id: true, type: true, warehouseId: true }
    })

    if (orphanedCostRates.length > 0) {
      issues.push({
        severity: 'high',
        category: 'Orphaned Records',
        description: 'Cost rates without valid warehouse references',
        affectedRecords: orphanedCostRates.length
      })
    }

    // 9. Check transaction date consistency
    console.log('Checking transaction dates...')
    const futureDatedTransactions = await prisma.inventoryTransaction.count({
      where: {
        transactionDate: {
          gt: new Date()
        }
      }
    })

    if (futureDatedTransactions > 0) {
      issues.push({
        severity: 'medium',
        category: 'Data Validation',
        description: 'Inventory transactions with future dates',
        affectedRecords: futureDatedTransactions
      })
    }

    // 10. Check for users without warehouses (except admin)
    console.log('Checking user-warehouse assignments...')
    const unassignedUsers = await prisma.user.findMany({
      where: {
        role: 'staff',
        warehouseId: null
      },
      select: {
        id: true,
        email: true,
        fullName: true
      }
    })

    if (unassignedUsers.length > 0) {
      issues.push({
        severity: 'low',
        category: 'Configuration',
        description: 'Staff users without warehouse assignments',
        affectedRecords: unassignedUsers.length,
        details: unassignedUsers
      })
    }

    // Generate report
    const endTime = Date.now()
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(endTime - startTime) / 1000}s`,
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
    }

    // Save report
    const reportPath = join(__dirname, '../../reports', `data-integrity-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Console output
    console.log('\n📊 Data Integrity Check Complete')
    console.log('================================')
    console.log(`Duration: ${report.duration}`)
    console.log(`Total Issues: ${report.totalIssues}`)
    console.log(`- Critical: ${report.criticalIssues}`)
    console.log(`- High: ${report.highIssues}`)
    console.log(`- Medium: ${report.mediumIssues}`)
    console.log(`- Low: ${report.lowIssues}`)
    console.log(`\nReport saved to: ${reportPath}`)

    if (report.criticalIssues > 0) {
      console.log('\n⚠️  CRITICAL ISSUES FOUND! Resolve before going to production.')
      process.exit(1)
    }

  } catch (error) {
    console.error('Error during integrity check:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkDataIntegrity()