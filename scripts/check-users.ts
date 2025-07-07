import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('Checking existing users...\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      isDemo: true,
    }
  })
  
  console.log('Found users:')
  users.forEach(user => {
    console.log(`- ${user.username || 'NO USERNAME'} | ${user.email} | ${user.fullName} | ${user.role} | Active: ${user.isActive}`)
  })
  
  // Check if admin user exists
  const adminUser = users.find(u => u.email === 'admin@warehouse.com' || u.username === 'admin')
  if (!adminUser) {
    console.log('\n❌ No admin user found!')
    console.log('Creating admin user...')
    
    const hashedPassword = await bcrypt.hash('SecureWarehouse2024!', 10)
    const newAdmin = await prisma.user.create({
      data: {
        email: 'admin@warehouse.com',
        username: 'admin',
        fullName: 'System Administrator',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        isDemo: false,
      }
    })
    console.log('✅ Admin user created:', newAdmin.email)
  } else {
    console.log('\n✅ Admin user exists:', adminUser.email)
    
    // Update password to ensure it matches
    const hashedPassword = await bcrypt.hash('SecureWarehouse2024!', 10)
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { 
        passwordHash: hashedPassword,
        username: adminUser.username || 'admin',
        isActive: true
      }
    })
    console.log('✅ Admin password updated')
  }
}

checkUsers()
  .then(() => console.log('\nDone!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect())