import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeExtra3Rates() {
  console.log('🎯 Removing 3 extra rates to get exactly 31...\n')

  // Get all current rates
  const currentRates = await prisma.costRate.findMany({
    include: { 
      warehouse: true,
      calculatedCosts: true 
    },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { costCategory: 'asc' },
      { costName: 'asc' }
    ]
  })

  console.log(`Current total: ${currentRates.length} rates`)

  // Based on the Excel documentation, these are the likely extra rates:
  // 1. FMC - Container devanning (duplicate of Container unload)
  // 2. FMC - Pallets wooden platform/Wrapping/ Labor (duplicate pallet rate)
  // 3. FMC - Loading to UPS Truck/Handling/ Label Pasting per Carton (2 labels per carton) (long variant)

  const ratesToRemove = [
    { warehouse: 'FMC', name: 'Container devanning' },
    { warehouse: 'FMC', name: 'Pallets wooden platform/Wrapping/ Labor' },
    { warehouse: 'FMC', name: 'Loading to UPS Truck/Handling/ Label Pasting per Carton (2 labels per carton)' }
  ]

  console.log('Rates to remove:')
  for (const toRemove of ratesToRemove) {
    const rate = currentRates.find(r => 
      r.warehouse.code === toRemove.warehouse && 
      r.costName === toRemove.name
    )
    
    if (rate) {
      if (rate.calculatedCosts.length > 0) {
        console.log(`⚠️  ${toRemove.warehouse} - "${toRemove.name}" has ${rate.calculatedCosts.length} calculated costs - CANNOT DELETE`)
      } else {
        console.log(`🗑️  ${toRemove.warehouse} - "${toRemove.name}" - OK TO DELETE`)
        await prisma.costRate.delete({
          where: { id: rate.id }
        })
      }
    } else {
      console.log(`❌ Not found: ${toRemove.warehouse} - "${toRemove.name}"`)
    }
  }

  // Final count
  const finalCount = await prisma.costRate.count()
  console.log(`\n✨ Final rate count: ${finalCount}`)
  console.log(finalCount === 31 ? '✅ Success! Exactly 31 rates.' : `⚠️  Have ${finalCount} rates, expected 31`)

  // If not 31, show what we have
  if (finalCount !== 31) {
    const finalRates = await prisma.costRate.findMany({
      include: { warehouse: true }
    })

    const summary = new Map<string, number>()
    finalRates.forEach(r => {
      summary.set(r.warehouse.code, (summary.get(r.warehouse.code) || 0) + 1)
    })

    console.log('\nCurrent distribution:')
    for (const [code, count] of Array.from(summary.entries()).sort()) {
      console.log(`  ${code}: ${count} rates`)
    }
  }

  await prisma.$disconnect()
}

removeExtra3Rates().catch(console.error)