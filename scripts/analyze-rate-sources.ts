import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeRateSources() {
  console.log('🔍 Analyzing cost rate sources and creation details...\n')

  // Get all rates with creation details
  const allRates = await prisma.costRate.findMany({
    include: { 
      warehouse: true,
      createdBy: true
    },
    orderBy: [
      { createdAt: 'asc' },
      { warehouse: { code: 'asc' } },
      { costCategory: 'asc' }
    ]
  })

  // Group rates by creation date
  const ratesByDate = new Map<string, typeof allRates>()
  
  allRates.forEach(rate => {
    const dateKey = rate.createdAt.toISOString().split('T')[0]
    if (!ratesByDate.has(dateKey)) {
      ratesByDate.set(dateKey, [])
    }
    ratesByDate.get(dateKey)!.push(rate)
  })

  // Show rates by creation date
  console.log('📅 Rates grouped by creation date:')
  console.log('=' * 80)
  
  for (const [date, rates] of Array.from(ratesByDate.entries()).sort()) {
    console.log(`\n${date} (${rates.length} rates created)`)
    console.log('-' * 40)
    
    // Group by creator
    const byCreator = new Map<string, typeof rates>()
    rates.forEach(rate => {
      const creator = rate.createdBy.fullName || rate.createdBy.email
      if (!byCreator.has(creator)) {
        byCreator.set(creator, [])
      }
      byCreator.get(creator)!.push(rate)
    })
    
    for (const [creator, creatorRates] of byCreator.entries()) {
      console.log(`  Created by: ${creator}`)
      
      // Group by warehouse
      const byWarehouse = new Map<string, typeof creatorRates>()
      creatorRates.forEach(rate => {
        if (!byWarehouse.has(rate.warehouse.code)) {
          byWarehouse.set(rate.warehouse.code, [])
        }
        byWarehouse.get(rate.warehouse.code)!.push(rate)
      })
      
      for (const [warehouseCode, warehouseRates] of byWarehouse.entries()) {
        console.log(`    ${warehouseCode}: ${warehouseRates.length} rates`)
        warehouseRates.forEach(rate => {
          console.log(`      - ${rate.costCategory}: "${rate.costName}" = £${rate.costValue}`)
        })
      }
    }
  }

  // Show summary by warehouse
  console.log('\n\n📊 Summary by warehouse:')
  console.log('=' * 80)
  
  const warehouses = await prisma.warehouse.findMany({ orderBy: { code: 'asc' } })
  
  for (const warehouse of warehouses) {
    const warehouseRates = allRates.filter(r => r.warehouseId === warehouse.id)
    console.log(`\n${warehouse.code} (${warehouse.name}): ${warehouseRates.length} rates`)
    
    // Group by category
    const byCategory = new Map<string, number>()
    warehouseRates.forEach(rate => {
      byCategory.set(rate.costCategory, (byCategory.get(rate.costCategory) || 0) + 1)
    })
    
    for (const [category, count] of byCategory.entries()) {
      console.log(`  ${category}: ${count} rates`)
    }
  }

  // Identify seed data rates vs. manually added rates
  console.log('\n\n🌱 Identifying seed data vs. manually added rates:')
  console.log('=' * 80)
  
  const seedRateIdentifiers = [
    { warehouse: 'FMC', name: 'Storage cost per pallet / week', value: 3.9 },
    { warehouse: 'FMC', name: 'Container unload', value: 350 },
    { warehouse: 'FMC', name: 'Pallet shipment', value: 30 },
    { warehouse: 'VGLOBAL', name: 'Storage cost per pallet / week', value: 2.6 },
  ]
  
  const seedRates = []
  const nonSeedRates = []
  
  for (const rate of allRates) {
    const isSeed = seedRateIdentifiers.some(seed => 
      rate.warehouse.code === seed.warehouse &&
      rate.costName === seed.name &&
      rate.costValue.toNumber() === seed.value
    )
    
    if (isSeed) {
      seedRates.push(rate)
    } else {
      nonSeedRates.push(rate)
    }
  }
  
  console.log(`Seed data rates: ${seedRates.length}`)
  console.log(`Manually added rates: ${nonSeedRates.length}`)
  
  if (nonSeedRates.length > 0) {
    console.log('\nManually added rates by warehouse:')
    const manualByWarehouse = new Map<string, typeof nonSeedRates>()
    nonSeedRates.forEach(rate => {
      if (!manualByWarehouse.has(rate.warehouse.code)) {
        manualByWarehouse.set(rate.warehouse.code, [])
      }
      manualByWarehouse.get(rate.warehouse.code)!.push(rate)
    })
    
    for (const [warehouseCode, rates] of manualByWarehouse.entries()) {
      console.log(`  ${warehouseCode}: ${rates.length} rates`)
    }
  }

  await prisma.$disconnect()
}

analyzeRateSources().catch(console.error)