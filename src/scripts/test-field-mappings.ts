/**
 * Test Script for Field Mapping Consistency
 * Run with: npm run tsx src/scripts/test-field-mappings.ts
 */

import { validateFieldMappings, generateFieldMappingReport } from '../lib/field-mapping-validation'
import { importConfigs } from '../lib/import-config'
import { INVENTORY_TRANSACTION_COLUMNS } from '../lib/column-ordering'

// console.log('🔍 Testing Field Mapping Consistency\n')
// console.log('=' .repeat(60))

// Test all entities
const entities = Object.keys(importConfigs)

let hasErrors = false

entities.forEach(entityName => {
  // console.log(`\n📋 Testing: ${importConfigs[entityName].displayName}`)
  // console.log('-'.repeat(40))
  
  const validation = validateFieldMappings(entityName)
  
  if (validation.isValid) {
    // console.log('✅ Status: Valid')
  } else {
    // console.log('❌ Status: Invalid')
    hasErrors = true
  }
  
  if (validation.errors.length > 0) {
    // console.log('\n🚨 Errors:')
    // validation.errors.forEach(error => console.log(`   - ${error}`))
  }
  
  if (validation.warnings.length > 0) {
    // console.log('\n⚠️  Warnings:')
    // validation.warnings.forEach(warning => console.log(`   - ${warning}`))
  }
})

// Test specific inventory transaction field mapping
// console.log('\n\n' + '='.repeat(60))
// console.log('📊 Inventory Transaction Field Mapping Analysis')
// console.log('='.repeat(60))

const inventoryConfig = importConfigs.inventoryTransactions
const importFields = inventoryConfig.fieldMappings.map(f => f.dbField).sort()
const exportFields = INVENTORY_TRANSACTION_COLUMNS
  .filter(col => col.showInExport && !col.isRelation)
  .map(col => col.fieldName)
  .sort()

// console.log('\n📥 Import Fields:', importFields.length)
// console.log(importFields.join(', '))

// console.log('\n📤 Export Fields:', exportFields.length)
// console.log(exportFields.join(', '))

// Find differences
const onlyInImport = importFields.filter(f => !exportFields.includes(f))
const onlyInExport = exportFields.filter(f => !importFields.includes(f))

if (onlyInImport.length > 0) {
  // console.log('\n🔸 Fields only in Import:')
  // console.log(onlyInImport.join(', '))
}

if (onlyInExport.length > 0) {
  // console.log('\n🔸 Fields only in Export:')
  // console.log(onlyInExport.join(', '))
}

// Generate detailed report for inventory transactions
// console.log('\n\n' + '='.repeat(60))
// console.log('📄 Detailed Field Mapping Report')
// console.log('='.repeat(60))
// console.log(generateFieldMappingReport('inventoryTransactions'))

// Summary
// console.log('\n' + '='.repeat(60))
// console.log('📊 Summary')
// console.log('='.repeat(60))
// console.log(`Total entities tested: ${entities.length}`)
// console.log(`Result: ${hasErrors ? '❌ Some entities have errors' : '✅ All entities are valid'}`)

// Exit with error code if there are validation errors
if (hasErrors) {
  process.exit(1)
}