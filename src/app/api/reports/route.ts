import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reportType, period, warehouseId } = await request.json()

    let data: any[] = []
    let fileName = ''

    switch (reportType) {
      case 'monthly-inventory':
        data = await generateMonthlyInventoryReport(period, warehouseId)
        fileName = `monthly_inventory_${period}`
        break
        
      case 'inventory-ledger':
        data = await generateInventoryLedger(period, warehouseId)
        fileName = `inventory_ledger_${period}`
        break
        
      case 'storage-charges':
        data = await generateStorageCharges(period, warehouseId)
        fileName = `storage_charges_${period}`
        break
        
      case 'cost-summary':
        data = await generateCostSummary(period, warehouseId)
        fileName = `cost_summary_${period}`
        break

      case 'reconciliation':
        data = await generateReconciliationReport(period, warehouseId)
        fileName = `reconciliation_${period}`
        break

      case 'inventory-balance':
        data = await generateInventoryBalanceReport(warehouseId)
        fileName = `inventory_balance_${new Date().toISOString().split('T')[0]}`
        break

      case 'low-stock':
        data = await generateLowStockReport(warehouseId)
        fileName = `low_stock_${new Date().toISOString().split('T')[0]}`
        break

      case 'cost-analysis':
        data = await generateCostAnalysisReport(period, warehouseId)
        fileName = `cost_analysis_${period}`
        break

      case 'monthly-billing':
        data = await generateMonthlyBillingReport(period, warehouseId)
        fileName = `monthly_billing_${period}`
        break
        
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Report')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}

async function generateMonthlyInventoryReport(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  const startDate = startOfMonth(new Date(year, month - 1))
  const endDate = endOfMonth(new Date(year, month - 1))

  const balances = await prisma.inventoryBalance.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: {
      warehouse: true,
      sku: true,
    },
  })

  return balances.map(b => ({
    'Warehouse': b.warehouse.name,
    'SKU Code': b.sku.skuCode,
    'Description': b.sku.description,
    'Batch/Lot': b.batchLot,
    'Current Cartons': b.currentCartons,
    'Current Pallets': b.currentPallets,
    'Units per Carton': b.sku.unitsPerCarton,
    'Total Units': b.currentUnits,
    'Report Date': new Date().toLocaleDateString(),
  }))
}

async function generateInventoryLedger(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  const startDate = startOfMonth(new Date(year, month - 1))
  const endDate = endOfMonth(new Date(year, month - 1))

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      warehouse: true,
      sku: true,
      createdBy: true,
    },
    orderBy: { transactionDate: 'desc' },
  })

  return transactions.map(t => ({
    'Date': new Date(t.transactionDate).toLocaleDateString(),
    'Transaction ID': t.transactionId,
    'Warehouse': t.warehouse.name,
    'SKU': t.sku.skuCode,
    'Batch/Lot': t.batchLot,
    'Type': t.transactionType,
    'Reference': t.referenceId || '',
    'Cartons In': t.cartonsIn,
    'Cartons Out': t.cartonsOut,
    'Notes': t.notes || '',
    'Created By': t.createdBy.fullName,
  }))
}

async function generateStorageCharges(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  
  // Billing periods run from 16th to 15th
  const billingStart = new Date(year, month - 2, 16)
  const billingEnd = new Date(year, month - 1, 15)

  const storageLedger = await prisma.storageLedger.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      billingPeriodStart: billingStart,
      billingPeriodEnd: billingEnd,
    },
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { warehouse: { name: 'asc' } },
      { weekEndingDate: 'asc' },
      { sku: { skuCode: 'asc' } },
    ],
  })

  return storageLedger.map(s => ({
    'Week Ending': new Date(s.weekEndingDate).toLocaleDateString(),
    'Warehouse': s.warehouse.name,
    'SKU': s.sku.skuCode,
    'Batch/Lot': s.batchLot,
    'Cartons (Monday)': s.cartonsEndOfMonday,
    'Pallets Charged': s.storagePalletsCharged,
    'Weekly Rate': s.applicableWeeklyRate,
    'Weekly Cost': s.calculatedWeeklyCost,
    'Billing Period': `${billingStart.toLocaleDateString()} - ${billingEnd.toLocaleDateString()}`,
  }))
}

async function generateCostSummary(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  
  // Get storage costs
  const storageCosts = await prisma.storageLedger.groupBy({
    by: ['warehouseId'],
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      billingPeriodStart: new Date(year, month - 2, 16),
      billingPeriodEnd: new Date(year, month - 1, 15),
    },
    _sum: {
      calculatedWeeklyCost: true,
    },
  })

  // Get warehouse names
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]))

  return storageCosts.map(cost => ({
    'Warehouse': warehouseMap.get(cost.warehouseId) || 'Unknown',
    'Storage Costs': cost._sum.calculatedWeeklyCost || 0,
    'Handling Costs': 0, // To be calculated from calculated_costs table
    'Other Costs': 0, // To be calculated
    'Total Costs': cost._sum.calculatedWeeklyCost || 0,
    'Period': `${period}`,
  }))
}

