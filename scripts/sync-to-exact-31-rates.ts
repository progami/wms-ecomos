import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

// EXACTLY 31 rates from Excel - removing duplicates/extras
const EXCEL_31_RATES = [
  // Container Rates (9 - removed 1 duplicate)
  { warehouse: '4AS', category: CostCategory.Container, name: '20 feet container unloading', value: 350, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: '20 feet container unloading', value: 300, unit: 'container' },
  { warehouse: '4AS', category: CostCategory.Container, name: '40 feet container unloading', value: 500, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: '40 feet container unloading', value: 500, unit: 'container' },
  { warehouse: 'VGLOBAL', category: CostCategory.Container, name: 'Container Unloading', value: 390, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Container unload', value: 350, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Port Processing Fee', value: 24.5, unit: 'container' },
  { warehouse: 'FMC', category: CostCategory.Container, name: 'Terminal Handling Charges', value: 185, unit: 'container' },
  { warehouse: 'VGLOBAL', category: CostCategory.Container, name: 'Terminal Handling Charges', value: 185, unit: 'container' },
  
  // Carton Rates (10 - removed 1)
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Additional Labelling', value: 0.15, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton Handling Cost', value: 1.3, unit: 'carton' },
  { warehouse: 'VGLOBAL', category: CostCategory.Carton, name: 'Carton Handling Cost', value: 1.4, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton handling', value: 2, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Carton receiving', value: 1.5, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Courier charges', value: 3.75, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Loading to UPS Truck/Handling/ Label Pasting per Carton', value: 1.3, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'Unloading/Scanning', value: 1.75, unit: 'carton' },
  { warehouse: 'FMC', category: CostCategory.Carton, name: 'Unloading/Scanning', value: 1.75, unit: 'carton' },
  { warehouse: '4AS', category: CostCategory.Carton, name: 'used boxes/poly bags and document holders for customs documents', value: 4, unit: 'carton' },
  
  // Pallet Rates (9)
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Cross-docking', value: 15, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Labor charges for preparing pallets', value: 15, unit: 'pallet' },
  { warehouse: 'VGLOBAL', category: CostCategory.Pallet, name: 'Pallet Unloading Cost', value: 11.7, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet handling', value: 6.75, unit: 'pallet' },
  { warehouse: 'VGLOBAL', category: CostCategory.Pallet, name: 'Pallet handling', value: 6.95, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet putaway', value: 3.5, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet receiving', value: 5, unit: 'pallet' },
  { warehouse: 'FMC', category: CostCategory.Pallet, name: 'Pallet shipment', value: 30, unit: 'pallet' },
  { warehouse: '4AS', category: CostCategory.Pallet, name: 'Pallets wooden platform/Wrapping/ Labor', value: 15, unit: 'pallet' },
  
  // Storage Rates (3)
  { warehouse: '4AS', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 9, unit: 'pallet/week' },
  { warehouse: 'FMC', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 3.9, unit: 'pallet/week' },
  { warehouse: 'VGLOBAL', category: CostCategory.Storage, name: 'Storage cost per pallet / week', value: 2.6, unit: 'pallet/week' },
]

async function syncToExact31Rates() {
  console.log('🎯 Syncing database to have EXACTLY 31 Excel rates...\n')
  console.log(`Target rates: ${EXCEL_31_RATES.length}`)

  // Verify we have exactly 31
  if (EXCEL_31_RATES.length !== 31) {
    console.error(`❌ Error: Have ${EXCEL_31_RATES.length} rates, expected 31`)
    return
  }

  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map(warehouses.map(w => [w.code, w]))

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@warehouse.com' }
  })

  if (!adminUser) {
    throw new Error('Admin user not found')
  }

  // Delete ALL existing rates
  console.log('🗑️  Deleting all existing rates...')
  await prisma.costRate.deleteMany({})

  // Add exactly the 31 Excel rates
  console.log('➕ Adding exactly 31 Excel rates...\n')
  
  let addedCount = 0
  for (const rate of EXCEL_31_RATES) {
    const warehouse = warehouseMap.get(rate.warehouse)
    if (!warehouse) {
      console.log(`❌ Warehouse ${rate.warehouse} not found`)
      continue
    }

    await prisma.costRate.create({
      data: {
        warehouseId: warehouse.id,
        costCategory: rate.category,
        costName: rate.name,
        costValue: rate.value,
        unitOfMeasure: rate.unit,
        effectiveDate: new Date('2025-01-01'),
        createdById: adminUser.id
      }
    })
    
    addedCount++
    console.log(`✅ Added: ${rate.warehouse} - ${rate.name} = £${rate.value}`)
  }

  // Final verification
  const finalCount = await prisma.costRate.count()
  console.log(`\n✨ Sync complete!`)
  console.log(`Added: ${addedCount} rates`)
  console.log(`Final count: ${finalCount}`)
  console.log(finalCount === 31 ? '✅ Database has EXACTLY 31 rates!' : '❌ Count mismatch!')

  // Show summary by warehouse
  const finalRates = await prisma.costRate.findMany({
    include: { warehouse: true }
  })

  const summary = new Map<string, number>()
  finalRates.forEach(r => {
    summary.set(r.warehouse.code, (summary.get(r.warehouse.code) || 0) + 1)
  })

  console.log('\nRates by warehouse:')
  let total = 0
  for (const [code, count] of Array.from(summary.entries()).sort()) {
    console.log(`  ${code}: ${count} rates`)
    total += count
  }
  console.log(`  TOTAL: ${total} rates`)

  await prisma.$disconnect()
}

syncToExact31Rates().catch(console.error)