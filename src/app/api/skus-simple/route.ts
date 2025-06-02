import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/skus-simple - List SKUs with minimal data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}

    if (search) {
      where.OR = [
        { skuCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { asin: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const skus = await prisma.sku.findMany({
      where,
      include: {
        _count: {
          select: {
            inventoryBalances: true,
            warehouseConfigs: true
          }
        }
      },
      orderBy: { skuCode: 'asc' }
    })

    return NextResponse.json(skus)
  } catch (error) {
    console.error('Failed to fetch SKUs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SKUs' },
      { status: 500 }
    )
  }
}