async function generateReconciliationReport(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  const startDate = new Date(year, month - 2, 16)
  const endDate = new Date(year, month - 1, 15)

  const invoices = await prisma.invoiceInput.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      warehouse: true,
    },
    orderBy: {
      invoiceDate: 'asc',
    },
  })

  // Get calculated costs for the same period
  const calculatedCosts = await prisma.storageLedger.groupBy({
    by: ['warehouseId'],
    where: {
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
    },
    _sum: {
      calculatedWeeklyCost: true,
    },
  })

  const costMap = new Map(
    calculatedCosts.map(c => [c.warehouseId, c._sum.calculatedWeeklyCost || 0])
  )

  return invoices.map(invoice => ({
    'Invoice Number': invoice.invoiceNumber,
    'Invoice Date': invoice.invoiceDate.toLocaleDateString(),
    'Warehouse': invoice.warehouse.name,
    'Invoiced Amount': `£${invoice.totalAmount.toFixed(2)}`,
    'Calculated Amount': `£${(costMap.get(invoice.warehouseId) || 0).toFixed(2)}`,
    'Variance': `£${(invoice.totalAmount - (costMap.get(invoice.warehouseId) || 0)).toFixed(2)}`,
    'Status': Math.abs(invoice.totalAmount - (costMap.get(invoice.warehouseId) || 0)) < 0.01 ? 'Matched' : 'Variance',
  }))
}

async function generateInventoryBalanceReport(warehouseId?: string) {
  const data = await prisma.inventoryBalance.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { warehouse: { name: 'asc' } },
      { sku: { skuCode: 'asc' } },
    ],
  })

  return data.map(balance => ({
    'Warehouse': balance.warehouse.name,
    'SKU Code': balance.sku.skuCode,
    'SKU Description': balance.sku.description,
    'Batch/Lot': balance.batchLot,
    'Cartons': balance.currentCartons,
    'Pallets': balance.currentPallets,
    'Units': balance.currentUnits,
    'Last Transaction': balance.lastTransactionDate?.toLocaleDateString() || 'N/A',
    'Days Since Last Activity': balance.lastTransactionDate 
      ? Math.floor((new Date().getTime() - balance.lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 'N/A',
  }))
}

async function generateLowStockReport(warehouseId?: string) {
  const data = await prisma.inventoryBalance.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      currentCartons: {
        lt: 10, // Low stock threshold
      }
    },
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { currentCartons: 'asc' },
      { warehouse: { name: 'asc' } },
      { sku: { skuCode: 'asc' } },
    ],
  })

  return data.map(balance => ({
    'Warehouse': balance.warehouse.name,
    'SKU Code': balance.sku.skuCode,
    'SKU Description': balance.sku.description,
    'Batch/Lot': balance.batchLot,
    'Current Stock': balance.currentCartons,
    'Status': balance.currentCartons === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
    'Days Since Last Receipt': balance.lastTransactionDate 
      ? Math.floor((new Date().getTime() - balance.lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 'N/A',
    'Action Required': balance.currentCartons === 0 ? 'URGENT - Reorder immediately' : 'Reorder soon',
  }))
}

async function generateCostAnalysisReport(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  const startDate = new Date(year, month - 2, 16)
  const endDate = new Date(year, month - 1, 15)

  const storageCosts = await prisma.storageLedger.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
    },
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { warehouse: { name: 'asc' } },
      { sku: { skuCode: 'asc' } },
    ],
  })

  const grouped = storageCosts.reduce((acc, item) => {
    const key = `${item.warehouseId}-${item.skuId}`
    if (!acc[key]) {
      acc[key] = {
        warehouse: item.warehouse.name,
        sku: item.sku.skuCode,
        description: item.sku.description,
        totalCartons: 0,
        totalCost: 0,
        weeks: 0,
      }
    }
    acc[key].totalCartons += item.cartons
    acc[key].totalCost += item.calculatedWeeklyCost
    acc[key].weeks += 1
    return acc
  }, {} as any)

  return Object.values(grouped).map((item: any) => ({
    'Warehouse': item.warehouse,
    'SKU Code': item.sku,
    'Description': item.description,
    'Average Cartons': Math.round(item.totalCartons / item.weeks),
    'Total Storage Cost': `£${item.totalCost.toFixed(2)}`,
    'Average Weekly Cost': `£${(item.totalCost / item.weeks).toFixed(2)}`,
    'Period': `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
  }))
}

async function generateMonthlyBillingReport(period: string, warehouseId?: string) {
  const [year, month] = period.split('-').map(Number)
  const billingStart = new Date(year, month - 2, 16)
  const billingEnd = new Date(year, month - 1, 15)

  // Get all warehouses
  const warehouses = warehouseId 
    ? await prisma.warehouse.findMany({ where: { id: warehouseId } })
    : await prisma.warehouse.findMany()

  const billingData = await Promise.all(
    warehouses.map(async (warehouse) => {
      // Storage costs
      const storageCost = await prisma.storageLedger.aggregate({
        where: {
          warehouseId: warehouse.id,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
        },
        _sum: {
          calculatedWeeklyCost: true,
        },
      })

      // Transaction counts
      const transactions = await prisma.inventoryTransaction.groupBy({
        by: ['transactionType'],
        where: {
          warehouseId: warehouse.id,
          transactionDate: {
            gte: billingStart,
            lte: billingEnd,
          },
        },
        _count: true,
      })

      const receiveCount = transactions.find(t => t.transactionType === 'RECEIVE')?._count || 0
      const shipCount = transactions.find(t => t.transactionType === 'SHIP')?._count || 0

      return {
        'Warehouse': warehouse.name,
        'Storage Costs': `£${(storageCost._sum.calculatedWeeklyCost || 0).toFixed(2)}`,
        'Receiving Transactions': receiveCount,
        'Shipping Transactions': shipCount,
        'Handling Fees': `£${((receiveCount + shipCount) * 25).toFixed(2)}`, // £25 per transaction
        'Total Charges': `£${((storageCost._sum.calculatedWeeklyCost || 0) + ((receiveCount + shipCount) * 25)).toFixed(2)}`,
        'Billing Period': `${billingStart.toLocaleDateString()} - ${billingEnd.toLocaleDateString()}`,
      }
    })
  )

  return billingData
}