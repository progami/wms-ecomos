import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.invoiceTemplate.findMany({
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
      },
      orderBy: [
        { warehouseId: 'asc' },
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(templates)

  } catch (error) {
    console.error('Failed to fetch invoice templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, warehouseId, description, isActive, isDefault, rules } = data

    // Validate required fields
    if (!name || !warehouseId || !rules || rules.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as default, unset other defaults for this warehouse
    if (isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: {
          warehouseId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Create template with rules
    const template = await prisma.invoiceTemplate.create({
      data: {
        name,
        warehouseId,
        description,
        isActive,
        isDefault,
        createdById: session.user.id,
        rules: {
          create: rules.map((rule: any) => ({
            transactionType: rule.transactionType,
            costCategory: rule.costCategory,
            costName: rule.costName,
            calculationType: rule.calculationType,
            rateValue: rule.rateValue || null,
            rateMultiplier: rule.rateMultiplier || null,
            minCharge: rule.minCharge || null,
            maxCharge: rule.maxCharge || null,
            unitOfMeasure: rule.unitOfMeasure,
            includeInInvoice: rule.includeInInvoice !== false,
            applyToAllSkus: rule.applyToAllSkus !== false,
            specificSkuIds: rule.specificSkuIds || [],
            priority: rule.priority || 0,
            conditions: rule.conditions || null,
            notes: rule.notes || null
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

    return NextResponse.json(template)

  } catch (error) {
    console.error('Failed to create invoice template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}