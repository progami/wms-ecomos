import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CostCalculationService } from '@/lib/services/cost-calculation-service'
import { getBillingPeriod } from '@/lib/calculations/cost-aggregation'

export const dynamic = 'force-dynamic'

// POST /api/finance/calculate-costs - Calculate and store costs for a billing period
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to trigger cost calculation
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { warehouseId, startDate, endDate } = body

    if (!warehouseId) {
      return NextResponse.json(
        { error: 'Warehouse ID is required' },
        { status: 400 }
      )
    }

    // Determine billing period
    let billingPeriod: { start: Date; end: Date }
    
    if (startDate && endDate) {
      billingPeriod = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      // Default to current billing period
      billingPeriod = getBillingPeriod(new Date())
    }

    // Calculate and store costs
    await CostCalculationService.calculateAndStoreCosts(
      warehouseId,
      billingPeriod,
      session.user.id
    )

    // Get summary of calculated costs
    const summary = await CostCalculationService.getCalculatedCostsForReconciliation(
      warehouseId,
      billingPeriod
    )

    return NextResponse.json({
      success: true,
      message: 'Costs calculated successfully',
      billingPeriod: {
        start: billingPeriod.start.toISOString(),
        end: billingPeriod.end.toISOString()
      },
      summary: {
        totalCosts: summary.reduce((sum, cost) => sum + cost.totalAmount, 0),
        costsByCategory: summary.reduce((acc, cost) => {
          if (!acc[cost.costCategory]) {
            acc[cost.costCategory] = 0
          }
          acc[cost.costCategory] += cost.totalAmount
          return acc
        }, {} as Record<string, number>),
        itemCount: summary.length
      }
    })
  } catch (error) {
    console.error('Error calculating costs:', error)
    return NextResponse.json(
      { error: 'Failed to calculate costs' },
      { status: 500 }
    )
  }
}