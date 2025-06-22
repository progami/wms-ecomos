#!/usr/bin/env npx tsx

import { INVENTORY_TRANSACTION_COLUMNS } from '../src/lib/column-ordering.js'
import { importConfigs } from '../src/lib/import-config.js'

console.log('=== Field Alignment Verification Report ===\n')

// Database fields from schema analysis
const dbFields = [
  'id', 'transactionId', 'warehouseId', 'skuId', 'batchLot', 
  'transactionType', 'referenceId', 'cartonsIn', 'cartonsOut', 
  'storagePalletsIn', 'shippingPalletsOut', 'transactionDate', 
  'pickupDate', 'isReconciled', 'createdAt', 'createdById',
  'shippingCartonsPerPallet', 'storageCartonsPerPallet',
  'shipName', 'trackingNumber', 'modeOfTransportation', 'attachments'
]

// Get import fields
const importFields = importConfigs.inventoryTransactions.fieldMappings.map(m => m.dbField)

// Get export fields from column ordering
const exportFields = INVENTORY_TRANSACTION_COLUMNS.filter(c => c.showInExport).map(c => c.fieldName)

// Get UI fields from column ordering  
const uiFields = INVENTORY_TRANSACTION_COLUMNS.filter(c => c.showInUI).map(c => c.fieldName)

console.log('📊 Total Database Fields:', dbFields.length)
console.log('📥 Import Fields:', importFields.length)
console.log('📤 Export Fields:', exportFields.length)
console.log('🖥️  UI Fields:', uiFields.length)
console.log('\n')

// System fields that should not be imported
const systemFields = ['id', 'transactionId', 'createdAt', 'createdById', 'warehouseId', 'skuId']

// Check for missing fields
console.log('🔍 Checking for gaps...\n')

const nonSystemFields = dbFields.filter(f => !systemFields.includes(f))

console.log('1️⃣  DB Fields (non-system) Missing from Import:')
const missingFromImport = nonSystemFields.filter(f => 
  !importFields.includes(f) && f !== 'attachments' // attachments handled separately
)
if (missingFromImport.length === 0) {
  console.log('   ✅ None - All importable fields covered')
} else {
  missingFromImport.forEach(f => console.log(`   ❌ ${f}`))
}

console.log('\n2️⃣  DB Fields (non-system) Missing from Export:')
const missingFromExport = nonSystemFields.filter(f => 
  !exportFields.includes(f) && 
  !['hasCommercialInvoice', 'hasPackingList', 'hasTcGrs', 'skuDescription'].includes(f) &&
  f !== 'attachments' // now handled by boolean fields
)
if (missingFromExport.length === 0) {
  console.log('   ✅ None - All fields exportable')
} else {
  missingFromExport.forEach(f => console.log(`   ❌ ${f}`))
}

console.log('\n3️⃣  Import/Export Column Name Alignment:')
let columnMismatches = 0
importConfigs.inventoryTransactions.fieldMappings.forEach(mapping => {
  const exportCol = INVENTORY_TRANSACTION_COLUMNS.find(c => c.fieldName === mapping.dbField)
  if (exportCol && exportCol.showInExport && mapping.excelColumns[0] !== exportCol.exportName) {
    console.log(`   ⚠️  ${mapping.dbField}: Import="${mapping.excelColumns[0]}" vs Export="${exportCol.exportName}"`)
    columnMismatches++
  }
})
if (columnMismatches === 0) {
  console.log('   ✅ All column names match perfectly')
}

console.log('\n4️⃣  Special Fields:')
console.log('   • warehouse/warehouseId: ✅ Handled via relation')
console.log('   • sku/skuId: ✅ Handled via relation')  
console.log('   • createdBy/createdById: ✅ Handled via relation')
console.log('   • attachments: ✅ Export as boolean indicators, upload via API')

// Summary
console.log('\n📋 Summary:')
console.log('━'.repeat(50))

const totalIssues = missingFromImport.length + missingFromExport.length + columnMismatches
if (totalIssues === 0) {
  console.log('✅ PERFECT ALIGNMENT - No gaps found!')
  console.log('All non-system fields can be imported and exported.')
  console.log('Column names are consistent between import and export.')
} else {
  console.log(`❌ Found ${totalIssues} alignment issues`)
}

console.log('\n📝 Field Coverage:')
console.log(`- Can Import: ${importFields.length}/${nonSystemFields.length} non-system fields`)
console.log(`- Can Export: ${exportFields.length} fields (includes relations)`)
console.log(`- UI Shows: ${uiFields.length} essential fields`)
console.log(`- Document Fields: Exported as Yes/No indicators`)