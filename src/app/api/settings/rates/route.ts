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

    // All authenticated users can view rates

    const rates = await prisma.costRate.findMany({
      include: {
        warehouse: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { costCategory: 'asc' },
        { effectiveDate: 'desc' }
      ]
    })

    // Transform the data to match the expected format
    const transformedRates = rates.map(rate => ({
      id: rate.id,
      name: rate.costName,
      type: rate.costCategory.toUpperCase(),
      unit: rate.unitOfMeasure,
      rate: parseFloat(rate.costValue.toString()),
      effectiveDate: rate.effectiveDate.toISOString(),
      warehouseId: rate.warehouseId,
      warehouse: rate.warehouse
    }))

    return NextResponse.json(transformedRates)
  } catch (error) {
    console.error('Error fetching rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create rates
    if (!['system_admin', 'finance_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, unit, rate, effectiveDate, warehouseId } = body

    // Validate required fields
    if (!name || !type || !unit || rate === undefined || !effectiveDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the first warehouse if none specified
    let targetWarehouseId = warehouseId
    if (!targetWarehouseId) {
      const firstWarehouse = await prisma.warehouse.findFirst({
        where: { isActive: true }
      })
      targetWarehouseId = firstWarehouse?.id
    }

    if (!targetWarehouseId) {
      return NextResponse.json(
        { error: 'No active warehouse found' },
        { status: 400 }
      )
    }

    const newRate = await prisma.costRate.create({
      data: {
        warehouseId: targetWarehouseId,
        costCategory: type,
        costName: name,
        costValue: rate,
        unitOfMeasure: unit,
        effectiveDate: new Date(effectiveDate),
        createdById: session.user.id
      },
      include: {
        warehouse: {
          select: {
            name: true
          }
        }
      }
    })

    const transformedRate = {
      id: newRate.id,
      name: newRate.costName,
      type: newRate.costCategory.toUpperCase(),
      unit: newRate.unitOfMeasure,
      rate: parseFloat(newRate.costValue.toString()),
      effectiveDate: newRate.effectiveDate.toISOString(),
      warehouseId: newRate.warehouseId,
      warehouse: newRate.warehouse
    }

    return NextResponse.json(transformedRate)
  } catch (error) {
    console.error('Error creating rate:', error)
    return NextResponse.json(
      { error: 'Failed to create rate' },
      { status: 500 }
    )
  }
}