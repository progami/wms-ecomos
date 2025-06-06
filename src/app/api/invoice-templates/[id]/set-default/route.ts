import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { warehouseId } = await request.json()

    // Unset all other defaults for this warehouse
    await prisma.invoiceTemplate.updateMany({
      where: {
        warehouseId,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    })

    // Set this template as default
    const template = await prisma.invoiceTemplate.update({
      where: { id: params.id },
      data: {
        isDefault: true,
        isActive: true // Ensure default templates are active
      }
    })

    return NextResponse.json(template)

  } catch (error) {
    console.error('Failed to set default template:', error)
    return NextResponse.json({ error: 'Failed to set default template' }, { status: 500 })
  }
}