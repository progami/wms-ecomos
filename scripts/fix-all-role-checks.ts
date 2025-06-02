import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

console.log('Fixing all role checks to use database role names...\n')

// Map of replacements
const replacements = [
  // Single role checks
  { from: "role !== 'admin'", to: "role !== 'system_admin'" },
  { from: "role === 'admin'", to: "role === 'system_admin'" },
  { from: "role !== 'staff'", to: "role !== 'warehouse_staff'" },
  { from: "role === 'staff'", to: "role === 'warehouse_staff'" },
  
  // Array includes checks
  { from: "['admin', 'staff']", to: "['system_admin', 'warehouse_staff', 'finance_admin', 'manager']" },
  { from: "['staff', 'admin']", to: "['warehouse_staff', 'system_admin', 'manager']" },
  
  // Role action mappings
  { from: "admin: ['inventory'", to: "system_admin: ['inventory'" },
  { from: "staff: ['inventory'", to: "warehouse_staff: ['inventory'" },
]

// Find all TypeScript files
const files = glob.sync('/Users/jarraramjad/Documents/warehouse_management/src/**/*.{ts,tsx}', {
  ignore: ['**/*.test.*', '**/__tests__/**']
})

let totalFixed = 0

files.forEach(file => {
  let content = readFileSync(file, 'utf8')
  let modified = false
  
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      const count = (content.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to)
      if (count > 0) {
        console.log(`Fixed ${count} occurrence(s) in: ${file.replace('/Users/jarraramjad/Documents/warehouse_management/', '')}`)
        console.log(`  "${from}" → "${to}"`)
        modified = true
        totalFixed += count
      }
    }
  })
  
  if (modified) {
    writeFileSync(file, content)
  }
})

console.log(`\n✅ Fixed ${totalFixed} role checks across ${files.length} files!`)
console.log('\nRole mapping:')
console.log('- admin → system_admin')
console.log('- staff → warehouse_staff (+ finance_admin, manager for broader access)')
console.log('\nDatabase roles: system_admin, warehouse_staff, finance_admin, manager, viewer')