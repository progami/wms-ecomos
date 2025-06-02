import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current billing period (16th to 15th)
    const now = new Date()
    const day = now.getDate()
    const billingStart = day >= 16 
      ? new Date(now.getFullYear(), now.getMonth(), 16)
      : new Date(now.getFullYear(), now.getMonth() - 1, 16)
    const billingEnd = new Date(billingStart)
    billingEnd.setMonth(billingEnd.getMonth() + 1)
    billingEnd.setDate(15)

    // Get invoice stats
    const [totalInvoices, pendingInvoices, paidInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'pending' } }),
      prisma.invoice.count({ where: { status: 'paid' } })
    ])

    const [totalAmount, pendingAmount, paidAmount] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ 
        where: { status: 'pending' },
        _sum: { totalAmount: true } 
      }),
      prisma.invoice.aggregate({ 
        where: { status: 'paid' },
        _sum: { totalAmount: true } 
      })
    ])

    // Get cost breakdown by category from calculated costs
    const calculatedCosts = await prisma.calculatedCost.findMany({
      where: {
        billingPeriodStart: {
          gte: billingStart,
          lte: billingEnd
        }
      },
      include: {
        costRate: true
      }
    })

    // Group by cost category
    const costBreakdownMap = new Map<string, number>()
    calculatedCosts.forEach(cost => {
      const category = cost.costRate.costCategory
      const current = costBreakdownMap.get(category) || 0
      costBreakdownMap.set(category, current + Number(cost.finalExpectedCost))
    })

    const costBreakdown = Array.from(costBreakdownMap.entries()).map(([category, amount]) => ({
      costCategory: category,
      amount: amount
    }))

    // Get recent activity
    const recentActivity = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: true
      }
    })

    return NextResponse.json({
      kpis: {
        totalRevenue: Number(totalAmount._sum.totalAmount || 0).toFixed(2),
        revenueChange: '0.0', // Placeholder
        outstandingAmount: Number(pendingAmount._sum.totalAmount || 0).toFixed(2),
        outstandingCount: pendingInvoices,
        costVariance: '0.0', // Placeholder
        costSavings: '0.00', // Placeholder
        collectionRate: totalInvoices > 0 
          ? ((paidInvoices / totalInvoices) * 100).toFixed(1)
          : '0.0'
      },
      costBreakdown: costBreakdown,
      invoiceStatus: {
        paid: {
          count: paidInvoices,
          amount: Number(paidAmount._sum.totalAmount || 0)
        },
        pending: {
          count: pendingInvoices,
          amount: Number(pendingAmount._sum.totalAmount || 0)
        },
        overdue: {
          count: 0, // Calculated separately
          amount: 0
        },
        disputed: {
          count: 0,
          amount: 0
        }
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        type: 'invoice',
        title: `Invoice #${activity.invoiceNumber}`,
        amount: Number(activity.totalAmount),
        time: activity.createdAt,
        status: activity.status === 'paid' ? 'success' : 'warning',
        warehouse: activity.warehouse.name
      })),
      billingPeriod: {
        start: billingStart,
        end: billingEnd
      }
    })
  } catch (error) {
    console.error('Finance dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}