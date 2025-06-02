import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  console.log('Admin dashboard API called')
  
  try {
    // Test basic connectivity first
    try {
      const testConnection = await prisma.$queryRaw`SELECT 1 as test`
      console.log('Database connection test:', testConnection)
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error' 
      }, { status: 500 })
    }
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    if (!session || session.user.role !== 'admin') {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date info
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Initialize default values
    let currentInventory = 0
    let inventoryChange = 0
    
    try {
      // Total inventory across all warehouses
      const inventoryStats = await prisma.inventoryBalance.aggregate({
        _sum: {
          currentCartons: true,
        },
      })
      currentInventory = inventoryStats._sum.currentCartons || 0
      
      // Last month's inventory for comparison
      const lastMonthTransactions = await prisma.inventoryTransaction.aggregate({
        where: {
          transactionDate: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: {
          cartonsIn: true,
          cartonsOut: true,
        },
      })

      const lastMonthInventory = (lastMonthTransactions._sum.cartonsIn || 0) - 
                                (lastMonthTransactions._sum.cartonsOut || 0)
      
      inventoryChange = lastMonthInventory > 0 
        ? ((currentInventory - lastMonthInventory) / lastMonthInventory) * 100 
        : 0
    } catch (invError) {
      console.error('Error fetching inventory stats:', invError)
    }

    // Initialize more default values
    let currentCost = 0
    let costChange = 0
    let activeSkusCount = 0
    let pendingInvoices = 0
    let overdueInvoices = 0
    let totalUsers = 0
    let totalTransactions = 0
    
    try {
      // Current month storage cost estimate
      const currentMonthCosts = await prisma.calculatedCost.aggregate({
        where: {
          billingPeriodStart: {
            gte: startOfMonth,
          },
        },
        _sum: {
          finalExpectedCost: true,
        },
      })

      // Last month's costs for comparison
      const lastMonthCosts = await prisma.calculatedCost.aggregate({
        where: {
          billingPeriodStart: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: {
          finalExpectedCost: true,
        },
      })

      currentCost = Number(currentMonthCosts._sum.finalExpectedCost || 0)
      const lastCost = Number(lastMonthCosts._sum.finalExpectedCost || 0)
      costChange = lastCost > 0 
        ? ((currentCost - lastCost) / lastCost) * 100 
        : 0
    } catch (costError) {
      console.error('Error fetching cost stats:', costError)
    }
    
    try {
      // Active SKUs count
      const activeSkus = await prisma.inventoryBalance.findMany({
        where: {
          currentCartons: {
            gt: 0,
          },
        },
        select: {
          skuId: true,
        },
        distinct: ['skuId'],
      })
      activeSkusCount = activeSkus.length
    } catch (skuError) {
      console.error('Error fetching SKU stats:', skuError)
    }

    try {
      // Pending invoices count
      pendingInvoices = await prisma.invoice.count({
        where: {
          status: 'pending',
        },
      })

      // Overdue invoices (pending invoices past due date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      overdueInvoices = await prisma.invoice.count({
        where: {
          status: 'pending',
          invoiceDate: {
            lt: thirtyDaysAgo,
          },
        },
      })
    } catch (invoiceError) {
      console.error('Error fetching invoice stats:', invoiceError)
    }

    try {
      // System status info
      totalUsers = await prisma.user.count()
      totalTransactions = await prisma.inventoryTransaction.count()
    } catch (sysError) {
      console.error('Error fetching system stats:', sysError)
    }
    
    // Get database size (approximate)
    let dbSize = [{ size: 0 }]
    try {
      const dbSizeResult = await prisma.$queryRaw<{size: bigint}[]>`
        SELECT pg_database_size(current_database()) as size
      `
      // Convert bigint to number
      dbSize = dbSizeResult.map(row => ({ size: Number(row.size) }))
    } catch (dbError) {
      console.warn('Failed to get database size:', dbError)
      // Continue with default value
    }

    return NextResponse.json({
      stats: {
        totalInventory: currentInventory,
        inventoryChange: inventoryChange.toFixed(1),
        inventoryTrend: inventoryChange > 0 ? 'up' : inventoryChange < 0 ? 'down' : 'neutral',
        storageCost: currentCost.toFixed(2),
        costChange: costChange.toFixed(1),
        costTrend: costChange > 0 ? 'up' : costChange < 0 ? 'down' : 'neutral',
        activeSkus: activeSkusCount,
        pendingInvoices,
        overdueInvoices,
      },
      systemInfo: {
        totalUsers,
        totalTransactions,
        dbSize: Math.round(Number(dbSize[0]?.size || 0) / 1024 / 1024) || 0, // Convert to MB
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}