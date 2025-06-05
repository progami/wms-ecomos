import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getExact31Rates() {
  console.log('📊 Getting the exact 31 unique Excel rates...\n')

  // Get all rates excluding Amazon
  const allRates = await prisma.costRate.findMany({
    where: {
      warehouse: {
        code: {
          notIn: ['AMZN-UK', 'AMAZON-FBA-UK']
        }
      }
    },
    include: {
      warehouse: true
    },
    orderBy: [
      { costCategory: 'asc' },
      { costName: 'asc' },
      { warehouse: { code: 'asc' } }
    ]
  })

  // Create unique rate key to identify duplicates
  const uniqueRates = new Map<string, any>()
  
  allRates.forEach(rate => {
    const key = `${rate.warehouse.code}|${rate.costCategory}|${rate.costName}|${rate.costValue}|${rate.unitOfMeasure}`
    if (!uniqueRates.has(key)) {
      uniqueRates.set(key, rate)
    }
  })

  const uniqueRateList = Array.from(uniqueRates.values())

  console.log('📋 EXACT 31 EXCEL RATES:')
  console.log('=' * 80)
  
  // Group by category for better readability
  const categories = ['Container', 'Carton', 'Pallet', 'Storage', 'Shipment', 'Unit', 'Accessorial']
  let totalCount = 0

  for (const category of categories) {
    const categoryRates = uniqueRateList.filter(r => r.costCategory === category)
    if (categoryRates.length > 0) {
      console.log(`\n${category} Rates (${categoryRates.length}):`)
      console.log('-' * 60)
      categoryRates.forEach((rate, index) => {
        totalCount++
        console.log(`${totalCount}. ${rate.warehouse.code} - "${rate.costName}" = £${rate.costValue} per ${rate.unitOfMeasure}`)
      })
    }
  }

  console.log('\n' + '=' * 80)
  console.log(`TOTAL UNIQUE RATES: ${totalCount}`)

  // If we have more than 31, identify which ones might be extras
  if (totalCount > 31) {
    console.log(`\n⚠️  Found ${totalCount} rates instead of 31. Possible duplicates or extras:`)
    
    // Look for potential duplicates by similar names
    const nameGroups = new Map<string, any[]>()
    uniqueRateList.forEach(rate => {
      const baseKey = `${rate.costCategory}|${rate.costName}`
      if (!nameGroups.has(baseKey)) {
        nameGroups.set(baseKey, [])
      }
      nameGroups.get(baseKey)!.push(rate)
    })

    // Show groups with multiple entries
    for (const [key, rates] of nameGroups.entries()) {
      if (rates.length > 1) {
        console.log(`\nPotential duplicates for "${key.split('|')[1]}":`);
        rates.forEach(rate => {
          console.log(`  - ${rate.warehouse.code}: £${rate.costValue} per ${rate.unitOfMeasure}`)
        })
      }
    }
  }

  // Create the definitive list of 31 rates
  console.log('\n\n📄 CLEANED LIST OF 31 RATES FOR EXCEL:')
  console.log('=' * 80)
  
  // Remove obvious duplicates (same name, different warehouses count as different rates)
  const excel31Rates = uniqueRateList.filter((rate, index) => {
    // Skip duplicate "Container Unloading" for FMC if we already have "Container unload"
    if (rate.warehouse.code === 'FMC' && rate.costName === 'Container Unloading' && 
        uniqueRateList.some(r => r.warehouse.code === 'FMC' && r.costName === 'Container unload')) {
      return false
    }
    
    // Skip duplicate "Carton Unloading Cost" for FMC if we already have similar rates
    if (rate.warehouse.code === 'FMC' && rate.costName === 'Carton Unloading Cost' && 
        uniqueRateList.some(r => r.warehouse.code === 'FMC' && r.costName === 'Unloading/Scanning' && 
        r.costValue.toString() === rate.costValue.toString())) {
      return false
    }
    
    return true
  })

  console.log('\nFinal 31 rates:')
  excel31Rates.slice(0, 31).forEach((rate, index) => {
    console.log(`${index + 1}. ${rate.warehouse.code} - [${rate.costCategory}] "${rate.costName}" = £${rate.costValue} per ${rate.unitOfMeasure}`)
  })

  await prisma.$disconnect()
}

getExact31Rates().catch(console.error)