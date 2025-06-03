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
          { code: 'AMZN' },
          { name: 'Amazon FBA UK' },
          { name: { contains: 'Amazon' } }
        ]
      }
    })

    if (!amazonWarehouse) {
      console.warn('Amazon FBA UK warehouse not found')
      // Log all warehouses to help debug
      const allWarehouses = await prisma.warehouse.findMany()
      console.log('Available warehouses:', allWarehouses.map(w => ({ id: w.id, code: w.code, name: w.name })))
    } else {
      console.log('Found Amazon warehouse:', { id: amazonWarehouse.id, code: amazonWarehouse.code, name: amazonWarehouse.name })
    }

    // Get all SKUs from the database
    const skus = await prisma.sku.findMany({
      orderBy: {
        skuCode: 'asc'
      }
    })

    // Get inventory balances for all warehouses
    const inventoryBalances = await prisma.inventoryBalance.findMany({
      include: {
        warehouse: true,
        sku: true
      }
    })
    
    console.log(`Found ${inventoryBalances.length} inventory balance records`)

    // Calculate inventory for each SKU
    const inventoryData = skus.map(sku => {
      // Get all balances for this SKU
      const skuBalances = inventoryBalances.filter(balance => balance.skuId === sku.id)
      
      // Calculate warehouse quantity (excluding Amazon FBA UK)
      let warehouseCartons = 0
      let amazonCartons = 0

      skuBalances.forEach(balance => {
        // Use warehouse ID for comparison if available, fallback to name/code
        const isAmazonBalance = amazonWarehouse 
          ? balance.warehouseId === amazonWarehouse.id
          : (balance.warehouse.name === 'Amazon FBA UK' || balance.warehouse.code === 'AMZN-UK' || balance.warehouse.code === 'AMZN')

        if (isAmazonBalance) {
          amazonCartons += balance.currentCartons
        } else {
          warehouseCartons += balance.currentCartons
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
        total: warehouseUnits + amazonUnits, // Sum instead of difference
        unitsPerCarton: unitsPerCarton // Include for reference
      }
    })

    // Include all SKUs, even those with 0 stock
    // Sort by SKU code for consistent display
    const sortedInventory = inventoryData.sort((a, b) => a.sku.localeCompare(b.sku))
    
    console.log(`Total SKUs: ${skus.length}, Returning all SKUs including those with 0 stock`)

    return NextResponse.json(sortedInventory)
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