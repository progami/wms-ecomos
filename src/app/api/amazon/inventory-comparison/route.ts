import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all SKUs from the database with their current inventory
    const skus = await db.sku.findMany({
      include: {
        transactions: {
          include: {
            warehouse: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    })

    // Calculate inventory for each SKU
    const inventoryData = skus.map(sku => {
      // Calculate warehouse quantity (excluding Amazon FBA UK)
      let warehouseQty = 0
      let amazonQty = 0

      sku.transactions.forEach(tx => {
        const qty = tx.type === 'RECEIVE' || tx.type === 'ADJUST_IN' 
          ? tx.quantity 
          : -tx.quantity

        if (tx.warehouse.name === 'Amazon FBA UK') {
          amazonQty += qty
        } else {
          warehouseQty += qty
        }
      })

      return {
        sku: sku.code,
        description: sku.description || '',
        warehouseQty: Math.max(0, warehouseQty), // Ensure non-negative
        amazonQty: Math.max(0, amazonQty), // Ensure non-negative
        difference: warehouseQty - amazonQty
      }
    })

    // Filter out SKUs with no activity
    const activeInventory = inventoryData.filter(
      item => item.warehouseQty > 0 || item.amazonQty > 0
    )

    return NextResponse.json(activeInventory.length > 0 ? activeInventory : inventoryData)
  } catch (error) {
    console.error('Error in inventory comparison:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory comparison' },
      { status: 500 }
    )
  }
}