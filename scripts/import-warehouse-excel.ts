import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import path from 'path'

const prisma = new PrismaClient()

// Helper function to map cost categories
function getCostCategory(category: string): any {
  const mapping: Record<string, string> = {
    'container': 'Container',
    'carton': 'Carton',
    'pallet': 'Pallet',
    'storage': 'Storage',
    'unit': 'Unit',
    'shipment': 'Shipment',
    'accessorial': 'Accessorial'
  }
  const normalized = category?.toLowerCase() || 'accessorial'
  return mapping[normalized] || 'Accessorial'
}

async function importExcelData() {
  try {
    console.log('Starting Excel import...')
    
    // Read the Excel file
    const filePath = path.join(process.cwd(), 'data/Warehouse Management.xlsx')
    const workbook = XLSX.readFile(filePath)
    
    console.log('Available sheets:', workbook.SheetNames)
    
    // 0. Import SKU Master first
    if (workbook.SheetNames.includes('sku master')) {
      console.log('\nImporting SKU Master...')
      const sheet = workbook.Sheets['sku master']
      const data = XLSX.utils.sheet_to_json(sheet)
      
      for (const row of data as any[]) {
        if (row.SKU) {
          await prisma.sku.upsert({
            where: { skuCode: row.SKU },
            update: {
              description: row.Description || `Product ${row.SKU}`,
              asin: row.ASIN,
              packSize: parseInt(row.Pack_Size || 1),
              material: row.Material,
              unitDimensionsCm: row.Unit_Dimensions_cm,
              unitWeightKg: parseFloat(row.Unit_Weight_kg || 0),
              unitsPerCarton: parseInt(row.Units_per_Carton || 1),
              cartonDimensionsCm: row.Carton_Dimensions_cm,
              cartonWeightKg: parseFloat(row.Carton_Weight_kg || 0),
              packagingType: row.Packaging_Type,
              isActive: true
            },
            create: {
              skuCode: row.SKU,
              description: row.Description || `Product ${row.SKU}`,
              asin: row.ASIN,
              packSize: parseInt(row.Pack_Size || 1),
              material: row.Material,
              unitDimensionsCm: row.Unit_Dimensions_cm,
              unitWeightKg: parseFloat(row.Unit_Weight_kg || 0),
              unitsPerCarton: parseInt(row.Units_per_Carton || 1),
              cartonDimensionsCm: row.Carton_Dimensions_cm,
              cartonWeightKg: parseFloat(row.Carton_Weight_kg || 0),
              packagingType: row.Packaging_Type,
              isActive: true
            }
          })
        }
      }
      console.log(`Imported ${data.length} SKUs`)
    }
    
    // 1. Import Cost Master
    if (workbook.SheetNames.includes('cost master')) {
      console.log('\nImporting Cost Master...')
      const sheet = workbook.Sheets['cost master']
      const data = XLSX.utils.sheet_to_json(sheet)
      
      for (const row of data as any[]) {
        if (row.warehouse && row.cost_name) {
          // First ensure warehouse exists
          const warehouse = await prisma.warehouse.upsert({
            where: { code: row.warehouse },
            update: {},
            create: {
              code: row.warehouse,
              name: row.warehouse.replace(/_/g, ' '),
              address: `${row.warehouse} Address`,
              contactEmail: `contact@${row.warehouse.toLowerCase()}.com`,
              contactPhone: '+1-555-0100',
              isActive: true
            }
          })
          
          // Convert Excel date serial number to actual date
          const effectiveDate = row.effective_date ? 
            new Date((row.effective_date - 25569) * 86400 * 1000) : 
            new Date('2024-01-01')
          
          // Create cost rate
          await prisma.costRate.upsert({
            where: {
              warehouseId_costName_effectiveDate: {
                warehouseId: warehouse.id,
                costName: row.cost_name,
                effectiveDate: effectiveDate
              }
            },
            update: {
              costValue: parseFloat(row.cost_value || 0),
              unitOfMeasure: row.unit_of_measure || 'unit',
              costCategory: getCostCategory(row.cost_category)
            },
            create: {
              warehouseId: warehouse.id,
              costCategory: getCostCategory(row.cost_category),
              costName: row.cost_name,
              unitOfMeasure: row.unit_of_measure || 'unit',
              costValue: parseFloat(row.cost_value || 0),
              effectiveDate: effectiveDate,
              createdById: 'system'
            }
          })
        }
      }
      console.log(`Imported ${data.length} cost rates`)
    }
    
    // 2. Import Warehouse Config (SKU configurations)
    if (workbook.SheetNames.includes('warehouse config')) {
      console.log('\nImporting Warehouse Config...')
      const sheet = workbook.Sheets['warehouse config']
      const data = XLSX.utils.sheet_to_json(sheet)
      
      for (const row of data as any[]) {
        if (row.SKU && row.Warehouse) {
          // First ensure SKU exists
          const sku = await prisma.sku.upsert({
            where: { skuCode: row.SKU },
            update: {},
            create: {
              skuCode: row.SKU,
              description: row.SKU_Description || `Product ${row.SKU}`,
              asin: row.ASIN,
              packSize: parseInt(row.Pack_Size || 1),
              material: row.Material,
              unitDimensionsCm: row.Unit_Dimensions_cm,
              unitWeightKg: parseFloat(row.Unit_Weight_kg || 0),
              unitsPerCarton: parseInt(row.Units_per_Carton || 1),
              cartonDimensionsCm: row.Carton_Dimensions_cm,
              cartonWeightKg: parseFloat(row.Carton_Weight_kg || 0),
              packagingType: row.Packaging_Type,
              isActive: true
            }
          })
          
          // Get warehouse
          const warehouse = await prisma.warehouse.findUnique({
            where: { code: row.Warehouse }
          })
          
          if (warehouse) {
            // Create warehouse config
            const effectiveDate = new Date(row.Effective_Date || '2024-01-01')
            const cartonsPerPallet = parseInt(row.Cartons_per_pallet || '1')
            
            await prisma.warehouseSkuConfig.upsert({
              where: {
                warehouseId_skuId_effectiveDate: {
                  warehouseId: warehouse.id,
                  skuId: sku.id,
                  effectiveDate: effectiveDate
                }
              },
              update: {
                storageCartonsPerPallet: cartonsPerPallet,
                shippingCartonsPerPallet: cartonsPerPallet,
                createdById: 'system'
              },
              create: {
                warehouseId: warehouse.id,
                skuId: sku.id,
                storageCartonsPerPallet: cartonsPerPallet,
                shippingCartonsPerPallet: cartonsPerPallet,
                effectiveDate: effectiveDate,
                createdById: 'system'
              }
            })
          }
        }
      }
      console.log(`Imported ${data.length} warehouse configurations`)
    }
    
    // 3. Import Inventory Ledger (transactions)
    if (workbook.SheetNames.includes('inventory ledger')) {
      console.log('\nImporting Inventory Ledger...')
      const sheet = workbook.Sheets['inventory ledger']
      const data = XLSX.utils.sheet_to_json(sheet)
      
      // Ensure we have a default user for transactions
      const systemUser = await prisma.user.upsert({
        where: { email: 'system@warehouse.com' },
        update: {},
        create: {
          id: 'system',
          email: 'system@warehouse.com',
          passwordHash: await bcrypt.hash('system123', 10),
          fullName: 'System Import',
          role: 'admin',
          isActive: true
        }
      })
      
      for (const row of data as any[]) {
        if (row.Transaction_Date && row.Warehouse && row.SKU) {
          const warehouse = await prisma.warehouse.findUnique({
            where: { code: row.Warehouse }
          })
          
          const sku = await prisma.sku.findUnique({
            where: { skuCode: row.SKU }
          })
          
          if (warehouse && sku) {
            const transactionType = row.Transaction_Type?.toUpperCase() || 'RECEIVE'
            const isReceive = transactionType === 'RECEIVE'
            
            await prisma.inventoryTransaction.create({
              data: {
                transactionId: row.Transaction_ID || `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                warehouseId: warehouse.id,
                skuId: sku.id,
                batchLot: row.Batch_Lot || 'DEFAULT',
                transactionType: transactionType,
                referenceId: row.Reference_ID,
                cartonsIn: isReceive ? parseInt(row.Cartons_In || 0) : 0,
                cartonsOut: !isReceive ? parseInt(row.Cartons_Out || 0) : 0,
                transactionDate: new Date(row.Transaction_Date),
                createdById: 'system',
                notes: row.Notes
              }
            })
          }
        }
      }
      console.log(`Imported ${data.length} inventory transactions`)
    }
    
    // 4. Import Invoices
    if (workbook.SheetNames.includes('invoice input')) {
      console.log('\nImporting Invoices...')
      const sheet = workbook.Sheets['invoice input']
      const data = XLSX.utils.sheet_to_json(sheet)
      
      // Group by invoice number
      const invoiceGroups = new Map<string, any[]>()
      for (const row of data as any[]) {
        if (row.Invoice_Number) {
          const items = invoiceGroups.get(row.Invoice_Number) || []
          items.push(row)
          invoiceGroups.set(row.Invoice_Number, items)
        }
      }
      
      for (const [invoiceNumber, items] of invoiceGroups) {
        const firstItem = items[0]
        const warehouse = await prisma.warehouse.findUnique({
          where: { code: firstItem.Warehouse }
        })
        
        if (warehouse) {
          const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.Invoiced_Amount || 0), 0)
          
          const invoice = await prisma.invoice.create({
            data: {
              invoiceNumber: invoiceNumber,
              warehouseId: warehouse.id,
              billingPeriodStart: new Date(firstItem.Billing_Period_Start),
              billingPeriodEnd: new Date(firstItem.Billing_Period_End),
              invoiceDate: new Date(firstItem.Invoice_Received_Date),
              dueDate: new Date(new Date(firstItem.Invoice_Received_Date).getTime() + 30 * 24 * 60 * 60 * 1000),
              totalAmount: totalAmount,
              status: 'pending',
              createdById: 'system'
            }
          })
          
          // Create invoice line items
          for (const item of items) {
            await prisma.invoiceLineItem.create({
              data: {
                invoiceId: invoice.id,
                costCategory: item.Cost_Category || 'Other',
                costName: item.Cost_Name || 'Unknown',
                quantity: parseFloat(item.Invoiced_Quantity || 0),
                rate: item.Invoiced_Amount && item.Invoiced_Quantity ? 
                  parseFloat(item.Invoiced_Amount) / parseFloat(item.Invoiced_Quantity) : 0,
                amount: parseFloat(item.Invoiced_Amount || 0),
                notes: item.Notes
              }
            })
          }
        }
      }
      console.log(`Imported ${invoiceGroups.size} invoices with ${data.length} line items`)
    }
    
    console.log('\nExcel import completed successfully!')
    
  } catch (error) {
    console.error('Error importing Excel data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importExcelData()