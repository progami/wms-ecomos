import { prisma } from '@/lib/prisma'
import { addDays, startOfWeek, endOfWeek, eachWeekOfInterval, isMonday, startOfDay } from 'date-fns'

/**
 * Calculate storage ledger entries based on inventory snapshots
 * Storage is calculated weekly, with snapshots taken every Monday
 */
export async function calculateStorageLedger(
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  warehouseId?: string
) {
  console.log('📊 Calculating storage ledger entries...')
  
  // Get all Mondays in the billing period
  const mondays = getMondays(billingPeriodStart, billingPeriodEnd)
  
  // Get warehouse filter
  const warehouseFilter = warehouseId ? { warehouseId } : {}
  
  // Get all active inventory combinations
  const activeCombinations = await prisma.inventoryBalance.findMany({
    where: {
      ...warehouseFilter,
      currentCartons: { gt: 0 }
    },
    include: {
      warehouse: true,
      sku: true,
    }
  })
  
  let created = 0
  
  for (const monday of mondays) {
    const weekEndingDate = endOfWeek(monday, { weekStartsOn: 1 }) // Week ends on Sunday
    
    for (const combo of activeCombinations) {
      // Get inventory balance as of Monday
      const balanceAsOfMonday = await getInventoryBalanceAsOfDate(
        combo.warehouseId,
        combo.skuId,
        combo.batchLot,
        monday
      )
      
      if (balanceAsOfMonday === 0) continue
      
      // Get warehouse config for pallet calculation
      const warehouseConfig = await prisma.warehouseSkuConfig.findFirst({
        where: {
          warehouseId: combo.warehouseId,
          skuId: combo.skuId,
          effectiveDate: { lte: monday },
          OR: [
            { endDate: null },
            { endDate: { gte: monday } }
          ]
        }
      })
      
      if (!warehouseConfig) {
        console.warn(`No warehouse config found for ${combo.warehouse.name} - ${combo.sku.skuCode}`)
        continue
      }
      
      // Calculate pallets (round up)
      const palletsCharged = Math.ceil(balanceAsOfMonday / warehouseConfig.storageCartonsPerPallet)
      
      // Get applicable storage rate
      const storageRate = await prisma.costRate.findFirst({
        where: {
          warehouseId: combo.warehouseId,
          costCategory: 'Storage',
          costName: { contains: 'pallet' },
          effectiveDate: { lte: monday },
          OR: [
            { endDate: null },
            { endDate: { gte: monday } }
          ]
        }
      })
      
      if (!storageRate) {
        console.warn(`No storage rate found for ${combo.warehouse.name}`)
        continue
      }
      
      // Create storage ledger entry
      const slId = `SL-${monday.toISOString().split('T')[0]}-${combo.warehouse.code}-${combo.sku.skuCode}-${combo.batchLot}`
      
      try {
        await prisma.storageLedger.upsert({
          where: { slId },
          update: {
            cartonsEndOfMonday: balanceAsOfMonday,
            storagePalletsCharged: palletsCharged,
            applicableWeeklyRate: storageRate.costValue.toNumber(),
            calculatedWeeklyCost: palletsCharged * storageRate.costValue.toNumber(),
          },
          create: {
            slId,
            weekEndingDate,
            warehouseId: combo.warehouseId,
            skuId: combo.skuId,
            batchLot: combo.batchLot,
            cartonsEndOfMonday: balanceAsOfMonday,
            storagePalletsCharged: palletsCharged,
            applicableWeeklyRate: storageRate.costValue.toNumber(),
            calculatedWeeklyCost: palletsCharged * storageRate.costValue.toNumber(),
            billingPeriodStart,
            billingPeriodEnd,
          }
        })
        created++
      } catch (error) {
        console.error(`Error creating storage ledger entry ${slId}:`, error)
      }
    }
  }
  
  console.log(`✅ Created/updated ${created} storage ledger entries`)
  return created
}

/**
 * Get inventory balance as of a specific date
 */
async function getInventoryBalanceAsOfDate(
  warehouseId: string,
  skuId: string,
  batchLot: string,
  asOfDate: Date
): Promise<number> {
  // Get all transactions up to and including the date
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      warehouseId,
      skuId,
      batchLot,
      transactionDate: { lte: asOfDate }
    },
    orderBy: { transactionDate: 'asc' }
  })
  
  // Calculate running balance
  let balance = 0
  for (const transaction of transactions) {
    balance += transaction.cartonsIn - transaction.cartonsOut
  }
  
  return Math.max(0, balance) // Never return negative balance
}

/**
 * Get all Mondays between two dates
 */
function getMondays(startDate: Date, endDate: Date): Date[] {
  const start = startOfWeek(startDate, { weekStartsOn: 1 })
  const end = endOfWeek(endDate, { weekStartsOn: 1 })
  
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
  
  return weeks.map(week => {
    // Each week starts on Monday
    return startOfDay(week)
  })
}

/**
 * Generate storage ledger for a specific billing period
 */
export async function generateStorageLedgerForPeriod(
  year: number,
  month: number,
  warehouseId?: string
) {
  // Billing periods run from 16th to 15th
  const billingPeriodStart = new Date(year, month - 1, 16) // 16th of the month
  const billingPeriodEnd = new Date(year, month, 15) // 15th of next month
  
  return calculateStorageLedger(billingPeriodStart, billingPeriodEnd, warehouseId)
}