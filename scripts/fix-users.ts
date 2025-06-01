import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating/updating test users...')
  
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@warehouse.com' },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      email: 'admin@warehouse.com',
      passwordHash: hashedPassword,
      fullName: 'System Admin',
      role: 'system_admin',
      isActive: true,
    },
  })
  console.log('✓ Admin user:', admin.email)
  
  // Create or update finance user
  const finance = await prisma.user.upsert({
    where: { email: 'finance@warehouse.com' },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      email: 'finance@warehouse.com',
      passwordHash: hashedPassword,
      fullName: 'Finance Admin',
      role: 'finance_admin',
      isActive: true,
    },
  })
  console.log('✓ Finance user:', finance.email)
  
  // Create or update warehouse staff
  const warehouses = await prisma.warehouse.findFirst({
    where: { isActive: true }
  })
  
  const staff = await prisma.user.upsert({
    where: { email: 'staff@warehouse.com' },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      email: 'staff@warehouse.com',
      passwordHash: hashedPassword,
      fullName: 'Warehouse Staff',
      role: 'warehouse_staff',
      warehouseId: warehouses?.id,
      isActive: true,
    },
  })
  console.log('✓ Staff user:', staff.email)
  
  console.log('\nAll users have password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })