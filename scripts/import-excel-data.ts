import { PrismaClient, TransactionType, CostCategory } from '@prisma/client'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import path from 'path'
import { format } from 'date-fns'

const prisma = new PrismaClient()

interface ExcelSku {
  SKU_Version_ID: string
  SKU: string
  Batch_Lot_Identifier: string
  effective_date: number | Date
  end_date?: number | Date
  ASIN?: string
  Description: string
  Pack_Size: number
  Material?: string
  Unit_Dimensions_cm?: string
  Unit_Weight_KG?: number
  Units_Per_Carton: number
  Carton_Dimensions_cm?: string
  Carton_Weight_KG?: number
  Packaging_Type?: string
  Notes?: string
}

interface ExcelWarehouseConfig {
  WH_Config_ID: string
  warehouse: string
  SKU: string
  storage_cartons_per_pallet: number
  shipping_cartons_per_pallet: number
  max_stacking_height_cm: number
  effective_date: number | Date
  end_date?: number | Date
  notes?: string
}

interface ExcelCostRate {
  Cost_Rate_ID: string
  warehouse: string
  cost_category: string
  cost_name: string
  cost_value: number
  unit_of_measure: string
  effective_date: number | Date
  end_date?: number | Date
  notes?: string
}

interface ExcelInventoryTransaction {
  Timestamp: number | Date
  Transaction_ID: string
  Warehouse: string
  SKU: string
  Shipment?: string | number
  Transaction_Type: string
  'Reference_ID (Email tag)'?: string
  Cartons_In?: number
  Cartons_Out?: number
  storage_pallets_in?: number
  shipping_pallets_out?: number
  Notes?: string
}

// Storage ledger is calculated, not imported

// Convert Excel date to JavaScript Date
function excelDateToJS(excelDate: number | Date): Date {
  if (excelDate instanceof Date) return excelDate
  // Excel dates start from 1900-01-01
  const date = new Date((excelDate - 25569) * 86400 * 1000)
  return date
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...')
  
  // Delete in correct order to respect foreign keys
  await prisma.calculatedCost.deleteMany()
  await prisma.storageLedger.deleteMany()
  await prisma.inventoryBalance.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.invoiceLineItem.deleteMany()
  await prisma.invoiceReconciliation.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.costRate.deleteMany()
  await prisma.warehouseSkuConfig.deleteMany()
  await prisma.skuVersion.deleteMany()
  await prisma.sku.deleteMany()
  
  // Keep users and warehouses from seed
  console.log('✅ Database cleared (keeping users and warehouses)')
}

async function importSkus(workbook: XLSX.WorkBook, adminUserId: string) {
  console.log('\n📦 Importing SKUs...')
  
  const sheet = workbook.Sheets['sku master']
  const data: ExcelSku[] = XLSX.utils.sheet_to_json(sheet)
  
  for (const row of data) {
    if (!row.SKU) continue
    
    try {
      await prisma.sku.create({
        data: {
          skuCode: row.SKU,
          asin: row.ASIN,
          description: row.Description || row.SKU,
          packSize: row.Pack_Size || 1,
          material: row.Material,
          unitDimensionsCm: row.Unit_Dimensions_cm,
          unitWeightKg: row.Unit_Weight_KG,
          unitsPerCarton: row.Units_Per_Carton || 1,
          cartonDimensionsCm: row.Carton_Dimensions_cm,
          cartonWeightKg: row.Carton_Weight_KG,
          packagingType: row.Packaging_Type,
          notes: row.Notes,
        }
      })
      console.log(`  ✓ Imported SKU: ${row.SKU}`)
    } catch (error) {
      console.error(`  ✗ Error importing SKU ${row.SKU}:`, error)
    }
  }
  
  console.log(`✅ Imported ${data.length} SKUs`)
}

async function importWarehouseConfigs(workbook: XLSX.WorkBook, adminUserId: string) {
  console.log('\n🏭 Importing Warehouse Configurations...')
  
  const sheet = workbook.Sheets['warehouse config']
  const data: ExcelWarehouseConfig[] = XLSX.utils.sheet_to_json(sheet)
  
  // Get warehouse and SKU mappings
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map()
  warehouses.forEach(w => {
    // Map by code
    warehouseMap.set(w.code, w.id)
    warehouseMap.set(w.code.toLowerCase(), w.id)
    warehouseMap.set(w.code.toUpperCase(), w.id)
    
    // Map by name
    warehouseMap.set(w.name, w.id)
    warehouseMap.set(w.name.toLowerCase(), w.id)
    warehouseMap.set(w.name.toUpperCase(), w.id)
    
    // Special cases for compatibility
    if (w.code === 'VGLOBAL') {
      warehouseMap.set('Vglobal', w.id)
      warehouseMap.set('vglobal', w.id)
    }
    if (w.code === '4AS') {
      warehouseMap.set('4as', w.id)
    }
  })
  
  const skus = await prisma.sku.findMany()
  const skuMap = new Map(skus.map(s => [s.skuCode, s.id]))
  
  for (const row of data) {
    if (!row.warehouse || !row.SKU) continue
    
    const warehouseId = warehouseMap.get(row.warehouse.toUpperCase())
    const skuId = skuMap.get(row.SKU)
    
    if (!warehouseId || !skuId) {
      console.error(`  ✗ Warehouse ${row.warehouse} or SKU ${row.SKU} not found`)
      continue
    }
    
    try {
      await prisma.warehouseSkuConfig.create({
        data: {
          warehouseId,
          skuId,
          storageCartonsPerPallet: row.storage_cartons_per_pallet || 1,
          shippingCartonsPerPallet: row.shipping_cartons_per_pallet || 1,
          maxStackingHeightCm: row.max_stacking_height_cm,
          effectiveDate: row.effective_date ? excelDateToJS(row.effective_date) : new Date('2024-01-01'),
          endDate: row.end_date ? excelDateToJS(row.end_date) : null,
          notes: row.notes,
          createdById: adminUserId,
        }
      })
      console.log(`  ✓ Configured ${row.warehouse} - ${row.SKU}`)
    } catch (error) {
      console.error(`  ✗ Error configuring ${row.warehouse} - ${row.SKU}:`, error)
    }
  }
  
  console.log(`✅ Imported ${data.length} warehouse configurations`)
}

async function importCostRates(workbook: XLSX.WorkBook, adminUserId: string) {
  console.log('\n💰 Importing Cost Rates...')
  
  const sheet = workbook.Sheets['cost master']
  const data: ExcelCostRate[] = XLSX.utils.sheet_to_json(sheet)
  
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map()
  warehouses.forEach(w => {
    // Map by code
    warehouseMap.set(w.code, w.id)
    warehouseMap.set(w.code.toLowerCase(), w.id)
    warehouseMap.set(w.code.toUpperCase(), w.id)
    
    // Map by name
    warehouseMap.set(w.name, w.id)
    warehouseMap.set(w.name.toLowerCase(), w.id)
    warehouseMap.set(w.name.toUpperCase(), w.id)
  })
  
  const categoryMap: Record<string, CostCategory> = {
    'container': CostCategory.Container,
    'carton': CostCategory.Carton,
    'pallet': CostCategory.Pallet,
    'storage': CostCategory.Storage,
    'unit': CostCategory.Unit,
    'shipment': CostCategory.Shipment,
    'accessorial': CostCategory.Accessorial,
  }
  
  for (const row of data) {
    if (!row.warehouse || !row.cost_name) continue
    
    const warehouseId = warehouseMap.get(row.warehouse.toLowerCase())
    if (!warehouseId) {
      console.error(`  ✗ Warehouse ${row.warehouse} not found`)
      continue
    }
    
    const category = categoryMap[row.cost_category.toLowerCase()] || CostCategory.Accessorial
    
    try {
      await prisma.costRate.create({
        data: {
          warehouseId,
          costCategory: category,
          costName: row.cost_name,
          costValue: row.cost_value || 0,
          unitOfMeasure: row.unit_of_measure || 'unit',
          effectiveDate: row.effective_date ? excelDateToJS(row.effective_date) : new Date('2024-01-01'),
          endDate: row.end_date ? excelDateToJS(row.end_date) : null,
          notes: row.notes,
          createdById: adminUserId,
        }
      })
      console.log(`  ✓ Imported rate: ${row.warehouse} - ${row.cost_name}`)
    } catch (error) {
      console.error(`  ✗ Error importing rate ${row.cost_name}:`, error)
    }
  }
  
  console.log(`✅ Imported ${data.length} cost rates`)
}

async function importInventoryTransactions(workbook: XLSX.WorkBook, adminUserId: string) {
  console.log('\n📋 Importing Inventory Transactions...')
  
  const sheet = workbook.Sheets['inventory ledger']
  const data: ExcelInventoryTransaction[] = XLSX.utils.sheet_to_json(sheet)
  
  const warehouses = await prisma.warehouse.findMany()
  const warehouseMap = new Map()
  warehouses.forEach(w => {
    // Map by code
    warehouseMap.set(w.code, w.id)
    warehouseMap.set(w.code.toLowerCase(), w.id)
    warehouseMap.set(w.code.toUpperCase(), w.id)
    
    // Map by name
    warehouseMap.set(w.name, w.id)
    warehouseMap.set(w.name.toLowerCase(), w.id)
    warehouseMap.set(w.name.toUpperCase(), w.id)
    
    // Special cases for compatibility
    if (w.code === 'VGLOBAL') {
      warehouseMap.set('Vglobal', w.id)
      warehouseMap.set('vglobal', w.id)
    }
    if (w.code === '4AS') {
      warehouseMap.set('4as', w.id)
    }
  })
  
  const skus = await prisma.sku.findMany()
  const skuMap = new Map(skus.map(s => [s.skuCode, s.id]))
  
  const typeMap: Record<string, TransactionType> = {
    'RECEIVE': TransactionType.RECEIVE,
    'SHIP': TransactionType.SHIP,
    'ADJUST_IN': TransactionType.ADJUST_IN,
    'ADJUST_OUT': TransactionType.ADJUST_OUT,
  }
  
  let imported = 0
  for (const row of data) {
    if (!row.Transaction_ID || !row.Warehouse || !row.SKU) continue
    
    const warehouseId = warehouseMap.get(row.Warehouse)
    const skuId = skuMap.get(row.SKU)
    
    if (!warehouseId || !skuId) {
      console.error(`  ✗ Warehouse ${row.Warehouse} or SKU ${row.SKU} not found`)
      continue
    }
    
    const transactionType = typeMap[row.Transaction_Type] || TransactionType.RECEIVE
    const batchLot = row.Shipment ? String(row.Shipment) : 'DEFAULT'
    
    try {
      await prisma.inventoryTransaction.create({
        data: {
          transactionId: row.Transaction_ID,
          warehouseId,
          skuId,
          batchLot,
          transactionType,
          referenceId: row['Reference_ID (Email tag)'],
          cartonsIn: row.Cartons_In || 0,
          cartonsOut: row.Cartons_Out || 0,
          storagePalletsIn: row.storage_pallets_in || 0,
          shippingPalletsOut: row.shipping_pallets_out || 0,
          notes: row.Notes,
          transactionDate: row.Timestamp ? excelDateToJS(row.Timestamp) : new Date(),
          createdById: adminUserId,
        }
      })
      imported++
      
      if (imported % 50 === 0) {
        console.log(`  ... imported ${imported} transactions`)
      }
    } catch (error) {
      console.error(`  ✗ Error importing transaction ${row.Transaction_ID}:`, error)
    }
  }
  
  console.log(`✅ Imported ${imported} inventory transactions`)
}

async function updateInventoryBalances() {
  console.log('\n🔄 Updating inventory balances...')
  
  // Get all unique combinations
  const combinations = await prisma.inventoryTransaction.groupBy({
    by: ['warehouseId', 'skuId', 'batchLot'],
  })
  
  for (const combo of combinations) {
    // Calculate balance
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        warehouseId: combo.warehouseId,
        skuId: combo.skuId,
        batchLot: combo.batchLot,
      },
      orderBy: { transactionDate: 'desc' },
    })
    
    const totalIn = transactions.reduce((sum, t) => sum + t.cartonsIn, 0)
    const totalOut = transactions.reduce((sum, t) => sum + t.cartonsOut, 0)
    const balance = totalIn - totalOut
    
    if (balance > 0) {
      const lastTransaction = transactions[0]
      const sku = await prisma.sku.findUnique({ where: { id: combo.skuId } })
      
      await prisma.inventoryBalance.upsert({
        where: {
          warehouseId_skuId_batchLot: {
            warehouseId: combo.warehouseId,
            skuId: combo.skuId,
            batchLot: combo.batchLot,
          }
        },
        update: {
          currentCartons: balance,
          currentUnits: balance * (sku?.unitsPerCarton || 1),
          lastTransactionDate: lastTransaction?.transactionDate,
        },
        create: {
          warehouseId: combo.warehouseId,
          skuId: combo.skuId,
          batchLot: combo.batchLot,
          currentCartons: balance,
          currentUnits: balance * (sku?.unitsPerCarton || 1),
          lastTransactionDate: lastTransaction?.transactionDate,
        }
      })
    }
  }
  
  console.log(`✅ Updated balances for ${combinations.length} combinations`)
}

// Storage ledger will be calculated based on inventory transactions and business rules

async function main() {
  try {
    console.log('🚀 Starting Excel data import...')
    
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@warehouse.com' }
    })
    
    if (!adminUser) {
      throw new Error('Admin user not found. Run npm run db:seed first.')
    }
    
    // Load Excel file
    const filePath = path.join(process.cwd(), 'data', 'Warehouse Management.xlsx')
    console.log(`📂 Loading Excel file: ${filePath}`)
    const workbook = XLSX.readFile(filePath)
    
    // Clear existing data (except users and warehouses)
    await clearDatabase()
    
    // Import in correct order
    await importSkus(workbook, adminUser.id)
    await importWarehouseConfigs(workbook, adminUser.id)
    await importCostRates(workbook, adminUser.id)
    await importInventoryTransactions(workbook, adminUser.id)
    await updateInventoryBalances()
    // Storage ledger and calculated costs are generated, not imported
    
    console.log('\n✅ Import completed successfully!')
    console.log('\n📊 Summary:')
    const skuCount = await prisma.sku.count()
    const configCount = await prisma.warehouseSkuConfig.count()
    const rateCount = await prisma.costRate.count()
    const transactionCount = await prisma.inventoryTransaction.count()
    const balanceCount = await prisma.inventoryBalance.count()
    // Storage ledger is calculated separately
    
    console.log(`  - SKUs: ${skuCount}`)
    console.log(`  - Warehouse Configs: ${configCount}`)
    console.log(`  - Cost Rates: ${rateCount}`)
    console.log(`  - Transactions: ${transactionCount}`)
    console.log(`  - Active Inventory Items: ${balanceCount}`)
    console.log('\nNote: Storage ledger and calculated costs will be generated based on business rules')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()