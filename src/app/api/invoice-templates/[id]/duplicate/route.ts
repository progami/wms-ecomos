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

    // Get the template to duplicate
    const originalTemplate = await prisma.invoiceTemplate.findUnique({
      where: { id: params.id },
      include: {
        rules: true
      }
    })

    if (!originalTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create a copy with a new name
    const newTemplate = await prisma.invoiceTemplate.create({
      data: {
        name: `${originalTemplate.name} (Copy)`,
        warehouseId: originalTemplate.warehouseId,
        description: originalTemplate.description,
        isActive: false, // New copies start as inactive
        isDefault: false, // Copies are never default
        createdById: session.user.id,
        rules: {
          create: originalTemplate.rules.map(rule => ({
            transactionType: rule.transactionType,
            costCategory: rule.costCategory,
            costName: rule.costName,
            calculationType: rule.calculationType,
            rateValue: rule.rateValue,
            rateMultiplier: rule.rateMultiplier,
            minCharge: rule.minCharge,
            maxCharge: rule.maxCharge,
            unitOfMeasure: rule.unitOfMeasure,
            includeInInvoice: rule.includeInInvoice,
            applyToAllSkus: rule.applyToAllSkus,
            specificSkuIds: rule.specificSkuIds,
            priority: rule.priority,
            conditions: rule.conditions,
            notes: rule.notes
          }))
        }
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

    return NextResponse.json(newTemplate)

  } catch (error) {
    console.error('Failed to duplicate template:', error)
    return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 })
  }
}