import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuth() {
  console.log('Testing authentication setup...\n')
  
  try {
    // Check if admin user exists
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@warehouse.com' },
          { username: 'admin' }
        ]
      }
    })
    
    if (!adminUser) {
      console.log('❌ No admin user found!')
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
      console.log('✅ Admin user exists:')
      console.log('   Email:', adminUser.email)
      console.log('   Username:', adminUser.username)
      console.log('   Active:', adminUser.isActive)
      
      // Verify password
      const isValid = await bcrypt.compare('SecureWarehouse2024!', adminUser.passwordHash)
      if (!isValid) {
        console.log('❌ Password verification failed!')
        console.log('Updating password...')
        const hashedPassword = await bcrypt.hash('SecureWarehouse2024!', 10)
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { 
            passwordHash: hashedPassword,
            isActive: true
          }
        })
        console.log('✅ Password updated')
      } else {
        console.log('✅ Password is correct')
      }
    }
    
    // Test authentication logic
    console.log('\nTesting authentication with credentials:')
    console.log('Username: admin')
    console.log('Password: SecureWarehouse2024!')
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin' },
          { username: 'admin' }
        ]
      }
    })
    
    if (user && user.isActive) {
      const passwordValid = await bcrypt.compare('SecureWarehouse2024!', user.passwordHash)
      if (passwordValid) {
        console.log('✅ Authentication test passed!')
      } else {
        console.log('❌ Authentication test failed: Invalid password')
      }
    } else {
      console.log('❌ Authentication test failed: User not found or inactive')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuth()