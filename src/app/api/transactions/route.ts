import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TransactionType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, referenceNumber, date, items, notes } = body

    // Validate warehouse assignment for staff
    if (session.user.role === 'warehouse_staff' && !session.user.warehouseId) {
      return NextResponse.json({ error: 'No warehouse assigned' }, { status: 400 })
    }

    const warehouseId = session.user.warehouseId || body.warehouseId

    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID required' }, { status: 400 })
    }

    // Create transactions for each item
    const transactions = []
    
    for (const item of items) {
      // Verify SKU exists
      const sku = await prisma.sku.findFirst({
        where: { skuCode: item.skuCode }
      })

      if (!sku) {
        return NextResponse.json({ 
          error: `SKU ${item.skuCode} not found` 
        }, { status: 400 })
      }

      const transactionId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const transaction = await prisma.inventoryTransaction.create({
        data: {
          transactionId,
          warehouseId,
          skuId: sku.id,
          batchLot: item.batchLot || 'NONE',
          transactionType: type as TransactionType,
          referenceId: referenceNumber,
          cartonsIn: type === 'RECEIVE' ? item.cartons : 0,
          cartonsOut: type === 'SHIP' ? item.cartons : 0,
          storagePalletsIn: type === 'RECEIVE' ? (item.pallets || 0) : 0,
          shippingPalletsOut: type === 'SHIP' ? (item.pallets || 0) : 0,
          notes,
          transactionDate: new Date(date),
          createdById: session.user.id,
        }
      })

      transactions.push(transaction)

      // Update inventory balance
      const balance = await prisma.inventoryBalance.findFirst({
        where: {
          warehouseId,
          skuId: sku.id,
          batchLot: item.batchLot || 'NONE',
        }
      })

      const currentBalance = balance?.currentCartons || 0
      const newBalance = type === 'RECEIVE' 
        ? currentBalance + item.cartons
        : currentBalance - item.cartons

      // Get warehouse config for pallet calculation
      const warehouseConfig = await prisma.warehouseSkuConfig.findFirst({
        where: {
          warehouseId,
          skuId: sku.id,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        orderBy: { effectiveDate: 'desc' }
      })

      const currentPallets = warehouseConfig && newBalance > 0
        ? Math.ceil(newBalance / warehouseConfig.storageCartonsPerPallet)
        : 0

      if (balance) {
        await prisma.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            currentCartons: Math.max(0, newBalance),
            currentPallets,
            currentUnits: Math.max(0, newBalance) * sku.unitsPerCarton,
            lastTransactionDate: new Date(date),
          }
        })
      } else if (type === 'RECEIVE' && newBalance > 0) {
        await prisma.inventoryBalance.create({
          data: {
            warehouseId,
            skuId: sku.id,
            batchLot: item.batchLot || 'NONE',
            currentCartons: newBalance,
            currentPallets,
            currentUnits: newBalance * sku.unitsPerCarton,
            lastTransactionDate: new Date(date),
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${transactions.length} transactions created`,
      transactionIds: transactions.map(t => t.transactionId),
    })
  } catch (error) {
    console.error('Transaction error:', error)
    return NextResponse.json({ 
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}