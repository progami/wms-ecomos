import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

console.log('Updating all role checks to use 2-role system (admin/staff)...\n')

// Map of replacements - reverting the previous changes
const replacements = [
  // Single role checks - revert back to 2-role system
  { from: "role !== 'system_admin'", to: "role !== 'admin'" },
  { from: "role === 'system_admin'", to: "role === 'admin'" },
  { from: "role !== 'warehouse_staff'", to: "role !== 'staff'" },
  { from: "role === 'warehouse_staff'", to: "role === 'staff'" },
  
  // Array includes checks - simplify to 2 roles
  { from: "['system_admin', 'warehouse_staff', 'finance_admin', 'manager']", to: "['admin', 'staff']" },
  { from: "['warehouse_staff', 'system_admin', 'manager']", to: "['staff', 'admin']" },
  { from: "['warehouse_staff', 'system_admin', 'manager', 'finance_admin']", to: "['staff', 'admin']" },
  
  // Role action mappings
  { from: "system_admin:", to: "admin:" },
  { from: "warehouse_staff:", to: "staff:" },
  { from: "finance_admin:", to: "staff:" },
  { from: "manager:", to: "staff:" },
  { from: "viewer:", to: "staff:" },
  
  // Navigation check
  { from: "session.user.role === 'system_admin'", to: "session.user.role === 'admin'" },
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
console.log('\nRole system updated:')
console.log('- admin: Full system access')
console.log('- staff: Operational access (warehouse, finance, reports)')