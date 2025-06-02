import { PrismaClient, UserRole, CostCategory } from '@prisma/client'
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
      name: 'FMC Warehouse',
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
      name: 'Vglobal Warehouse',
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
      name: '4AS Warehouse',
      address: '789 Logistics Ave, City, State 12345',
      contactEmail: '4as@warehouse.com',
      contactPhone: '555-0300',
    },
  })

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

  // Create SKUs
  const skus = [
    {
      skuCode: 'CS 007',
      description: 'Product CS 007',
      packSize: 1,
      unitsPerCarton: 60,
      cartonDimensionsCm: '40 x 44 x 52.5',
      cartonWeightKg: 21.3,
      packagingType: 'Box',
    },
    {
      skuCode: 'CS 008',
      description: 'Product CS 008',
      packSize: 1,
      unitsPerCarton: 60,
      cartonDimensionsCm: '40 x 28 x 29.5',
      cartonWeightKg: 10.0,
      packagingType: 'Poly bag',
    },
    {
      skuCode: 'CS 009',
      description: 'Product CS 009',
      packSize: 1,
      unitsPerCarton: 36,
      cartonDimensionsCm: '38 x 44 x 52.5',
      cartonWeightKg: 20.4,
      packagingType: 'Box',
    },
    {
      skuCode: 'CS 010',
      description: 'Product CS 010',
      packSize: 1,
      unitsPerCarton: 52,
      cartonDimensionsCm: '41 x 28 x 39.5',
      cartonWeightKg: 21.0,
      packagingType: 'Poly bag',
    },
  ]

  const createdSkus = []
  for (const sku of skus) {
    const created = await prisma.sku.upsert({
      where: { skuCode: sku.skuCode },
      update: {},
      create: sku,
    })
    createdSkus.push(created)
  }

  // Create warehouse configurations
  const warehouseConfigs = [
    { warehouseId: warehouse1.id, skuId: createdSkus[0].id, storage: 14, shipping: 16 },
    { warehouseId: warehouse1.id, skuId: createdSkus[1].id, storage: 36, shipping: 16 },
    { warehouseId: warehouse1.id, skuId: createdSkus[2].id, storage: 14, shipping: 16 },
    { warehouseId: warehouse1.id, skuId: createdSkus[3].id, storage: 36, shipping: 16 },
  ]

  for (const config of warehouseConfigs) {
    const existingConfig = await prisma.warehouseSkuConfig.findFirst({
      where: {
        warehouseId: config.warehouseId,
        skuId: config.skuId,
        effectiveDate: new Date('2024-01-01'),
      },
    })

    if (!existingConfig) {
      await prisma.warehouseSkuConfig.create({
        data: {
          warehouseId: config.warehouseId,
          skuId: config.skuId,
          storageCartonsPerPallet: config.storage,
          shippingCartonsPerPallet: config.shipping,
          maxStackingHeightCm: 160,
          effectiveDate: new Date('2024-01-01'),
          createdById: adminUser.id,
        },
      })
    }
  }

  // Create cost rates
  const costRates = [
    {
      warehouseId: warehouse1.id,
      costCategory: CostCategory.Storage,
      costName: 'Storage cost per pallet / week',
      costValue: 3.9,
      unitOfMeasure: 'pallet/week',
    },
    {
      warehouseId: warehouse1.id,
      costCategory: CostCategory.Container,
      costName: 'Container unload',
      costValue: 350,
      unitOfMeasure: 'container',
    },
    {
      warehouseId: warehouse1.id,
      costCategory: CostCategory.Pallet,
      costName: 'Pallet shipment',
      costValue: 30,
      unitOfMeasure: 'pallet',
    },
    {
      warehouseId: warehouse2.id,
      costCategory: CostCategory.Storage,
      costName: 'Storage cost per pallet / week',
      costValue: 2.6,
      unitOfMeasure: 'pallet/week',
    },
  ]

  for (const rate of costRates) {
    const existingRate = await prisma.costRate.findFirst({
      where: {
        warehouseId: rate.warehouseId,
        costCategory: rate.costCategory,
        costName: rate.costName,
        effectiveDate: new Date('2024-01-01'),
      },
    })

    if (!existingRate) {
      await prisma.costRate.create({
        data: {
          ...rate,
          effectiveDate: new Date('2024-01-01'),
          createdById: adminUser.id,
        },
      })
    }
  }

  console.log('✅ Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })