import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify31Rates() {
  console.log('📊 Verifying we have exactly 31 rates...\n')

  // Get all current rates
  const currentRates = await prisma.costRate.findMany({
    include: { warehouse: true },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { costCategory: 'asc' },
      { costName: 'asc' }
    ]
  })

  console.log(`Total rates in database: ${currentRates.length}`)
  
  // Group by warehouse
  const ratesByWarehouse = new Map<string, typeof currentRates>()
  currentRates.forEach(rate => {
    const code = rate.warehouse.code
    if (!ratesByWarehouse.has(code)) {
      ratesByWarehouse.set(code, [])
    }
    ratesByWarehouse.get(code)!.push(rate)
  })

  console.log('\nRates by warehouse:')
  for (const [code, rates] of ratesByWarehouse.entries()) {
    console.log(`\n${code}: ${rates.length} rates`)
    rates.forEach((rate, index) => {
      console.log(`  ${index + 1}. ${rate.costCategory} - "${rate.costName}" = £${rate.costValue}`)
    })
  }

  // Check for duplicates
  console.log('\n🔍 Checking for potential duplicates...')
  const rateKeys = new Map<string, typeof currentRates>()
  
  currentRates.forEach(rate => {
    const key = `${rate.warehouse.code}-${rate.costCategory}-${rate.costName}`
    if (!rateKeys.has(key)) {
      rateKeys.set(key, [])
    }
    rateKeys.get(key)!.push(rate)
  })

  const duplicates = Array.from(rateKeys.entries()).filter(([_, rates]) => rates.length > 1)
  
  if (duplicates.length > 0) {
    console.log('\n⚠️  Found potential duplicates:')
    duplicates.forEach(([key, rates]) => {
      console.log(`\n${key}:`)
      rates.forEach(rate => {
        console.log(`  - ID: ${rate.id}, Value: £${rate.costValue}, Created: ${rate.createdAt.toISOString()}`)
      })
    })
  } else {
    console.log('✅ No duplicates found')
  }

  await prisma.$disconnect()
}

verify31Rates().catch(console.error)