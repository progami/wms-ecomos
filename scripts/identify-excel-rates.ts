import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function identifyExcelRates() {
  console.log('📊 Identifying the 31 Excel rates from the database...\n')

  // Get all rates grouped by warehouse
  const allRates = await prisma.costRate.findMany({
    include: {
      warehouse: true
    },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { costCategory: 'asc' },
      { costName: 'asc' }
    ]
  })

  // Group rates by warehouse
  const ratesByWarehouse = new Map<string, typeof allRates>()
  
  allRates.forEach(rate => {
    if (!ratesByWarehouse.has(rate.warehouse.code)) {
      ratesByWarehouse.set(rate.warehouse.code, [])
    }
    ratesByWarehouse.get(rate.warehouse.code)!.push(rate)
  })

  // Based on the output, the Excel file likely contains rates for FMC, VGLOBAL, and 4AS warehouses
  // (Amazon rates are system-specific and not in the original Excel)
  const excelWarehouses = ['FMC', 'VGLOBAL', '4AS']
  const excelRates: any[] = []

  console.log('📋 Rates by Warehouse (excluding Amazon):')
  console.log('=' * 80)

  for (const warehouse of excelWarehouses) {
    const rates = ratesByWarehouse.get(warehouse) || []
    console.log(`\n${warehouse} Warehouse: ${rates.length} rates`)
    console.log('-' * 40)
    
    rates.forEach((rate, index) => {
      excelRates.push(rate)
      console.log(`${index + 1}. [${rate.costCategory}] ${rate.costName} = £${rate.costValue} per ${rate.unitOfMeasure}`)
    })
  }

  console.log('\n\n📊 SUMMARY - Excel Rate List (31 rates):')
  console.log('=' * 80)
  
  // Sort all rates by category and name for the final list
  const sortedExcelRates = excelRates.sort((a, b) => {
    if (a.costCategory !== b.costCategory) {
      return a.costCategory.localeCompare(b.costCategory)
    }
    return a.costName.localeCompare(b.costName)
  })

  console.log('\nComplete list of 31 Excel rates:')
  sortedExcelRates.forEach((rate, index) => {
    console.log(`${index + 1}. ${rate.warehouse.code} - [${rate.costCategory}] ${rate.costName} = £${rate.costValue} per ${rate.unitOfMeasure}`)
  })

  console.log(`\nTotal Excel rates: ${sortedExcelRates.length}`)

  // Create a structured output for easy reference
  console.log('\n\n📄 EXCEL RATE STRUCTURE:')
  console.log('=' * 80)
  
  const structuredRates = {
    'Container': [] as any[],
    'Carton': [] as any[],
    'Pallet': [] as any[],
    'Storage': [] as any[],
    'Shipment': [] as any[],
    'Unit': [] as any[]
  }

  sortedExcelRates.forEach(rate => {
    if (structuredRates[rate.costCategory]) {
      structuredRates[rate.costCategory].push({
        warehouse: rate.warehouse.code,
        name: rate.costName,
        value: rate.costValue.toNumber(),
        unit: rate.unitOfMeasure
      })
    }
  })

  for (const [category, rates] of Object.entries(structuredRates)) {
    if (rates.length > 0) {
      console.log(`\n${category} Rates (${rates.length}):`)
      rates.forEach(rate => {
        console.log(`  - ${rate.warehouse}: "${rate.name}" = £${rate.value} per ${rate.unit}`)
      })
    }
  }

  await prisma.$disconnect()
}

identifyExcelRates().catch(console.error)