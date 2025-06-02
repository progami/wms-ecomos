import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating/updating users...')
  
  const adminPassword = await bcrypt.hash('admin123', 10)
  const staffPassword = await bcrypt.hash('staff123', 10)
  
  try {
    // Update admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@warehouse.com' },
      update: {
        passwordHash: adminPassword,
        fullName: 'System Administrator',
        isActive: true,
      },
      create: {
        email: 'admin@warehouse.com',
        passwordHash: adminPassword,
        fullName: 'System Administrator',
        role: 'system_admin' as any, // Keep old role for now
        isActive: true,
      },
    })
    console.log('✓ Admin user:', admin.email)
    
    // Create/update Hashar
    const hashar = await prisma.user.upsert({
      where: { email: 'hashar@warehouse.com' },
      update: {
        passwordHash: staffPassword,
        fullName: 'Hashar (Finance Manager)',
        isActive: true,
      },
      create: {
        email: 'hashar@warehouse.com',
        passwordHash: staffPassword,
        fullName: 'Hashar (Finance Manager)',
        role: 'finance_admin' as any, // Use old role that exists
        isActive: true,
      },
    })
    console.log('✓ Created user:', hashar.email, '- Finance Manager')
    
    // Get a warehouse for Umair
    const warehouse = await prisma.warehouse.findFirst({
      where: { isActive: true }
    })
    
    // Create/update Umair
    const umair = await prisma.user.upsert({
      where: { email: 'umair@warehouse.com' },
      update: {
        passwordHash: staffPassword,
        fullName: 'Umair (Operations Manager)',
        warehouseId: warehouse?.id,
        isActive: true,
      },
      create: {
        email: 'umair@warehouse.com',
        passwordHash: staffPassword,
        fullName: 'Umair (Operations Manager)',
        role: 'warehouse_staff' as any, // Use old role that exists
        warehouseId: warehouse?.id,
        isActive: true,
      },
    })
    console.log('✓ Created user:', umair.email, '- Operations Manager')
    
    console.log('\n✅ Users created successfully!')
    console.log('\nLogin credentials:')
    console.log('- admin@warehouse.com / admin123')
    console.log('- hashar@warehouse.com / staff123')
    console.log('- umair@warehouse.com / staff123')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()