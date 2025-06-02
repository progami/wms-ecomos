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

    // Get warehouse inventory summary
    const inventory = await prisma.inventoryBalance.aggregate({
      _sum: {
        currentCartons: true,
        currentPallets: true,
        currentUnits: true
      }
    })

    // Get SKU count
    const skuCount = await prisma.sku.count()

    // Get recent transactions count
    const transactionCount = await prisma.inventoryTransaction.count({
      where: {
        transactionDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })

    // Get cost rates count
    const costRateCount = await prisma.costRate.count()

    return NextResponse.json({
      inventory: {
        totalCartons: inventory._sum.currentCartons || 0,
        totalPallets: inventory._sum.currentPallets || 0,
        totalUnits: inventory._sum.currentUnits || 0
      },
      counts: {
        skus: skuCount,
        transactions: transactionCount,
        costRates: costRateCount
      }
    })
  } catch (error) {
    console.error('Dashboard simple API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}