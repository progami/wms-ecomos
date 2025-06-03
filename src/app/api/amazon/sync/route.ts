import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getInventory, getCatalogItem } from '@/lib/amazon/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { syncType } = await request.json()

    switch (syncType) {
      case 'inventory':
        return await syncInventory()
      case 'products':
        return await syncProducts()
      default:
        return NextResponse.json(
          { message: 'Invalid sync type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Amazon sync error:', error)
    return NextResponse.json(
      { message: 'Failed to sync Amazon data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function syncInventory() {
  try {
    // Get current session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get FBA inventory from Amazon
    const inventoryData = await getInventory()
    
    if (!inventoryData || !inventoryData.inventorySummaries) {
      return NextResponse.json({
        message: 'No inventory data found',
        synced: 0
      })
    }

    let syncedCount = 0
    const errors = []

    // Get or create Amazon warehouse
    let amazonWarehouse = await prisma.warehouse.findFirst({
      where: { code: 'AMZN-UK' }
    })

    if (!amazonWarehouse) {
      amazonWarehouse = await prisma.warehouse.create({
        data: {
          code: 'AMZN-UK',
          name: 'Amazon FBA UK',
          address: 'Amazon Fulfillment Centers',
          isActive: true
        }
      })
    }

    // Process each inventory item
    for (const item of inventoryData.inventorySummaries) {
      try {
        // Find or create SKU
        let sku = await prisma.sku.findFirst({
          where: { asin: item.asin }
        })

        if (!sku) {
          // Try to get product details from catalog
          try {
            const catalogItem = await getCatalogItem(item.asin)
            const title = catalogItem?.item?.attributes?.title?.[0]?.value || `Product ${item.asin}`
            
            sku = await prisma.sku.create({
              data: {
                skuCode: item.sellerSku || item.asin,
                asin: item.asin,
                description: title,
                packSize: 1, // Default values - should be updated manually
                unitsPerCarton: 1,
                cartonWeightKg: 1,
                notes: 'Auto-imported from Amazon'
              }
            })
          } catch (catalogError) {
            console.error(`Failed to get catalog data for ${item.asin}:`, catalogError)
            // Create with minimal data
            sku = await prisma.sku.create({
              data: {
                skuCode: item.sellerSku || item.asin,
                asin: item.asin,
                description: `Amazon Product ${item.asin}`,
                packSize: 1,
                unitsPerCarton: 1,
                cartonWeightKg: 1,
                notes: 'Auto-imported from Amazon - Update details manually'
              }
            })
          }
        }

        // Update inventory balance
        const totalQuantity = (item.inventoryDetails?.fulfillableQuantity || 0) + 
                            (item.inventoryDetails?.reservedQuantity?.totalReservedQuantity || 0)

        if (totalQuantity > 0) {
          // Check current balance
          const currentBalance = await prisma.inventoryBalance.findUnique({
            where: {
              warehouseId_skuId_batchLot: {
                warehouseId: amazonWarehouse.id,
                skuId: sku.id,
                batchLot: 'AMAZON-FBA'
              }
            }
          })

          const currentCartons = currentBalance?.currentCartons || 0
          const difference = totalQuantity - currentCartons

          if (difference !== 0) {
            // Create adjustment transaction
            await prisma.inventoryTransaction.create({
              data: {
                transactionId: `AMZN-SYNC-${Date.now()}-${sku.skuCode}`,
                warehouseId: amazonWarehouse.id,
                skuId: sku.id,
                batchLot: 'AMAZON-FBA',
                transactionType: difference > 0 ? 'ADJUST_IN' : 'ADJUST_OUT',
                referenceId: `AMZN-SYNC-${new Date().toISOString()}`,
                cartonsIn: difference > 0 ? difference : 0,
                cartonsOut: difference < 0 ? Math.abs(difference) : 0,
                transactionDate: new Date(),
                notes: `Amazon FBA sync - Fulfillable: ${item.inventoryDetails?.fulfillableQuantity || 0}, Reserved: ${item.inventoryDetails?.reservedQuantity?.totalReservedQuantity || 0}`,
                createdById: session.user.id
              }
            })

            // Update balance
            if (currentBalance) {
              await prisma.inventoryBalance.update({
                where: { id: currentBalance.id },
                data: {
                  currentCartons: totalQuantity,
                  currentUnits: totalQuantity * sku.unitsPerCarton,
                  lastTransactionDate: new Date()
                }
              })
            } else {
              await prisma.inventoryBalance.create({
                data: {
                  warehouseId: amazonWarehouse.id,
                  skuId: sku.id,
                  batchLot: 'AMAZON-FBA',
                  currentCartons: totalQuantity,
                  currentUnits: totalQuantity * sku.unitsPerCarton,
                  lastTransactionDate: new Date()
                }
              })
            }
          }
        }

        syncedCount++
      } catch (itemError) {
        console.error(`Error syncing item ${item.asin}:`, itemError)
        errors.push({
          asin: item.asin,
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} items`,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    throw error
  }
}

async function syncProducts() {
  try {
    // Get all SKUs with ASINs
    const skus = await prisma.sku.findMany({
      where: {
        asin: { not: null }
      }
    })

    let updatedCount = 0
    const errors = []

    for (const sku of skus) {
      if (!sku.asin) continue

      try {
        const catalogItem = await getCatalogItem(sku.asin)
        
        if (catalogItem?.item?.attributes) {
          const attributes = catalogItem.item.attributes
          const updates: any = {}

          // Update description if available
          if (attributes.title?.[0]?.value) {
            updates.description = attributes.title[0].value
          }

          // Update dimensions if available
          if (attributes.item_dimensions) {
            const dims = attributes.item_dimensions[0]
            if (dims.length && dims.width && dims.height) {
              updates.cartonDimensionsCm = `${Math.round(dims.length.value * 2.54)}x${Math.round(dims.width.value * 2.54)}x${Math.round(dims.height.value * 2.54)}`
            }
          }

          // Update weight if available
          if (attributes.item_weight?.[0]?.value) {
            updates.cartonWeightKg = attributes.item_weight[0].value * 0.453592 // Convert pounds to kg
          }

          if (Object.keys(updates).length > 0) {
            await prisma.sku.update({
              where: { id: sku.id },
              data: updates
            })
            updatedCount++
          }
        }
      } catch (itemError) {
        console.error(`Error updating product ${sku.asin}:`, itemError)
        errors.push({
          asin: sku.asin,
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        })
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} products`,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    throw error
  }
}