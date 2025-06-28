import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, format, startOfMonth, endOfMonth } from 'date-fns'
import { CostCalculationService } from '@/lib/services/cost-calculation-service'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const warehouseId = searchParams.get('warehouseId')
    const groupBy = searchParams.get('groupBy') || 'week' // week, month, warehouse, sku

    // Default to last 3 months if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    // Set time to end of day for end date
    end.setHours(23, 59, 59, 999)

    // Get all warehouses if not specified
    const warehouses = warehouseId 
      ? [await prisma.warehouse.findUnique({ where: { id: warehouseId } })]
      : await prisma.warehouse.findMany({ where: { isActive: true } })

    // Aggregate costs by period
    const ledger: any[] = []
    const costTotals = {
      storage: 0,
      container: 0,
      pallet: 0,
      carton: 0,
      unit: 0,
      shipment: 0,
      accessorial: 0,
      total: 0
    }

    // Process each warehouse
    for (const warehouse of warehouses) {
      if (!warehouse) continue

      // First ensure calculated costs exist for this period
      await CostCalculationService.calculateAndStoreCosts(
        warehouse.id,
        { start, end },
        session.user.id
      )

      // Get calculated costs from database
      const calculatedCosts = await prisma.calculatedCost.findMany({
        where: {
          warehouseId: warehouse.id,
          transactionDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          costRate: true,
          sku: true
        }
      })

      // Group costs by period
      const periodMap = new Map<string, any>()

      for (const cost of calculatedCosts) {
        // Determine period key based on groupBy
        let periodKey: string
        let periodStart: Date
        let periodEnd: Date

        if (groupBy === 'month') {
          const monthStart = startOfMonth(cost.transactionDate)
          periodKey = format(monthStart, 'yyyy-MM')
          periodStart = monthStart
          periodEnd = endOfMonth(monthStart)
        } else { // week
          const weekStart = startOfWeek(cost.transactionDate, { weekStartsOn: 1 })
          periodKey = format(weekStart, 'yyyy-MM-dd')
          periodStart = weekStart
          periodEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            month: groupBy === 'month' ? format(periodStart, 'MMM yyyy') : undefined,
            weekStarting: groupBy === 'week' ? periodStart : undefined,
            weekEnding: groupBy === 'week' ? periodEnd : undefined,
            warehouse: warehouse.name,
            costs: {
              storage: 0,
              container: 0,
              pallet: 0,
              carton: 0,
              unit: 0,
              shipment: 0,
              accessorial: 0,
              total: 0
            },
            details: []
          })
        }

        const period = periodMap.get(periodKey)
        const category = cost.costRate.costCategory.toLowerCase() as keyof typeof costTotals
        const amount = Number(cost.finalExpectedCost)
        
        if (category in period.costs && category !== 'total') {
          period.costs[category] += amount
          period.costs.total += amount
          costTotals[category] += amount
          costTotals.total += amount
        }

        // Add detail
        period.details.push({
          transactionDate: cost.transactionDate,
          transactionId: cost.transactionReferenceId,
          transactionType: cost.transactionType,
          warehouse: warehouse.name,
          sku: cost.sku.skuCode,
          batchLot: cost.batchLot || 'N/A',
          category: cost.costRate.costCategory,
          rateDescription: cost.costRate.costName,
          quantity: Number(cost.quantityCharged),
          rate: Number(cost.applicableRate),
          cost: amount
        })
      }

      // Add periods to ledger
      ledger.push(...Array.from(periodMap.values()))
    }

    // Sort ledger by date
    ledger.sort((a, b) => {
      if (groupBy === 'month') {
        return new Date(a.month).getTime() - new Date(b.month).getTime()
      } else {
        return new Date(a.weekStarting).getTime() - new Date(b.weekStarting).getTime()
      }
    })

    return NextResponse.json({
      ledger,
      totals: costTotals,
      groupBy,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    })
  } catch (error) {
    // console.error('Cost ledger error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch cost ledger',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}