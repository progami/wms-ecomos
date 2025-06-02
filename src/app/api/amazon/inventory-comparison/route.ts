import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the Amazon warehouse to ensure we have the correct ID
    const amazonWarehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { code: 'AMZN-UK' },
          { name: 'Amazon FBA UK' }
        ]
      }
    })

    if (!amazonWarehouse) {
      console.warn('Amazon FBA UK warehouse not found')
    }

    // Get all SKUs from the database with their current inventory
    const skus = await prisma.sku.findMany({
      include: {
        inventoryTransactions: {
          include: {
            warehouse: true
          }
        }
      },
      orderBy: {
        skuCode: 'asc'
      }
    })

    // Calculate inventory for each SKU
    const inventoryData = skus.map(sku => {
      // Calculate warehouse quantity (excluding Amazon FBA UK)
      let warehouseCartons = 0
      let amazonCartons = 0

      sku.inventoryTransactions.forEach(tx => {
        // Calculate net quantity change for this transaction
        const cartonsQty = tx.cartonsIn - tx.cartonsOut

        // Use warehouse ID for comparison if available, fallback to name/code
        const isAmazonTransaction = amazonWarehouse 
          ? tx.warehouseId === amazonWarehouse.id
          : (tx.warehouse.name === 'Amazon FBA UK' || tx.warehouse.code === 'AMZN-UK')

        if (isAmazonTransaction) {
          amazonCartons += cartonsQty
        } else {
          warehouseCartons += cartonsQty
        }
      })

      // Convert cartons to units
      const unitsPerCarton = sku.unitsPerCarton || 1
      const warehouseUnits = Math.max(0, warehouseCartons * unitsPerCarton)
      const amazonUnits = Math.max(0, amazonCartons * unitsPerCarton)

      return {
        sku: sku.skuCode,
        description: sku.description || '',
        warehouseQty: warehouseUnits, // Now in units
        amazonQty: amazonUnits, // Now in units
        difference: warehouseUnits - amazonUnits,
        unitsPerCarton: unitsPerCarton // Include for reference
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
      { 
        error: 'Failed to fetch inventory comparison',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}