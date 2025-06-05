import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function enforceOneActiveStorageRate() {
  console.log('🔍 Checking and enforcing one active storage rate per warehouse...\n')

  // Get all storage rates
  const storageRates = await prisma.costRate.findMany({
    where: {
      costCategory: CostCategory.Storage
    },
    include: {
      warehouse: true
    },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { effectiveDate: 'asc' }
    ]
  })

  console.log(`Found ${storageRates.length} storage rates total\n`)

  // Group by warehouse
  const ratesByWarehouse = new Map<string, typeof storageRates>()
  storageRates.forEach(rate => {
    const warehouseId = rate.warehouseId
    if (!ratesByWarehouse.has(warehouseId)) {
      ratesByWarehouse.set(warehouseId, [])
    }
    ratesByWarehouse.get(warehouseId)!.push(rate)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check each warehouse
  for (const [warehouseId, rates] of ratesByWarehouse.entries()) {
    const warehouseName = rates[0].warehouse.name
    const warehouseCode = rates[0].warehouse.code
    
    console.log(`\n${warehouseCode} (${warehouseName}):`)
    console.log('=' * 60)
    
    // Find currently active rates
    const activeRates = rates.filter(rate => {
      const isActive = rate.effectiveDate <= today && (!rate.endDate || rate.endDate > today)
      return isActive
    })

    console.log(`Total storage rates: ${rates.length}`)
    console.log(`Currently active: ${activeRates.length}`)

    // Display all rates for this warehouse
    rates.forEach(rate => {
      const isActive = rate.effectiveDate <= today && (!rate.endDate || rate.endDate > today)
      const status = isActive ? '🟢 ACTIVE' : '⚪ INACTIVE'
      console.log(`  ${status} "${rate.costName}" = £${rate.costValue} per ${rate.unitOfMeasure}`)
      console.log(`         Effective: ${rate.effectiveDate.toISOString().split('T')[0]}${rate.endDate ? ` to ${rate.endDate.toISOString().split('T')[0]}` : ' (no end date)'}`)
    })

    // Fix if multiple active rates
    if (activeRates.length > 1) {
      console.log(`\n⚠️  WARNING: ${activeRates.length} active storage rates found!`)
      console.log('   Fixing by keeping only the most recent rate active...')
      
      // Sort by effective date descending to get the most recent
      activeRates.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())
      
      // Keep the first (most recent) active, end date the others
      for (let i = 1; i < activeRates.length; i++) {
        const rateToEnd = activeRates[i]
        console.log(`   Setting end date for: "${rateToEnd.costName}" (effective ${rateToEnd.effectiveDate.toISOString().split('T')[0]})`)
        
        await prisma.costRate.update({
          where: { id: rateToEnd.id },
          data: {
            endDate: new Date(today.getTime() - 24 * 60 * 60 * 1000) // Yesterday
          }
        })
      }
      
      console.log(`   ✅ Fixed! Now only "${activeRates[0].costName}" is active`)
    } else if (activeRates.length === 0) {
      console.log('\n⚠️  WARNING: No active storage rate!')
      
      // Find the most recent rate and make it active
      if (rates.length > 0) {
        const mostRecentRate = rates.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0]
        console.log(`   Activating most recent rate: "${mostRecentRate.costName}"`)
        
        await prisma.costRate.update({
          where: { id: mostRecentRate.id },
          data: {
            endDate: null
          }
        })
        
        console.log('   ✅ Fixed!')
      }
    } else {
      console.log('✅ Correctly has exactly 1 active storage rate')
    }
  }

  // Final verification
  console.log('\n\n📊 Final Verification:')
  console.log('=' * 60)
  
  const finalStorageRates = await prisma.costRate.findMany({
    where: {
      costCategory: CostCategory.Storage
    },
    include: {
      warehouse: true
    },
    orderBy: [
      { warehouse: { code: 'asc' } }
    ]
  })

  const finalByWarehouse = new Map<string, typeof finalStorageRates>()
  finalStorageRates.forEach(rate => {
    const code = rate.warehouse.code
    if (!finalByWarehouse.has(code)) {
      finalByWarehouse.set(code, [])
    }
    finalByWarehouse.get(code)!.push(rate)
  })

  for (const [code, rates] of Array.from(finalByWarehouse.entries()).sort()) {
    const activeCount = rates.filter(r => 
      r.effectiveDate <= today && (!r.endDate || r.endDate > today)
    ).length
    
    const status = activeCount === 1 ? '✅' : '❌'
    console.log(`${status} ${code}: ${activeCount} active storage rate(s)`)
  }

  await prisma.$disconnect()
}

enforceOneActiveStorageRate().catch(console.error)