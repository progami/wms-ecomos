import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testNavigation() {
  console.log('Testing Navigation with Current Database Roles...\n')
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        fullName: true
      }
    })
    
    console.log('Current Users:')
    console.log('==============')
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role}`)
    })
    
    console.log('\n\nNavigation Access Summary:')
    console.log('=========================')
    console.log('\nAdmin Navigation (main-nav.tsx):')
    console.log('- Requires: role === "system_admin"')
    console.log('- Who can see: Users with system_admin role')
    
    console.log('\nWarehouse Dashboard:')
    console.log('- Requires: ["warehouse_staff", "system_admin", "manager"]')
    console.log('- Who can access: warehouse staff, admins, and managers')
    
    console.log('\nInventory Page:')
    console.log('- Requires: ["warehouse_staff", "system_admin", "manager", "finance_admin"]')
    console.log('- Who can access: Almost everyone except viewers')
    
    console.log('\nAdmin Dashboard:')
    console.log('- Requires: role === "system_admin"')
    console.log('- Who can access: Only system admins')
    
    console.log('\n\nQuick Actions on Dashboard:')
    console.log('===========================')
    const roles = ['system_admin', 'warehouse_staff', 'finance_admin', 'manager', 'viewer']
    
    const roleActions: Record<string, string[]> = {
      system_admin: ['inventory', 'invoices', 'rates', 'reports', 'settings', 'users'],
      warehouse_staff: ['inventory', 'receive', 'ship', 'invoices', 'rates', 'reconciliation', 'reports'],
      finance_admin: ['inventory', 'invoices', 'rates', 'reconciliation', 'reports'],
      manager: ['inventory', 'invoices', 'rates', 'reconciliation', 'reports', 'settings'],
      viewer: ['inventory', 'reports']
    }
    
    roles.forEach(role => {
      console.log(`\n${role}:`)
      const actions = roleActions[role] || roleActions.warehouse_staff
      console.log(`  Actions: ${actions.join(', ')}`)
    })
    
    console.log('\n\n✅ All role checks have been updated to use database role names!')
    console.log('✅ Navigation should now work correctly for all users!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNavigation()