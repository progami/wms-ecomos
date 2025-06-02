import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('Checking users after 2-role migration...\n')
  
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        fullName: true,
        isActive: true
      },
      orderBy: { role: 'asc' }
    })
    
    console.log('Current Users and Roles:')
    console.log('========================')
    
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (${user.fullName})`)
    })
    
    console.log('\n✅ Migration Summary:')
    console.log(`- Total users: ${users.length}`)
    console.log(`- Admin users: ${users.filter(u => u.role === 'admin').length}`)
    console.log(`- Staff users: ${users.filter(u => u.role === 'staff').length}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()