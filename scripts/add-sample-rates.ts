import { PrismaClient, CostCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding sample cost rates...')

  // Get warehouses
  const warehouses = await prisma.warehouse.findMany()
  
  if (warehouses.length === 0) {
    console.error('❌ No warehouses found. Please run seed first.')
    return
  }

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@warehouse.com' }
  })

  if (!adminUser) {
    console.error('❌ Admin user not found. Please run seed first.')
    return
  }

  // Additional cost rates for each warehouse
  const additionalRates = [
    // Storage rates
    {
      costCategory: CostCategory.Storage,
      costName: 'Storage cost per carton / month',
      costValue: 0.75,
      unitOfMeasure: 'carton/month',
    },
    {
      costCategory: CostCategory.Storage,
      costName: 'Long-term storage (6+ months)',
      costValue: 2.5,
      unitOfMeasure: 'pallet/week',
    },
    {
      costCategory: CostCategory.Storage,
      costName: 'Temperature controlled storage',
      costValue: 5.5,
      unitOfMeasure: 'pallet/week',
    },
    // Container rates
    {
      costCategory: CostCategory.Container,
      costName: 'Container load - 20ft',
      costValue: 400,
      unitOfMeasure: 'container',
    },
    {
      costCategory: CostCategory.Container,
      costName: 'Container load - 40ft',
      costValue: 550,
      unitOfMeasure: 'container',
    },
    {
      costCategory: CostCategory.Container,
      costName: 'Container documentation fee',
      costValue: 75,
      unitOfMeasure: 'container',
    },
    // Carton rates
    {
      costCategory: CostCategory.Carton,
      costName: 'Carton pick & pack',
      costValue: 2.5,
      unitOfMeasure: 'carton',
    },
    {
      costCategory: CostCategory.Carton,
      costName: 'Carton labeling',
      costValue: 0.5,
      unitOfMeasure: 'carton',
    },
    {
      costCategory: CostCategory.Carton,
      costName: 'Carton inspection',
      costValue: 1.0,
      unitOfMeasure: 'carton',
    },
    // Pallet rates
    {
      costCategory: CostCategory.Pallet,
      costName: 'Pallet in/out',
      costValue: 15,
      unitOfMeasure: 'pallet',
    },
    {
      costCategory: CostCategory.Pallet,
      costName: 'Pallet wrapping',
      costValue: 5,
      unitOfMeasure: 'pallet',
    },
    {
      costCategory: CostCategory.Pallet,
      costName: 'Pallet build/break',
      costValue: 25,
      unitOfMeasure: 'pallet',
    },
    // Accessorial rates
    {
      costCategory: CostCategory.Accessorial,
      costName: 'Handling fee',
      costValue: 50,
      unitOfMeasure: 'order',
    },
    {
      costCategory: CostCategory.Accessorial,
      costName: 'Documentation fee',
      costValue: 25,
      unitOfMeasure: 'shipment',
    },
    {
      costCategory: CostCategory.Accessorial,
      costName: 'Rush order surcharge',
      costValue: 100,
      unitOfMeasure: 'order',
    },
    // Shipment rates
    {
      costCategory: CostCategory.Shipment,
      costName: 'LTL shipment',
      costValue: 150,
      unitOfMeasure: 'shipment',
    },
    {
      costCategory: CostCategory.Shipment,
      costName: 'FTL shipment base',
      costValue: 1200,
      unitOfMeasure: 'shipment',
    },
    // Unit rates
    {
      costCategory: CostCategory.Unit,
      costName: 'Unit pick & pack',
      costValue: 0.75,
      unitOfMeasure: 'unit',
    },
    {
      costCategory: CostCategory.Unit,
      costName: 'Unit labeling',
      costValue: 0.25,
      unitOfMeasure: 'unit',
    },
  ]

  // Add rates for each warehouse with slight variations
  for (const warehouse of warehouses) {
    for (const rate of additionalRates) {
      // Check if rate already exists
      const existing = await prisma.costRate.findFirst({
        where: {
          warehouseId: warehouse.id,
          costCategory: rate.costCategory,
          costName: rate.costName,
          effectiveDate: new Date('2024-01-01'),
        }
      })

      if (!existing) {
        // Add some variation to rates between warehouses
        const variation = warehouse.code === 'FMC' ? 1.0 : 
                         warehouse.code === 'VGLOBAL' ? 0.85 : 0.9
        
        await prisma.costRate.create({
          data: {
            warehouseId: warehouse.id,
            costCategory: rate.costCategory,
            costName: rate.costName,
            costValue: Number((rate.costValue * variation).toFixed(2)),
            unitOfMeasure: rate.unitOfMeasure,
            effectiveDate: new Date('2024-01-01'),
            createdById: adminUser.id,
          }
        })
        console.log(`✅ Added ${rate.costName} for ${warehouse.name}`)
      }
    }

    // Add some historical rates (expired)
    const historicalRates = [
      {
        costCategory: CostCategory.Storage,
        costName: 'Storage cost per pallet / week',
        costValue: 3.5,
        unitOfMeasure: 'pallet/week',
        effectiveDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      },
      {
        costCategory: CostCategory.Container,
        costName: 'Container unload',
        costValue: 300,
        unitOfMeasure: 'container',
        effectiveDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      },
    ]

    for (const rate of historicalRates) {
      const existing = await prisma.costRate.findFirst({
        where: {
          warehouseId: warehouse.id,
          costCategory: rate.costCategory,
          costName: rate.costName,
          effectiveDate: rate.effectiveDate,
        }
      })

      if (!existing) {
        await prisma.costRate.create({
          data: {
            warehouseId: warehouse.id,
            costCategory: rate.costCategory,
            costName: rate.costName,
            costValue: rate.costValue,
            unitOfMeasure: rate.unitOfMeasure,
            effectiveDate: rate.effectiveDate,
            endDate: rate.endDate,
            createdById: adminUser.id,
          }
        })
        console.log(`✅ Added historical ${rate.costName} for ${warehouse.name}`)
      }
    }
  }

  console.log('✅ Sample cost rates added successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error adding rates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })