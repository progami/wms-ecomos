import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current billing period (16th to 15th)
    const today = new Date()
    const billingStart = today.getDate() >= 16 
      ? new Date(today.getFullYear(), today.getMonth(), 16)
      : new Date(today.getFullYear(), today.getMonth() - 1, 16)
    const billingEnd = new Date(billingStart)
    billingEnd.setMonth(billingEnd.getMonth() + 1)
    billingEnd.setDate(15)

    // Previous billing period for comparison
    const prevBillingStart = new Date(billingStart)
    prevBillingStart.setMonth(prevBillingStart.getMonth() - 1)
    const prevBillingEnd = new Date(prevBillingStart)
    prevBillingEnd.setMonth(prevBillingEnd.getMonth() + 1)
    prevBillingEnd.setDate(15)

    // Get current period costs
    const currentCosts = await prisma.calculatedCost.aggregate({
      where: {
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
      _sum: {
        finalExpectedCost: true,
      },
    })

    // Get previous period costs
    const previousCosts = await prisma.calculatedCost.aggregate({
      where: {
        billingPeriodStart: {
          gte: prevBillingStart,
          lte: prevBillingEnd,
        },
      },
      _sum: {
        finalExpectedCost: true,
      },
    })

    const currentRevenue = Number(currentCosts._sum.finalExpectedCost || 0)
    const previousRevenue = Number(previousCosts._sum.finalExpectedCost || 0)
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    // Get invoice stats
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      where: {
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    })

    const paidInvoices = invoiceStats.find(s => s.status === 'paid') || { _count: 0, _sum: { totalAmount: 0 } }
    const pendingInvoices = invoiceStats.find(s => s.status === 'pending') || { _count: 0, _sum: { totalAmount: 0 } }
    // Calculate overdue invoices separately (pending invoices > 30 days old)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const overdueCount = await prisma.invoice.count({
      where: {
        status: 'pending',
        invoiceDate: {
          lt: thirtyDaysAgo,
        },
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
    })
    
    const overdueSum = await prisma.invoice.aggregate({
      where: {
        status: 'pending',
        invoiceDate: {
          lt: thirtyDaysAgo,
        },
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
    })
    
    const overdueInvoices = { _count: overdueCount, _sum: { totalAmount: overdueSum._sum.totalAmount || 0 } }

    // Get cost breakdown by cost type (through cost rates)
    const costBreakdownRaw = await prisma.calculatedCost.findMany({
      where: {
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
      include: {
        costRate: true,
      },
    })
    
    // Group by costName from costRate
    const costBreakdownMap = new Map<string, number>()
    for (const cost of costBreakdownRaw) {
      const category = cost.costRate.costName
      const currentAmount = costBreakdownMap.get(category) || 0
      costBreakdownMap.set(category, currentAmount + Number(cost.finalExpectedCost))
    }
    
    const costBreakdown = Array.from(costBreakdownMap.entries()).map(([category, amount]) => ({
      costCategory: category,
      _sum: { finalExpectedCost: amount }
    }))

    // Calculate cost variance (compare invoiced vs calculated)
    const invoicedAmount = await prisma.invoice.aggregate({
      where: {
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd,
        },
        status: {
          in: ['paid', 'pending'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    })

    const totalInvoiced = Number(invoicedAmount._sum.totalAmount || 0)
    const costVariance = currentRevenue > 0 
      ? ((totalInvoiced - currentRevenue) / currentRevenue) * 100 
      : 0

    // Collection rate
    const totalBilled = Number(paidInvoices._sum.totalAmount || 0) + 
                       Number(pendingInvoices._sum.totalAmount || 0) + 
                       Number(overdueInvoices._sum.totalAmount || 0)
    const collectionRate = totalBilled > 0 
      ? (Number(paidInvoices._sum.totalAmount || 0) / totalBilled) * 100 
      : 0

    // Recent activity
    const recentActivity = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: true,
      },
    })

    return NextResponse.json({
      kpis: {
        totalRevenue: currentRevenue.toFixed(2),
        revenueChange: revenueChange.toFixed(1),
        outstandingAmount: (Number(pendingInvoices._sum.totalAmount || 0) + Number(overdueInvoices._sum.totalAmount || 0)).toFixed(2),
        outstandingCount: pendingInvoices._count + overdueInvoices._count,
        costVariance: costVariance.toFixed(1),
        costSavings: Math.abs(totalInvoiced - currentRevenue).toFixed(2),
        collectionRate: collectionRate.toFixed(1),
      },
      costBreakdown: costBreakdown.map(item => ({
        category: item.costCategory,
        amount: item._sum.finalExpectedCost,
      })),
      invoiceStatus: {
        paid: {
          count: paidInvoices._count,
          amount: Number(paidInvoices._sum.totalAmount || 0),
        },
        pending: {
          count: pendingInvoices._count,
          amount: Number(pendingInvoices._sum.totalAmount || 0),
        },
        overdue: {
          count: overdueInvoices._count,
          amount: Number(overdueInvoices._sum.totalAmount || 0),
        },
        disputed: {
          count: 0,
          amount: 0,
        },
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        type: 'invoice',
        title: `Invoice #${activity.invoiceNumber} processed`,
        amount: Number(activity.totalAmount),
        time: activity.createdAt,
        status: activity.status === 'paid' ? 'success' : activity.status === 'pending' ? 'warning' : 'info',
        warehouse: activity.warehouse.name,
      })),
      billingPeriod: {
        start: billingStart,
        end: billingEnd,
      },
    })
  } catch (error) {
    console.error('Finance dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}