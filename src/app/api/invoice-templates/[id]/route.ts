import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: params.id },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            fullName: true
          }
        },
        rules: {
          orderBy: {
            priority: 'asc'
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)

  } catch (error) {
    console.error('Failed to fetch invoice template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // If setting as default, unset other defaults for this warehouse
    if (data.isDefault) {
      const template = await prisma.invoiceTemplate.findUnique({
        where: { id: params.id },
        select: { warehouseId: true }
      })

      if (template) {
        await prisma.invoiceTemplate.updateMany({
          where: {
            warehouseId: template.warehouseId,
            isDefault: true,
            id: { not: params.id }
          },
          data: {
            isDefault: false
          }
        })
      }
    }

    const updatedTemplate = await prisma.invoiceTemplate.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        isDefault: data.isDefault
      },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            fullName: true
          }
        },
        rules: true
      }
    })

    return NextResponse.json(updatedTemplate)

  } catch (error) {
    console.error('Failed to update invoice template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if template is default
    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: params.id },
      select: { isDefault: true }
    })

    if (template?.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default template' }, { status: 400 })
    }

    // Delete template (rules will be cascade deleted)
    await prisma.invoiceTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete invoice template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}