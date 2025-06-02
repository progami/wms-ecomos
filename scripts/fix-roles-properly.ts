import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing user roles to match current enum values...')
  
  try {
    // First, let's see what roles exist
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true
      }
    })
    
    console.log('\nCurrent users and roles:')
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role}`)
    })
    
    // The enum still has the old values, so we can't update to 'admin' or 'staff' yet
    // Instead, let's make sure everyone has valid current roles
    
    // Update admin@warehouse.com to system_admin if needed
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@warehouse.com' }
    })
    
    if (adminUser && adminUser.role !== 'system_admin') {
      await prisma.user.update({
        where: { email: 'admin@warehouse.com' },
        data: { role: 'system_admin' }
      })
      console.log('\n✓ Updated admin@warehouse.com to system_admin')
    }
    
    // Update other users to warehouse_staff if they don't have a valid role
    const otherUsers = users.filter(u => u.email !== 'admin@warehouse.com')
    for (const user of otherUsers) {
      if (!['warehouse_staff', 'finance_admin', 'manager', 'viewer'].includes(user.role as string)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'warehouse_staff' }
        })
        console.log(`✓ Updated ${user.email} to warehouse_staff`)
      }
    }
    
    console.log('\n✅ All users now have valid roles!')
    console.log('\nTo complete the migration to admin/staff roles:')
    console.log('1. Run: npm run db:seed')
    console.log('2. The schema will be updated with the new enum values')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()