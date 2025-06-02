import { existsSync } from 'fs'
import { join } from 'path'

// Navigation items from main-nav.tsx
const navigation = {
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Inventory Overview', href: '/admin/inventory' },
    { name: 'Inventory Ledger', href: '/warehouse/inventory' },
    { name: 'Run Calculations', href: '/admin/calculations' },
    { name: 'Finance Dashboard', href: '/finance/dashboard' },
    { name: 'Invoices', href: '/finance/invoices' },
    { name: 'Reconciliation', href: '/finance/reconciliation' },
    { name: 'Reports', href: '/admin/reports' },
    { name: 'SKU Master', href: '/admin/settings/skus' },
    { name: 'Cost Rates', href: '/admin/settings/rates' },
    { name: 'Warehouses', href: '/admin/settings/warehouses' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Settings', href: '/admin/settings' },
  ],
  staff: [
    { name: 'Dashboard', href: '/warehouse/dashboard' },
    { name: 'Inventory Ledger', href: '/warehouse/inventory' },
    { name: 'Invoices', href: '/finance/invoices' },
    { name: 'Reconciliation', href: '/finance/reconciliation' },
    { name: 'Reports', href: '/warehouse/reports' },
    { name: 'Settings', href: '/warehouse/settings' },
  ],
}

const appDir = '/Users/jarraramjad/Documents/warehouse_management/src/app'

console.log('Checking Navigation Links...\n')

// Function to check if page exists
function checkPage(href: string): boolean {
  const pagePath = join(appDir, href.slice(1), 'page.tsx')
  return existsSync(pagePath)
}

// Check admin navigation
console.log('ADMIN NAVIGATION:')
console.log('=================')
navigation.admin.forEach(item => {
  const exists = checkPage(item.href)
  console.log(`${exists ? '✅' : '❌'} ${item.name} (${item.href}) - ${exists ? 'EXISTS' : 'MISSING'}`)
})

console.log('\nSTAFF NAVIGATION:')
console.log('=================')
navigation.staff.forEach(item => {
  const exists = checkPage(item.href)
  console.log(`${exists ? '✅' : '❌'} ${item.name} (${item.href}) - ${exists ? 'EXISTS' : 'MISSING'}`)
})

// Check inventory page buttons
console.log('\nINVENTORY PAGE BUTTONS:')
console.log('======================')
const inventoryButtons = [
  { name: 'Receive Goods', href: '/warehouse/receive' },
  { name: 'Ship Goods', href: '/warehouse/ship' },
]

inventoryButtons.forEach(item => {
  const exists = checkPage(item.href)
  console.log(`${exists ? '✅' : '❌'} ${item.name} (${item.href}) - ${exists ? 'EXISTS' : 'MISSING'}`)
})

// Check role permissions
console.log('\nROLE CHECK SUMMARY:')
console.log('==================')
console.log('Navigation uses: session.user.role === "system_admin"')
console.log('Inventory page allows: ["warehouse_staff", "system_admin", "manager", "finance_admin"]')
console.log('\nDatabase roles (old): system_admin, warehouse_staff, finance_admin, manager, viewer')
console.log('Desired roles (new): admin, staff')
console.log('\n⚠️  Role mismatch between desired (admin/staff) and actual (system_admin/warehouse_staff)')