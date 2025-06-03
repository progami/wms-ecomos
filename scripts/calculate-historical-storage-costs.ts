import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Get Monday at 23:59:59 CT
function getMondayEnd(date: Date): Date {
  const monday = new Date(date)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1) // adjust for Sunday
  monday.setDate(diff)
  monday.setHours(23, 59, 59, 999)
  return monday
}

async function calculateHistoricalStorageCosts() {
  try {
    console.log('Calculating historical storage costs...')
    
    // Get system user
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@warehouse.com' }
    })
    
    if (!systemUser) {
      console.error('System user not found. Creating one...')
      const newSystemUser = await prisma.user.create({
        data: {
          email: 'system@warehouse.com',
          password: 'not-used',
          fullName: 'System',
          role: 'admin',
          isActive: false
        }
      })
      var systemUserId = newSystemUser.id
    } else {
      var systemUserId = systemUser.id
    }
    
    // Get all transactions to find date range
    const transactions = await prisma.inventoryTransaction.findMany({
      orderBy: { transactionDate: 'asc' },
      take: 1
    })
    
    if (transactions.length === 0) {
      console.log('No transactions found')
      await prisma.$disconnect()
      return
    }
    
    const firstTransaction = transactions[0]
    const startDate = new Date(firstTransaction.transactionDate)
    const endDate = new Date()
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    // Get all warehouses except Amazon
    const warehouses = await prisma.warehouse.findMany({
      where: {
        isActive: true,
        NOT: { code: 'AMZN' }
      }
    })
    
    // Get storage rates for each warehouse
    const storageRates = await prisma.costRate.findMany({
      where: {
        costCategory: 'Storage',
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } }
        ]
      }
    })
    
    console.log(`Found ${warehouses.length} warehouses and ${storageRates.length} storage rates`)
    
    // Find all Mondays in the date range
    const mondays: Date[] = []
    let current = new Date(startDate)
    
    // Move to next Monday if start date is not Monday
    const daysUntilMonday = (8 - current.getDay()) % 7
    if (daysUntilMonday > 0) {
      current.setDate(current.getDate() + daysUntilMonday)
    }
    
    while (current <= endDate) {
      mondays.push(new Date(current))
      current.setDate(current.getDate() + 7)
    }
    
    console.log(`Processing ${mondays.length} Monday snapshots...`)
    
    // For each Monday, calculate storage costs
    for (const monday of mondays) {
      const mondayEnd = getMondayEnd(monday)
      const weekNumber = getWeekNumber(monday)
      
      console.log(`\nProcessing Week ${weekNumber} - ${monday.toISOString().split('T')[0]}`)
      
      // Calculate for each warehouse
      for (const warehouse of warehouses) {
        // Get all transactions up to Monday end for this warehouse
        const warehouseTransactions = await prisma.inventoryTransaction.findMany({
          where: {
            warehouseId: warehouse.id,
            transactionDate: { lte: mondayEnd }
          },
          include: { sku: true }
        })
        
        if (warehouseTransactions.length === 0) continue
        
        // Calculate balance by SKU/batch
        const balanceMap = new Map<string, { 
          skuId: string, 
          batchLot: string, 
          cartons: number,
          sku: any 
        }>()
        
        for (const transaction of warehouseTransactions) {
          const key = `${transaction.skuId}-${transaction.batchLot}`
          const existing = balanceMap.get(key) || {
            skuId: transaction.skuId,
            batchLot: transaction.batchLot,
            cartons: 0,
            sku: transaction.sku
          }
          
          existing.cartons += transaction.cartonsIn - transaction.cartonsOut
          
          if (existing.cartons > 0) {
            balanceMap.set(key, existing)
          } else {
            balanceMap.delete(key)
          }
        }
        
        // Calculate total pallets
        let totalPallets = 0
        
        for (const [key, balance] of balanceMap) {
          if (balance.cartons <= 0) continue
          
          // Get pallet configuration
          const inventoryBalance = await prisma.inventoryBalance.findFirst({
            where: {
              warehouseId: warehouse.id,
              skuId: balance.skuId,
              batchLot: balance.batchLot
            }
          })
          
          let cartonsPerPallet = 1
          
          if (inventoryBalance?.storageCartonsPerPallet) {
            cartonsPerPallet = inventoryBalance.storageCartonsPerPallet
          } else {
            // Try warehouse config
            const warehouseConfig = await prisma.warehouseSkuConfig.findFirst({
              where: {
                warehouseId: warehouse.id,
                skuId: balance.skuId,
                effectiveDate: { lte: monday }
              },
              orderBy: { effectiveDate: 'desc' }
            })
            
            if (warehouseConfig?.storageCartonsPerPallet) {
              cartonsPerPallet = warehouseConfig.storageCartonsPerPallet
            }
          }
          
          const pallets = Math.ceil(balance.cartons / cartonsPerPallet)
          totalPallets += pallets
        }
        
        if (totalPallets > 0) {
          // Find applicable storage rate
          const rate = storageRates.find(r => r.warehouseId === warehouse.id)
          
          if (rate) {
            // Determine billing period
            const billingStart = new Date(monday)
            if (monday.getDate() <= 15) {
              billingStart.setMonth(billingStart.getMonth() - 1)
            }
            billingStart.setDate(16)
            billingStart.setHours(0, 0, 0, 0)
            
            const billingEnd = new Date(billingStart)
            billingEnd.setMonth(billingEnd.getMonth() + 1)
            billingEnd.setDate(15)
            billingEnd.setHours(23, 59, 59, 999)
            
            const cost = totalPallets * Number(rate.costValue)
            
            // Check if cost already exists for this week
            const existing = await prisma.calculatedCost.findFirst({
              where: {
                warehouseId: warehouse.id,
                costRateId: rate.id,
                transactionDate: mondayEnd,
                transactionType: 'STORAGE'
              }
            })
            
            if (!existing) {
              // Get the first SKU for the storage cost (storage is warehouse-level)
              const firstItem = Array.from(balanceMap.values())[0]
              if (!firstItem) continue
              
              // Get week ending (Sunday)
              const weekEnding = new Date(monday)
              weekEnding.setDate(weekEnding.getDate() + 6)
              
              await prisma.calculatedCost.create({
                data: {
                  calculatedCostId: `STORAGE-${warehouse.code}-W${weekNumber}-${monday.getFullYear()}`,
                  transactionType: 'STORAGE',
                  transactionReferenceId: `W${weekNumber}-${monday.getFullYear()}`,
                  costRateId: rate.id,
                  warehouseId: warehouse.id,
                  skuId: firstItem.skuId, // Required field, using first SKU
                  transactionDate: mondayEnd,
                  billingWeekEnding: weekEnding,
                  billingPeriodStart: billingStart,
                  billingPeriodEnd: billingEnd,
                  quantityCharged: totalPallets,
                  applicableRate: rate.costValue,
                  calculatedCost: cost,
                  finalExpectedCost: cost,
                  notes: `Monday snapshot: ${totalPallets} pallets across ${balanceMap.size} SKUs`,
                  createdById: systemUserId
                }
              })
              
              console.log(`  ${warehouse.name}: ${totalPallets} pallets = £${cost.toFixed(2)}`)
            } else {
              console.log(`  ${warehouse.name}: Cost already calculated`)
            }
          } else {
            console.log(`  ${warehouse.name}: No storage rate found`)
          }
        } else {
          console.log(`  ${warehouse.name}: No inventory`)
        }
      }
    }
    
    // Calculate summary
    const totalCosts = await prisma.calculatedCost.aggregate({
      _sum: { finalExpectedCost: true },
      _count: true
    })
    
    console.log('\n=== Summary ===')
    console.log(`Total calculated costs: ${totalCosts._count}`)
    console.log(`Total amount: £${Number(totalCosts._sum.finalExpectedCost || 0).toFixed(2)}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

calculateHistoricalStorageCosts()