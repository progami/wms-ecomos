import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'finance_admin') {
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

    // Get financial metrics
    const [
      totalRevenue,
      outstandingInvoices,
      storageCosts,
      handlingCosts,
      invoiceStats,
      recentActivity
    ] = await Promise.all([
      // Total revenue for current period
      prisma.invoiceInput.aggregate({
        where: {
          invoiceDate: {
            gte: billingStart,
            lte: billingEnd,
          },
          status: 'paid',
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // Outstanding invoices
      prisma.invoiceInput.aggregate({
        where: {
          status: { in: ['pending', 'overdue'] },
        },
        _sum: {
          totalAmount: true,
        },
        _count: true,
      }),

      // Storage costs
      prisma.storageLedger.aggregate({
        where: {
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
        },
        _sum: {
          calculatedWeeklyCost: true,
        },
      }),

      // Handling costs (from transactions)
      prisma.inventoryTransaction.count({
        where: {
          transactionDate: {
            gte: billingStart,
            lte: billingEnd,
          },
        },
      }),

      // Invoice status breakdown
      prisma.invoiceInput.groupBy({
        by: ['status'],
        _sum: {
          totalAmount: true,
        },
        _count: true,
      }),

      // Recent financial activity
      prisma.invoiceInput.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: true,
        },
      }),
    ])

    // Calculate cost breakdown
    const totalStorageCost = storageCosts._sum.calculatedWeeklyCost || 0
    const totalHandlingCost = handlingCosts * 25 // $25 per transaction
    const totalTransportCost = totalHandlingCost * 0.5 // Estimated
    const otherCosts = (totalStorageCost + totalHandlingCost) * 0.1 // 10% of main costs
    const totalCosts = totalStorageCost + totalHandlingCost + totalTransportCost + otherCosts

    // Calculate metrics
    const currentRevenue = totalRevenue._sum.totalAmount || 0
    const outstandingAmount = outstandingInvoices._sum.totalAmount || 0
    const costVariance = ((totalCosts - (currentRevenue * 0.9)) / (currentRevenue * 0.9)) * 100
    const collectionRate = (currentRevenue / (currentRevenue + outstandingAmount)) * 100

    return NextResponse.json({
      metrics: {
        totalRevenue: currentRevenue,
        outstandingInvoices: {
          amount: outstandingAmount,
          count: outstandingInvoices._count,
        },
        costVariance: costVariance.toFixed(2),
        collectionRate: collectionRate.toFixed(2),
      },
      costBreakdown: {
        storage: {
          amount: totalStorageCost,
          percentage: ((totalStorageCost / totalCosts) * 100).toFixed(0),
        },
        handling: {
          amount: totalHandlingCost,
          percentage: ((totalHandlingCost / totalCosts) * 100).toFixed(0),
        },
        transportation: {
          amount: totalTransportCost,
          percentage: ((totalTransportCost / totalCosts) * 100).toFixed(0),
        },
        other: {
          amount: otherCosts,
          percentage: ((otherCosts / totalCosts) * 100).toFixed(0),
        },
        total: totalCosts,
      },
      invoiceStatus: invoiceStats.map(stat => ({
        status: stat.status,
        count: stat._count,
        amount: stat._sum.totalAmount || 0,
      })),
      recentActivity: recentActivity.map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        title: `Invoice ${invoice.invoiceNumber} processed`,
        amount: invoice.totalAmount,
        time: invoice.createdAt,
        status: invoice.status === 'paid' ? 'success' : 
                invoice.status === 'overdue' ? 'warning' : 'info',
        warehouse: invoice.warehouse.name,
      })),
      billingPeriod: {
        start: billingStart,
        end: billingEnd,
      },
    })
  } catch (error) {
    console.error('Finance dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 })
  }
}