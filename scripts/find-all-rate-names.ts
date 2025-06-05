import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findAllRateNames() {
  console.log('🔍 Finding all unique rate names in the database...\n')

  // Get all unique cost names from the database
  const allRates = await prisma.costRate.findMany({
    select: {
      costName: true,
      costCategory: true,
      warehouse: {
        select: {
          code: true
        }
      }
    },
    orderBy: [
      { costCategory: 'asc' },
      { costName: 'asc' }
    ]
  })

  // Group by unique cost names
  const uniqueNames = new Map<string, Set<string>>()
  
  allRates.forEach(rate => {
    const key = `${rate.costCategory}: ${rate.costName}`
    if (!uniqueNames.has(key)) {
      uniqueNames.set(key, new Set())
    }
    uniqueNames.get(key)!.add(rate.warehouse.code)
  })

  console.log('📋 Unique Rate Names Found:')
  console.log('=' * 60)
  
  let count = 1
  const sortedNames = Array.from(uniqueNames.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  
  for (const [name, warehouses] of sortedNames) {
    console.log(`${count}. ${name}`)
    console.log(`   Warehouses: ${Array.from(warehouses).join(', ')}`)
    count++
  }

  console.log('\n📊 Summary:')
  console.log(`Total unique rate names: ${uniqueNames.size}`)
  console.log(`Total rate entries in database: ${allRates.length}`)

  // Also check for any rates that might be mentioned in seed data or scripts
  console.log('\n\n🔍 Searching for rate names in codebase...')
  
  const potentialRateNames = [
    // Common rate names from logistics
    '20 feet container unloading',
    '40 feet container unloading',
    'Terminal Handling Charges',
    'Container stuffing',
    'Container destuffing',
    'Forklift charges',
    'Racking charges',
    'Packing charges',
    'Labour charges',
    'Overtime charges',
    'Documentation fees',
    'Fumigation charges',
    'Transport charges',
    'Handling charges',
    'Loading charges',
    'Unloading charges',
    'Customs clearance',
    'Inspection fees',
    'Storage charges',
    'Demurrage charges',
    'Detention charges',
    'Seal charges',
    'Weighing charges',
    'Scanning charges',
    'Photography charges',
    'Labeling charges',
    'Palletization charges',
    'Shrink wrap charges',
    'Strapping charges',
    'Repackaging charges',
    'Quality check charges'
  ]

  console.log('\nCommon logistics rate names to check:')
  potentialRateNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`)
  })

  await prisma.$disconnect()
}

findAllRateNames().catch(console.error)