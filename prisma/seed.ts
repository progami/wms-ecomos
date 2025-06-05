import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create warehouses
  const warehouse1 = await prisma.warehouse.upsert({
    where: { code: 'FMC' },
    update: {},
    create: {
      code: 'FMC',
      name: 'FMC',
      address: '123 Main St, City, State 12345',
      contactEmail: 'fmc@warehouse.com',
      contactPhone: '555-0100',
    },
  })

  const warehouse2 = await prisma.warehouse.upsert({
    where: { code: 'VGLOBAL' },
    update: {},
    create: {
      code: 'VGLOBAL',
      name: 'VGlobal',
      address: '456 Industrial Blvd, City, State 12345',
      contactEmail: 'vglobal@warehouse.com',
      contactPhone: '555-0200',
    },
  })

  const warehouse3 = await prisma.warehouse.upsert({
    where: { code: '4AS' },
    update: {},
    create: {
      code: '4AS',
      name: '4AS',
      address: '789 Logistics Ave, City, State 12345',
      contactEmail: '4as@warehouse.com',
      contactPhone: '555-0300',
    },
  })

  console.log('✅ Created warehouses: FMC, VGlobal, 4AS')

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10)
  const staffPassword = await bcrypt.hash('staff123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@warehouse.com' },
    update: {},
    create: {
      email: 'admin@warehouse.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.admin,
    },
  })

  const hasharUser = await prisma.user.upsert({
    where: { email: 'hashar@warehouse.com' },
    update: {},
    create: {
      email: 'hashar@warehouse.com',
      passwordHash: staffPassword,
      fullName: 'Hashar (Finance Manager)',
      role: UserRole.staff,
    },
  })

  const umairUser = await prisma.user.upsert({
    where: { email: 'umair@warehouse.com' },
    update: {},
    create: {
      email: 'umair@warehouse.com',
      passwordHash: staffPassword,
      fullName: 'Umair (Operations Manager)',
      role: UserRole.staff,
      warehouseId: warehouse1.id,
    },
  })

  console.log('✅ Created users:')
  console.log('   - admin@warehouse.com (password: admin123)')
  console.log('   - hashar@warehouse.com (password: staff123)')
  console.log('   - umair@warehouse.com (password: staff123)')
  
  console.log('\n✅ Database seed completed!')
  console.log('📝 Note: SKUs, cost rates, and warehouse configurations should be imported from Excel')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })