import { Prisma, CostCategory, ReconciliationStatus, InvoiceStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withTransaction, TransactionOptions } from '@/lib/database/transaction-utils'
import { auditLog } from '@/lib/security/audit-logger'
import { startOfDay, endOfDay } from 'date-fns'
import { z } from 'zod'

// Validation schemas
const invoiceReconciliationSchema = z.object({
  invoiceId: z.string().uuid(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
})

type InvoiceReconciliationInput = z.infer<typeof invoiceReconciliationSchema>

export class ReconciliationService {
  /**
   * Prepare invoice matching by calculating expected costs for the billing period
   */
  static async prepareInvoiceMatching(
    input: InvoiceReconciliationInput,
    userId: string
  ) {
    const validatedInput = invoiceReconciliationSchema.parse(input)
    
    return withTransaction(async (tx) => {
      // Get the invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: validatedInput.invoiceId },
        include: {
          warehouse: true,
          lineItems: true,
        }
      })
      
      if (!invoice) {
        throw new Error('Invoice not found')
      }
      
      // Get all calculated costs for the billing period
      const calculatedCosts = await tx.calculatedCost.findMany({
        where: {
          warehouseId: invoice.warehouseId,
          billingPeriodStart: {
            gte: startOfDay(validatedInput.billingPeriodStart),
            lte: endOfDay(validatedInput.billingPeriodStart),
          },
          billingPeriodEnd: {
            gte: startOfDay(validatedInput.billingPeriodEnd),
            lte: endOfDay(validatedInput.billingPeriodEnd),
          }
        },
        include: {
          costRate: true,
          sku: true,
        }
      })
      
      // Group calculated costs by category and name
      const expectedCosts = new Map<string, {
        category: CostCategory
        name: string
        quantity: Prisma.Decimal
        amount: Prisma.Decimal
        unitRate: Prisma.Decimal
      }>()
      
      for (const cost of calculatedCosts) {
        const key = `${cost.costRate.costCategory}-${cost.costRate.costName}`
        const existing = expectedCosts.get(key)
        
        if (existing) {
          existing.quantity = existing.quantity.add(cost.quantityCharged)
          existing.amount = existing.amount.add(cost.finalExpectedCost)
        } else {
          expectedCosts.set(key, {
            category: cost.costRate.costCategory,
            name: cost.costRate.costName,
            quantity: cost.quantityCharged,
            amount: cost.finalExpectedCost,
            unitRate: cost.applicableRate,
          })
        }
      }
      
      // Get storage ledger entries for the period
      const storageLedgerEntries = await tx.storageLedger.findMany({
        where: {
          warehouseId: invoice.warehouseId,
          billingPeriodStart: {
            gte: startOfDay(validatedInput.billingPeriodStart),
            lte: endOfDay(validatedInput.billingPeriodStart),
          },
          billingPeriodEnd: {
            gte: startOfDay(validatedInput.billingPeriodEnd),
            lte: endOfDay(validatedInput.billingPeriodEnd),
          }
        }
      })
      
      // Add storage costs to expected costs
      if (storageLedgerEntries.length > 0) {
        let totalStoragePallets = new Prisma.Decimal(0)
        let totalStorageCost = new Prisma.Decimal(0)
        let avgStorageRate = new Prisma.Decimal(0)
        
        for (const entry of storageLedgerEntries) {
          totalStoragePallets = totalStoragePallets.add(entry.storagePalletsCharged)
          totalStorageCost = totalStorageCost.add(entry.calculatedWeeklyCost)
        }
        
        if (totalStoragePallets.gt(0)) {
          avgStorageRate = totalStorageCost.div(totalStoragePallets)
        }
        
        expectedCosts.set(`${CostCategory.Storage}-Weekly Storage`, {
          category: CostCategory.Storage,
          name: 'Weekly Storage',
          quantity: totalStoragePallets,
          amount: totalStorageCost,
          unitRate: avgStorageRate,
        })
      }
      
      // Create reconciliation records
      const reconciliations = []
      
      // Match invoice line items with expected costs
      for (const lineItem of invoice.lineItems) {
        const key = `${lineItem.costCategory}-${lineItem.costName}`
        const expected = expectedCosts.get(key)
        
        if (expected) {
          // Found matching expected cost
          const difference = lineItem.amount.sub(expected.amount)
          
          const reconciliation = await tx.invoiceReconciliation.create({
            data: {
              invoiceId: invoice.id,
              costCategory: lineItem.costCategory,
              costName: lineItem.costName,
              expectedAmount: expected.amount,
              invoicedAmount: lineItem.amount,
              difference,
              expectedQuantity: expected.quantity,
              invoicedQuantity: lineItem.quantity,
              unitRate: lineItem.unitRate || expected.unitRate,
              status: difference.abs().lte(0.01) ? 
                ReconciliationStatus.matched : 
                ReconciliationStatus.variance,
            }
          })
          
          reconciliations.push(reconciliation)
          expectedCosts.delete(key)
        } else {
          // No expected cost for this line item
          const reconciliation = await tx.invoiceReconciliation.create({
            data: {
              invoiceId: invoice.id,
              costCategory: lineItem.costCategory,
              costName: lineItem.costName,
              expectedAmount: new Prisma.Decimal(0),
              invoicedAmount: lineItem.amount,
              difference: lineItem.amount,
              expectedQuantity: new Prisma.Decimal(0),
              invoicedQuantity: lineItem.quantity,
              unitRate: lineItem.unitRate,
              status: ReconciliationStatus.unmatched,
            }
          })
          
          reconciliations.push(reconciliation)
        }
      }
      
      // Create records for expected costs not on invoice
      for (const [key, expected] of expectedCosts) {
        const reconciliation = await tx.invoiceReconciliation.create({
          data: {
            invoiceId: invoice.id,
            costCategory: expected.category,
            costName: expected.name,
            expectedAmount: expected.amount,
            invoicedAmount: new Prisma.Decimal(0),
            difference: expected.amount.neg(),
            expectedQuantity: expected.quantity,
            invoicedQuantity: new Prisma.Decimal(0),
            unitRate: expected.unitRate,
            status: ReconciliationStatus.missing,
          }
        })
        
        reconciliations.push(reconciliation)
      }
      
      // Update invoice status
      const hasVariances = reconciliations.some(r => 
        r.status !== ReconciliationStatus.matched
      )
      
      if (hasVariances && invoice.status === InvoiceStatus.pending) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.reconciling }
        })
      }
      
      // Audit log
      await auditLog({
        entityType: 'InvoiceReconciliation',
        entityId: invoice.id,
        action: 'CREATE',
        userId,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          billingPeriod: `${validatedInput.billingPeriodStart.toISOString()} - ${validatedInput.billingPeriodEnd.toISOString()}`,
          reconciliationsCreated: reconciliations.length,
          matched: reconciliations.filter(r => r.status === ReconciliationStatus.matched).length,
          variances: reconciliations.filter(r => r.status === ReconciliationStatus.variance).length,
          unmatched: reconciliations.filter(r => r.status === ReconciliationStatus.unmatched).length,
          missing: reconciliations.filter(r => r.status === ReconciliationStatus.missing).length,
        }
      })
      
      return {
        invoice,
        reconciliations,
        summary: {
          totalExpected: reconciliations.reduce((sum, r) => sum.add(r.expectedAmount), new Prisma.Decimal(0)),
          totalInvoiced: reconciliations.reduce((sum, r) => sum.add(r.invoicedAmount), new Prisma.Decimal(0)),
          totalVariance: reconciliations.reduce((sum, r) => sum.add(r.difference.abs()), new Prisma.Decimal(0)),
          matchedCount: reconciliations.filter(r => r.status === ReconciliationStatus.matched).length,
          varianceCount: reconciliations.filter(r => r.status === ReconciliationStatus.variance).length,
          unmatchedCount: reconciliations.filter(r => r.status === ReconciliationStatus.unmatched).length,
          missingCount: reconciliations.filter(r => r.status === ReconciliationStatus.missing).length,
        }
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    })
  }
  
  /**
   * Calculate variance between expected and invoiced amounts
   */
  static async calculateVariance(
    invoiceId: string,
    costCategory: CostCategory,
    costName: string
  ) {
    const reconciliation = await prisma.invoiceReconciliation.findFirst({
      where: {
        invoiceId,
        costCategory,
        costName,
      }
    })
    
    if (!reconciliation) {
      throw new Error('Reconciliation record not found')
    }
    
    const variance = reconciliation.invoicedAmount.sub(reconciliation.expectedAmount)
    const variancePercentage = reconciliation.expectedAmount.gt(0) ?
      variance.div(reconciliation.expectedAmount).mul(100) :
      new Prisma.Decimal(100)
    
    return {
      reconciliation,
      variance,
      variancePercentage,
      isWithinTolerance: variance.abs().lte(reconciliation.expectedAmount.mul(0.05)), // 5% tolerance
    }
  }
  
  /**
   * Update reconciliation status and notes
   */
  static async updateReconciliationStatus(
    reconciliationId: string,
    status: ReconciliationStatus,
    resolutionNotes: string,
    suggestedAmount: number | null,
    userId: string
  ) {
    const reconciliation = await prisma.invoiceReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status,
        resolutionNotes,
        suggestedAmount: suggestedAmount ? new Prisma.Decimal(suggestedAmount) : null,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: {
        invoice: true,
      }
    })
    
    // Check if all reconciliations are resolved
    const unresolvedCount = await prisma.invoiceReconciliation.count({
      where: {
        invoiceId: reconciliation.invoiceId,
        status: {
          in: [ReconciliationStatus.variance, ReconciliationStatus.unmatched, ReconciliationStatus.missing]
        }
      }
    })
    
    // Update invoice status if all reconciliations are resolved
    if (unresolvedCount === 0) {
      await prisma.invoice.update({
        where: { id: reconciliation.invoiceId },
        data: { status: InvoiceStatus.reconciled }
      })
    }
    
    // Audit log
    await auditLog({
      entityType: 'InvoiceReconciliation',
      entityId: reconciliationId,
      action: 'UPDATE_STATUS',
      userId,
      data: {
        invoiceNumber: reconciliation.invoice.invoiceNumber,
        costCategory: reconciliation.costCategory,
        costName: reconciliation.costName,
        oldStatus: reconciliation.status,
        newStatus: status,
        resolutionNotes,
        suggestedAmount,
      }
    })
    
    return reconciliation
  }
  
  /**
   * Get reconciliation summary for an invoice
   */
  static async getReconciliationSummary(invoiceId: string) {
    const reconciliations = await prisma.invoiceReconciliation.findMany({
      where: { invoiceId },
      include: {
        resolvedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    })
    
    const summary = {
      total: reconciliations.length,
      matched: reconciliations.filter(r => r.status === ReconciliationStatus.matched).length,
      variance: reconciliations.filter(r => r.status === ReconciliationStatus.variance).length,
      unmatched: reconciliations.filter(r => r.status === ReconciliationStatus.unmatched).length,
      missing: reconciliations.filter(r => r.status === ReconciliationStatus.missing).length,
      resolved: reconciliations.filter(r => r.status === ReconciliationStatus.resolved).length,
      totalExpected: reconciliations.reduce((sum, r) => sum.add(r.expectedAmount), new Prisma.Decimal(0)),
      totalInvoiced: reconciliations.reduce((sum, r) => sum.add(r.invoicedAmount), new Prisma.Decimal(0)),
      totalVariance: reconciliations.reduce((sum, r) => sum.add(r.difference.abs()), new Prisma.Decimal(0)),
    }
    
    return {
      reconciliations,
      summary,
    }
  }
  
  /**
   * Auto-reconcile invoices based on tolerance thresholds
   */
  static async autoReconcileInvoices(
    warehouseId: string,
    tolerancePercentage: number = 5,
    userId: string
  ) {
    // Get all pending invoices for the warehouse
    const invoices = await prisma.invoice.findMany({
      where: {
        warehouseId,
        status: InvoiceStatus.reconciling,
      }
    })
    
    let autoReconciledCount = 0
    
    for (const invoice of invoices) {
      const reconciliations = await prisma.invoiceReconciliation.findMany({
        where: {
          invoiceId: invoice.id,
          status: ReconciliationStatus.variance,
        }
      })
      
      let allWithinTolerance = true
      
      for (const reconciliation of reconciliations) {
        const variancePercentage = reconciliation.expectedAmount.gt(0) ?
          reconciliation.difference.abs().div(reconciliation.expectedAmount).mul(100) :
          new Prisma.Decimal(100)
        
        if (variancePercentage.gt(tolerancePercentage)) {
          allWithinTolerance = false
          break
        }
      }
      
      if (allWithinTolerance && reconciliations.length > 0) {
        // Auto-resolve all variances within tolerance
        await prisma.invoiceReconciliation.updateMany({
          where: {
            invoiceId: invoice.id,
            status: ReconciliationStatus.variance,
          },
          data: {
            status: ReconciliationStatus.resolved,
            resolutionNotes: `Auto-reconciled: variance within ${tolerancePercentage}% tolerance`,
            resolvedById: userId,
            resolvedAt: new Date(),
          }
        })
        
        // Update invoice status
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.reconciled }
        })
        
        autoReconciledCount++
      }
    }
    
    // Audit log
    await auditLog({
      entityType: 'InvoiceReconciliation',
      entityId: 'AUTO_RECONCILE',
      action: 'AUTO_RECONCILE',
      userId,
      data: {
        warehouseId,
        tolerancePercentage,
        invoicesProcessed: invoices.length,
        invoicesReconciled: autoReconciledCount,
      }
    })
    
    return {
      processed: invoices.length,
      reconciled: autoReconciledCount,
    }
  }
  
  /**
   * Generate reconciliation report for a billing period
   */
  static async generateReconciliationReport(
    warehouseId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ) {
    const invoices = await prisma.invoice.findMany({
      where: {
        warehouseId,
        billingPeriodStart: {
          gte: startOfDay(billingPeriodStart),
          lte: endOfDay(billingPeriodStart),
        },
        billingPeriodEnd: {
          gte: startOfDay(billingPeriodEnd),
          lte: endOfDay(billingPeriodEnd),
        }
      },
      include: {
        reconciliations: true,
      }
    })
    
    const report = {
      warehouseId,
      billingPeriod: `${billingPeriodStart.toISOString()} - ${billingPeriodEnd.toISOString()}`,
      invoiceCount: invoices.length,
      totalInvoiced: invoices.reduce((sum, inv) => sum.add(inv.totalAmount), new Prisma.Decimal(0)),
      reconciliationSummary: {
        totalReconciliations: 0,
        matched: 0,
        variance: 0,
        unmatched: 0,
        missing: 0,
        resolved: 0,
        totalVariance: new Prisma.Decimal(0),
      },
      invoices: [] as any[],
    }
    
    for (const invoice of invoices) {
      const invoiceSummary = {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        reconciliations: {
          total: invoice.reconciliations.length,
          matched: invoice.reconciliations.filter(r => r.status === ReconciliationStatus.matched).length,
          variance: invoice.reconciliations.filter(r => r.status === ReconciliationStatus.variance).length,
          unmatched: invoice.reconciliations.filter(r => r.status === ReconciliationStatus.unmatched).length,
          missing: invoice.reconciliations.filter(r => r.status === ReconciliationStatus.missing).length,
          resolved: invoice.reconciliations.filter(r => r.status === ReconciliationStatus.resolved).length,
          totalVariance: invoice.reconciliations.reduce((sum, r) => sum.add(r.difference.abs()), new Prisma.Decimal(0)),
        }
      }
      
      report.invoices.push(invoiceSummary)
      
      // Update totals
      report.reconciliationSummary.totalReconciliations += invoice.reconciliations.length
      report.reconciliationSummary.matched += invoiceSummary.reconciliations.matched
      report.reconciliationSummary.variance += invoiceSummary.reconciliations.variance
      report.reconciliationSummary.unmatched += invoiceSummary.reconciliations.unmatched
      report.reconciliationSummary.missing += invoiceSummary.reconciliations.missing
      report.reconciliationSummary.resolved += invoiceSummary.reconciliations.resolved
      report.reconciliationSummary.totalVariance = report.reconciliationSummary.totalVariance.add(invoiceSummary.reconciliations.totalVariance)
    }
    
    return report
  }
}