import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update rates
    if (!['system_admin', 'finance_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, unit, rate } = body

    // Validate required fields
    if (!name || !unit || rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const updatedRate = await prisma.costRate.update({
      where: { id: params.id },
      data: {
        costName: name,
        unitOfMeasure: unit,
        costValue: rate,
        updatedAt: new Date()
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
      id: updatedRate.id,
      name: updatedRate.costName,
      type: updatedRate.costCategory.toUpperCase(),
      unit: updatedRate.unitOfMeasure,
      rate: parseFloat(updatedRate.costValue.toString()),
      effectiveDate: updatedRate.effectiveDate.toISOString(),
      warehouseId: updatedRate.warehouseId,
      warehouse: updatedRate.warehouse
    }

    return NextResponse.json(transformedRate)
  } catch (error) {
    console.error('Error updating rate:', error)
    return NextResponse.json(
      { error: 'Failed to update rate' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete rates
    if (session.user.role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.costRate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rate:', error)
    return NextResponse.json(
      { error: 'Failed to delete rate' },
      { status: 500 }
    )
  }
}