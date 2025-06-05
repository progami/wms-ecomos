import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyAndUpdateRates() {
  console.log('📊 Verifying and updating cost rates to match Excel...\n')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // These are the EXACT rates from the Excel file
  const excelRates = [
    // FMC rates
    { warehouseCode: 'FMC', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 3.9, unit: 'pallet/week' },
    { warehouseCode: 'FMC', category: CostCategory.Container, name: 'Container unload', value: 350, unit: 'container' },
    { warehouseCode: 'FMC', category: CostCategory.Pallet, name: 'Pallet shipment', value: 30, unit: 'pallet' },
    
    // VGLOBAL rates
    { warehouseCode: 'VGLOBAL', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 2.6, unit: 'pallet/week' },
    
    // Amazon FBA UK rates (Non-peak: Jan-Sep)
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Standard (Jan-Sep)', value: 0.75, unit: 'cubic foot/month' },
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Oversize (Jan-Sep)', value: 0.53, unit: 'cubic foot/month' },
    
    // Amazon FBA UK rates (Peak: Oct-Dec)
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Standard (Oct-Dec)', value: 2.4, unit: 'cubic foot/month' },
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Oversize (Oct-Dec)', value: 1.65, unit: 'cubic foot/month' },
  ]

  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map(warehouses.map(w => [w.code, w]))

  console.log('🏭 Warehouses found:')
  warehouses.forEach(w => console.log(`  - ${w.code}: ${w.name}`))
  console.log()

  // Get all current rates
  const allRates = await prisma.costRate.findMany({
    include: { warehouse: true },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { costCategory: 'asc' },
      { costName: 'asc' }
    ]
  })

  console.log(`📦 Total rates in database: ${allRates.length}\n`)

  // Check each Excel rate
  console.log('✅ Checking Excel rates:')
  console.log('=' * 60)
  
  const foundRates = []
  const missingRates = []
  
  for (const excelRate of excelRates) {
    const warehouse = warehouseMap.get(excelRate.warehouseCode)
    if (!warehouse) {
      console.log(`❌ Warehouse ${excelRate.warehouseCode} not found in database`)
      continue
    }

    // Find exact matching rate
    const matchingRate = allRates.find(rate => 
      rate.warehouseId === warehouse.id &&
      rate.costCategory === excelRate.category &&
      rate.costName === excelRate.name &&
      rate.costValue.toNumber() === excelRate.value &&
      rate.unitOfMeasure === excelRate.unit
    )

    if (matchingRate) {
      foundRates.push({ ...excelRate, dbRate: matchingRate })
      console.log(`✅ Found: ${excelRate.warehouseCode} - ${excelRate.name} = £${excelRate.value}`)
      
      // Check if it's currently active (no endDate or endDate is in the future)
      const isActive = !matchingRate.endDate || matchingRate.endDate > today
      if (!isActive) {
        console.log(`   ⚠️  Rate has expired (endDate: ${matchingRate.endDate})`)
      }
    } else {
      missingRates.push(excelRate)
      console.log(`❌ Missing: ${excelRate.warehouseCode} - ${excelRate.name} = £${excelRate.value}`)
      
      // Look for similar rates
      const similarRates = allRates.filter(rate => 
        rate.warehouseId === warehouse.id &&
        rate.costCategory === excelRate.category
      )
      
      if (similarRates.length > 0) {
        console.log(`   Similar rates found:`)
        similarRates.forEach(rate => {
          console.log(`   - "${rate.costName}" = £${rate.costValue} per ${rate.unitOfMeasure}`)
        })
      }
    }
  }

  // Show rates in DB that are NOT in Excel
  console.log('\n\n❓ Rates in database but NOT in Excel:')
  console.log('=' * 60)
  
  for (const dbRate of allRates) {
    const isInExcel = excelRates.some(excelRate => {
      const warehouse = warehouseMap.get(excelRate.warehouseCode)
      return warehouse && 
        dbRate.warehouseId === warehouse.id &&
        dbRate.costCategory === excelRate.category &&
        dbRate.costName === excelRate.name &&
        dbRate.costValue.toNumber() === excelRate.value
    })

    if (!isInExcel) {
      const isActive = !dbRate.endDate || dbRate.endDate > today
      const status = isActive ? '🟡 Active' : '⚪ Inactive'
      console.log(`${status} ${dbRate.warehouse.code} - ${dbRate.costCategory}: "${dbRate.costName}" = £${dbRate.costValue}`)
    }
  }

  // Summary
  console.log('\n\n📋 SUMMARY')
  console.log('=' * 60)
  console.log(`Excel rates to verify: ${excelRates.length}`)
  console.log(`✅ Found in database: ${foundRates.length}`)
  console.log(`❌ Missing from database: ${missingRates.length}`)
  console.log(`Total rates in database: ${allRates.length}`)
  
  const activeRates = allRates.filter(r => !r.endDate || r.endDate > today)
  console.log(`Currently active rates: ${activeRates.length}`)

  if (missingRates.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Some Excel rates are missing from the database!')
    console.log('Missing rates:')
    missingRates.forEach(rate => {
      console.log(`  - ${rate.warehouseCode}: ${rate.name}`)
    })
  } else {
    console.log('\n✅ All Excel rates are present in the database!')
  }

  await prisma.$disconnect()
}

verifyAndUpdateRates().catch(console.error)