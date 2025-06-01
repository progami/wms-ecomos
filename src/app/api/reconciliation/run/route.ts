import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/reconciliation/run - Run reconciliation for a period
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { warehouseId, period } = body

    // Parse period to get date range
    let startDate: Date
    let endDate: Date

    if (period) {
      const [year, month] = period.split('-')
      startDate = new Date(parseInt(year), parseInt(month) - 1, 16)
      endDate = new Date(parseInt(year), parseInt(month), 15)
    } else {
      // Default to current billing period
      const now = new Date()
      if (now.getDate() <= 15) {
        // Current period is previous month 16th to current month 15th
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 16)
        endDate = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        // Current period is current month 16th to next month 15th
        startDate = new Date(now.getFullYear(), now.getMonth(), 16)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 15)
      }
    }

    // Build where clause for invoices
    const invoiceWhere: any = {
      billingPeriodStart: {
        gte: startDate,
        lte: endDate
      },
      status: { in: ['pending', 'reconciled', 'disputed'] }
    }

    if (warehouseId) {
      invoiceWhere.warehouseId = warehouseId
    }

    // Get invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        lineItems: true,
        reconciliations: true
      }
    })

    let processedCount = 0
    let createdReconciliations = 0

    // Process each invoice
    for (const invoice of invoices) {
      // Skip if already has reconciliations
      if (invoice.reconciliations.length > 0) {
        continue
      }

      // Get calculated costs for the billing period
      const calculatedCosts = await prisma.calculatedCost.groupBy({
        by: ['costRateId'],
        where: {
          warehouseId: invoice.warehouseId,
          billingPeriodStart: {
            gte: invoice.billingPeriodStart,
            lte: invoice.billingPeriodEnd
          }
        },
        _sum: {
          finalExpectedCost: true
        }
      })

      // Get cost rate details
      const costRateIds = calculatedCosts.map(c => c.costRateId)
      const costRates = await prisma.costRate.findMany({
        where: { id: { in: costRateIds } }
      })

      // Create reconciliation records
      const reconciliations = []

      for (const lineItem of invoice.lineItems) {
        // Find matching calculated cost
        const matchingRate = costRates.find(r => 
          r.costCategory === lineItem.costCategory && 
          r.costName === lineItem.costName
        )

        if (matchingRate) {
          const calculatedSum = calculatedCosts.find(c => c.costRateId === matchingRate.id)
          const expectedAmount = calculatedSum?._sum.finalExpectedCost || 0

          const difference = Number(lineItem.amount) - Number(expectedAmount)
          let status: 'match' | 'overbilled' | 'underbilled' = 'match'
          
          if (Math.abs(difference) > 0.01) {
            status = difference > 0 ? 'overbilled' : 'underbilled'
          }

          reconciliations.push({
            invoiceId: invoice.id,
            costCategory: lineItem.costCategory,
            costName: lineItem.costName,
            expectedAmount,
            invoicedAmount: lineItem.amount,
            difference,
            status
          })
        } else {
          // No matching calculated cost found
          reconciliations.push({
            invoiceId: invoice.id,
            costCategory: lineItem.costCategory,
            costName: lineItem.costName,
            expectedAmount: 0,
            invoicedAmount: lineItem.amount,
            difference: lineItem.amount,
            status: 'overbilled' as const
          })
        }
      }

      // Check for any calculated costs that don't have matching line items
      for (const costRate of costRates) {
        const hasLineItem = invoice.lineItems.some(item => 
          item.costCategory === costRate.costCategory && 
          item.costName === costRate.costName
        )

        if (!hasLineItem) {
          const calculatedSum = calculatedCosts.find(c => c.costRateId === costRate.id)
          const expectedAmount = calculatedSum?._sum.finalExpectedCost || 0

          if (expectedAmount > 0) {
            reconciliations.push({
              invoiceId: invoice.id,
              costCategory: costRate.costCategory,
              costName: costRate.costName,
              expectedAmount,
              invoicedAmount: 0,
              difference: -expectedAmount,
              status: 'underbilled' as const
            })
          }
        }
      }

      // Insert reconciliation records
      if (reconciliations.length > 0) {
        await prisma.invoiceReconciliation.createMany({
          data: reconciliations
        })
        createdReconciliations += reconciliations.length
      }

      processedCount++
    }

    // Update invoice statuses based on reconciliation results
    for (const invoice of invoices) {
      const reconciliations = await prisma.invoiceReconciliation.findMany({
        where: { invoiceId: invoice.id }
      })

      if (reconciliations.length > 0) {
        const hasDiscrepancies = reconciliations.some(r => r.status !== 'match')
        
        if (invoice.status === 'pending') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: hasDiscrepancies ? 'reconciled' : 'reconciled'
            }
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Reconciliation completed successfully',
      summary: {
        invoicesProcessed: processedCount,
        reconciliationsCreated: createdReconciliations,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Error running reconciliation:', error)
    return NextResponse.json(
      { error: 'Failed to run reconciliation' },
      { status: 500 }
    )
  }
}