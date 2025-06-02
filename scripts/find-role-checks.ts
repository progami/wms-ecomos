import { execSync } from 'child_process'
import { readFileSync } from 'fs'

console.log('Finding all role checks in the codebase...\n')

// Search for role checks
const patterns = [
  'role === ',
  'role !== ',
  'includes(session.user.role)',
  '.includes(.*role',
  'roleActions',
  'role:',
  "'admin'",
  "'staff'",
  "'system_admin'",
  "'warehouse_staff'",
  "'finance_admin'",
  "'manager'",
  "'viewer'"
]

const srcDir = '/Users/jarraramjad/Documents/warehouse_management/src'

console.log('ROLE CHECKS FOUND:\n==================\n')

patterns.forEach(pattern => {
  try {
    const command = `grep -r "${pattern}" ${srcDir} --include="*.tsx" --include="*.ts" | grep -v ".test." | grep -v "__tests__" | head -20`
    const results = execSync(command, { encoding: 'utf8' })
    
    if (results.trim()) {
      console.log(`\nPattern: "${pattern}"\n${'-'.repeat(50)}`)
      console.log(results)
    }
  } catch (e) {
    // Grep returns non-zero if no matches found
  }
})

console.log('\n\nSUMMARY:\n========')
console.log('Database has these roles: system_admin, warehouse_staff, finance_admin, manager, viewer')
console.log('Code should use OLD roles until database migration is complete')
console.log('\nPages that need role checks:')
console.log('- Admin pages: Should check for "system_admin"')
console.log('- Warehouse pages: Should check for "warehouse_staff", "system_admin", "manager"')
console.log('- Finance pages: Should check for "finance_admin", "system_admin"')