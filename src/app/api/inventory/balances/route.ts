import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only warehouse staff, managers, and admins can access this
    if (!['warehouse_staff', 'system_admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the user's warehouse
    const warehouseId = session.user.warehouseId
    
    // Warehouse staff can only see their warehouse
    if (session.user.role === 'warehouse_staff' && !warehouseId) {
      return NextResponse.json({ error: 'No warehouse assigned' }, { status: 403 })
    }

    // Fetch inventory data
    const inventoryQuery = warehouseId && session.user.role === 'warehouse_staff'
      ? { warehouseId }
      : {} // Admins and managers can see all warehouses

    const inventoryBalances = await prisma.inventoryBalance.findMany({
      where: inventoryQuery,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        },
        sku: {
          select: {
            id: true,
            skuCode: true,
            description: true,
          }
        },
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { sku: { skuCode: 'asc' } },
      ],
    })

    return NextResponse.json(inventoryBalances)
  } catch (error) {
    console.error('Error fetching inventory balances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}