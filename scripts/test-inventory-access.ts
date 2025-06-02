import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAccess() {
  console.log('Testing inventory page access...\n')
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        isActive: true
      }
    })
    
    console.log('Current users and their access:')
    console.log('================================')
    
    users.forEach(user => {
      const canAccess = ['warehouse_staff', 'system_admin', 'manager'].includes(user.role as string)
      console.log(`${user.email}:`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Active: ${user.isActive}`)
      console.log(`  Can access inventory: ${canAccess ? '✅ YES' : '❌ NO'}`)
      console.log('')
    })
    
    console.log('\nThe inventory page checks for these roles:')
    console.log("- 'staff' (NEW role)")
    console.log("- 'admin' (NEW role)")
    console.log('\nBut the database still has OLD roles:')
    console.log("- system_admin")
    console.log("- warehouse_staff")
    console.log("- finance_admin")
    console.log("- manager")
    console.log("- viewer")
    
    console.log('\n⚠️  This mismatch is causing the redirect!')
    console.log('\nTo fix:')
    console.log('1. Update the inventory page to check for the OLD roles')
    console.log('2. OR complete the role migration to new roles')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAccess()