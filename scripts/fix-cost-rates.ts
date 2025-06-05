import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCostRates() {
  console.log('🔧 Fixing cost rates to match Excel file...\n')

  // Expected rates from Excel/seed data
  const expectedRates = [
    // FMC rates
    { warehouseCode: 'FMC', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 3.9, unit: 'pallet/week' },
    { warehouseCode: 'FMC', category: CostCategory.Container, name: 'Container unload', value: 350, unit: 'container' },
    { warehouseCode: 'FMC', category: CostCategory.Pallet, name: 'Pallet shipment', value: 30, unit: 'pallet' },
    
    // VGLOBAL rates
    { warehouseCode: 'VGLOBAL', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 2.6, unit: 'pallet/week' },
    
    // Amazon FBA UK rates (using AMZN-UK as the code)
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Standard (Jan-Sep)', value: 0.75, unit: 'cubic foot/month', effectiveDate: '2025-01-01', endDate: '2025-09-30' },
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Oversize (Jan-Sep)', value: 0.53, unit: 'cubic foot/month', effectiveDate: '2025-01-01', endDate: '2025-09-30' },
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Standard (Oct-Dec)', value: 2.4, unit: 'cubic foot/month', effectiveDate: '2025-10-01', endDate: '2025-12-31' },
    { warehouseCode: 'AMZN-UK', category: CostCategory.Storage, name: 'Amazon FBA Storage - Oversize (Oct-Dec)', value: 1.65, unit: 'cubic foot/month', effectiveDate: '2025-10-01', endDate: '2025-12-31' },
  ]

  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map(warehouses.map(w => [w.code, w]))

  // Process each expected rate
  for (const expected of expectedRates) {
    const warehouse = warehouseMap.get(expected.warehouseCode)
    if (!warehouse) {
      console.log(`❌ Warehouse ${expected.warehouseCode} not found`)
      continue
    }

    // Find matching rate in database
    const existingRate = await prisma.costRate.findFirst({
      where: {
        warehouseId: warehouse.id,
        costCategory: expected.category,
        costName: expected.name,
        costValue: expected.value,
        unitOfMeasure: expected.unit
      }
    })

    if (existingRate) {
      // Activate the rate if it's inactive
      if (!existingRate.isActive) {
        await prisma.costRate.update({
          where: { id: existingRate.id },
          data: { isActive: true }
        })
        console.log(`✅ Activated: ${warehouse.code} - ${expected.name} = £${expected.value}`)
      } else {
        console.log(`✓ Already active: ${warehouse.code} - ${expected.name} = £${expected.value}`)
      }
    } else {
      console.log(`⚠️  Not found: ${warehouse.code} - ${expected.name} = £${expected.value}`)
      console.log(`   Will search for similar rates...`)
      
      // Try to find similar rates (same warehouse, category, and similar name)
      const similarRates = await prisma.costRate.findMany({
        where: {
          warehouseId: warehouse.id,
          costCategory: expected.category,
        }
      })
      
      if (similarRates.length > 0) {
        console.log(`   Found ${similarRates.length} rates in same category:`)
        similarRates.forEach(rate => {
          console.log(`   - "${rate.costName}" = £${rate.costValue} (${rate.isActive ? 'active' : 'inactive'})`)
        })
      }
    }
  }

  // Deactivate extra rates that shouldn't be active
  console.log('\n🔍 Checking for extra active rates that should be deactivated...')
  
  const allActiveRates = await prisma.costRate.findMany({
    where: { isActive: true },
    include: { warehouse: true }
  })

  for (const rate of allActiveRates) {
    const isExpected = expectedRates.some(e => 
      e.warehouseCode === rate.warehouse.code &&
      e.category === rate.costCategory &&
      e.name === rate.costName &&
      e.value === rate.costValue
    )

    if (!isExpected) {
      console.log(`❌ Deactivating unexpected rate: ${rate.warehouse.code} - ${rate.costName} = £${rate.costValue}`)
      await prisma.costRate.update({
        where: { id: rate.id },
        data: { isActive: false }
      })
    }
  }

  // Final summary
  console.log('\n📊 Final Summary:')
  const finalActiveRates = await prisma.costRate.count({ where: { isActive: true } })
  const finalInactiveRates = await prisma.costRate.count({ where: { isActive: false } })
  
  console.log(`Active rates: ${finalActiveRates}`)
  console.log(`Inactive rates: ${finalInactiveRates}`)
  console.log(`Expected rates: ${expectedRates.length}`)

  await prisma.$disconnect()
}

fixCostRates().catch(console.error)