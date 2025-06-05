import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

// These are the EXACT 31 rates from Excel
const EXCEL_RATES = [
  // Container Rates (10)
  { warehouse: '4AS', category: CostCategory.Container, name: '20 feet container unloading', value: 350, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: '20 feet container unloading', value: 300, unit: 'container' },
  { warehouse: '4AS', category: CostCategory.Container, name: '40 feet container unloading', value: 500, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: '40 feet container unloading', value: 500, unit: 'container' },
  { warehouse: 'VGLOBAL', category: CostCategory.Container, name: 'Container Unloading', value: 390, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Container devanning', value: 450, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Container unload', value: 350, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Port Processing Fee', value: 24.5, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Terminal Handling Charges', value: 185, unit: 'container' },
  { warehouse: 'VGLOBAL', category: CostCategory.Container, name: 'Terminal Handling Charges', value: 185, unit: 'container' },
  
  // Carton Rates (11)
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Additional Labelling', value: 0.15, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton Handling Cost', value: 1.3, unit: 'carton' },
  { warehouse: 'VGLOBAL', category: CostCategory.Carton, name: 'Carton Handling Cost', value: 1.4, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton handling', value: 2, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton receiving', value: 1.5, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Courier charges', value: 3.75, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Loading to UPS Truck/Handling/ Label Pasting per Carton', value: 1.3, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Loading to UPS Truck/Handling/ Label Pasting per Carton (2 labels per carton)', value: 1.3, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Unloading/Scanning', value: 1.75, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Unloading/Scanning', value: 1.75, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'used boxes/poly bags and document holders for customs documents', value: 4, unit: 'carton' },
  
  // Pallet Rates (7)
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Cross-docking', value: 15, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Labor charges for preparing pallets', value: 15, unit: 'pallet' },
  { warehouse: 'VGLOBAL', category: CostCategory.Pallet, name: 'Pallet Unloading Cost', value: 11.7, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet handling', value: 6.75, unit: 'pallet' },
  { warehouse: 'VGLOBAL', category: CostCategory.Pallet, name: 'Pallet handling', value: 6.95, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet putaway', value: 3.5, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet receiving', value: 5, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet shipment', value: 30, unit: 'pallet' },
  { warehouse: '4AS', category: CostCategory.Pallet, name: 'Pallets wooden platform/Wrapping/ Labor', value: 15, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallets wooden platform/Wrapping/ Labor', value: 6.75, unit: 'pallet' },
  
  // Storage Rates (3)
  { warehouse: '4AS', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 9, unit: 'pallet/week' },
  { warehouse: 'FMC', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 3.9, unit: 'pallet/week' },
  { warehouse: 'VGLOBAL', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 2.6, unit: 'pallet/week' },
]

async function syncExcelRates() {
  console.log('🔄 Syncing database to match EXACTLY 31 Excel rates...\n')

  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map(warehouses.map(w => [w.code, w]))

  // Get admin user for creating rates
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@warehouse.com' }
  })

  if (!adminUser) {
    throw new Error('Admin user not found')
  }

  // Get all current rates
  const currentRates = await prisma.costRate.findMany({
    include: { warehouse: true }
  })

  console.log(`Current rates in database: ${currentRates.length}`)
  console.log(`Target Excel rates: ${EXCEL_RATES.length}\n`)

  // Step 1: Mark rates to keep
  const ratesToKeep = new Set<string>()
  const missingRates = []

  for (const excelRate of EXCEL_RATES) {
    const warehouse = warehouseMap.get(excelRate.warehouse)
    if (!warehouse) {
      console.log(`❌ Warehouse ${excelRate.warehouse} not found`)
      continue
    }

    // Find matching rate
    const matchingRate = currentRates.find(r => 
      r.warehouseId === warehouse.id &&
      r.costCategory === excelRate.category &&
      r.costName === excelRate.name &&
      r.costValue.toNumber() === excelRate.value &&
      r.unitOfMeasure === excelRate.unit
    )

    if (matchingRate) {
      ratesToKeep.add(matchingRate.id)
      console.log(`✅ Found: ${excelRate.warehouse} - ${excelRate.name}`)
    } else {
      missingRates.push({ ...excelRate, warehouseId: warehouse.id })
      console.log(`❌ Missing: ${excelRate.warehouse} - ${excelRate.name}`)
    }
  }

  // Step 2: Delete rates not in Excel
  const ratesToDelete = currentRates.filter(r => !ratesToKeep.has(r.id))
  
  if (ratesToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${ratesToDelete.length} rates not in Excel:`)
    for (const rate of ratesToDelete) {
      console.log(`  - ${rate.warehouse.code}: ${rate.costName}`)
    }
    
    await prisma.costRate.deleteMany({
      where: {
        id: { in: ratesToDelete.map(r => r.id) }
      }
    })
  }

  // Step 3: Add missing rates
  if (missingRates.length > 0) {
    console.log(`\n➕ Adding ${missingRates.length} missing rates:`)
    
    for (const rate of missingRates) {
      console.log(`  - ${rate.warehouse}: ${rate.name}`)
      
      await prisma.costRate.create({
        data: {
          warehouseId: rate.warehouseId,
          costCategory: rate.category,
          costName: rate.name,
          costValue: rate.value,
          unitOfMeasure: rate.unit,
          effectiveDate: new Date('2025-01-01'),
          createdById: adminUser.id
        }
      })
    }
  }

  // Final verification
  const finalCount = await prisma.costRate.count()
  console.log(`\n✨ Sync complete!`)
  console.log(`Final rate count: ${finalCount}`)
  console.log(`Expected: ${EXCEL_RATES.length}`)
  console.log(finalCount === EXCEL_RATES.length ? '✅ Database matches Excel exactly!' : '❌ Count mismatch!')

  // Show final summary by warehouse
  const finalRates = await prisma.costRate.findMany({
    include: { warehouse: true }
  })

  const ratesByWarehouse = new Map<string, number>()
  finalRates.forEach(r => {
    ratesByWarehouse.set(r.warehouse.code, (ratesByWarehouse.get(r.warehouse.code) || 0) + 1)
  })

  console.log('\nRates by warehouse:')
  for (const [code, count] of ratesByWarehouse.entries()) {
    console.log(`  ${code}: ${count} rates`)
  }

  await prisma.$disconnect()
}

syncExcelRates().catch(console.error)