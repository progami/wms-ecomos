import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const skuCode = params.id // Using id parameter but it contains skuCode
    
    // Get the SKU
    const sku = await prisma.sku.findFirst({
      where: { skuCode }
    })
    
    if (!sku) {
      return NextResponse.json(
        { message: 'SKU not found' },
        { status: 404 }
      )
    }

    // Find the highest batch number for this SKU
    const lastTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        skuId: sku.id,
        batchLot: {
          not: {
            in: ['', 'N/A', 'NA', '-']
          }
        }
      },
      orderBy: {
        batchLot: 'desc'
      },
      select: {
        batchLot: true
      }
    })

    let nextBatchNumber = 1
    
    if (lastTransaction && lastTransaction.batchLot) {
      // Extract numeric part from batch/lot
      const match = lastTransaction.batchLot.match(/(\d+)/)
      if (match) {
        const lastNumber = parseInt(match[1])
        if (!isNaN(lastNumber)) {
          nextBatchNumber = lastNumber + 1
        }
      }
    }

    return NextResponse.json({
      skuCode,
      lastBatch: lastTransaction?.batchLot || null,
      nextBatchNumber,
      suggestedBatchLot: `${nextBatchNumber}`
    })
  } catch (error) {
    console.error('Error getting next batch number:', error)
    return NextResponse.json(
      { message: 'Failed to get next batch number' },
      { status: 500 }
    )
  }
}