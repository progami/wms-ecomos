import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const warehouseId = searchParams.get('warehouseId') || session.user.warehouseId

    // Build query conditions
    const where: any = {}
    
    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    // Only show items with positive inventory
    where.currentCartons = { gt: 0 }

    const balances = await prisma.inventoryBalance.findMany({
      where,
      include: {
        warehouse: true,
        sku: true,
      },
      orderBy: [
        { sku: { skuCode: 'asc' } },
        { batchLot: 'asc' }
      ]
    })

    return NextResponse.json(balances)
  } catch (error) {
    console.error('Error fetching inventory balances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory balances' },
      { status: 500 }
    )
  }
}