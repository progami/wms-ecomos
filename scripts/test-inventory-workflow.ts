#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function main() {
  console.log('Testing inventory workflow...')
  
  try {
    // 1. Get or create test SKUs
    console.log('\n1. Getting or creating test SKUs...')
    const timestamp = Date.now()
    const skus = await prisma.$transaction([
      prisma.sku.upsert({
        where: { skuCode: 'TEST-SKU-001' },
        update: {},
        create: {
          skuCode: 'TEST-SKU-001',
          description: 'Test Product 1 - Widget',
          unitsPerCarton: 12,
          packSize: 1,
          isActive: true,
        }
      }),
      prisma.sku.upsert({
        where: { skuCode: 'TEST-SKU-002' },
        update: {},
        create: {
          skuCode: 'TEST-SKU-002',
          description: 'Test Product 2 - Gadget',
          unitsPerCarton: 24,
          packSize: 1,
          isActive: true,
        }
      }),
      prisma.sku.upsert({
        where: { skuCode: 'TEST-SKU-003' },
        update: {},
        create: {
          skuCode: 'TEST-SKU-003',
          description: 'Test Product 3 - Device',
          unitsPerCarton: 6,
          packSize: 1,
          isActive: true,
        }
      })
    ])
    console.log(`Found/Created ${skus.length} SKUs`)

    // 2. Get warehouses
    console.log('\n2. Getting warehouses...')
    const warehouses = await prisma.warehouse.findMany()
    console.log(`Found ${warehouses.length} warehouses:`)
    warehouses.forEach(w => console.log(`  - ${w.code}: ${w.name}`))

    // 3. Get admin user first
    const user = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (!user) {
      throw new Error('No admin user found')
    }

    // 4. Create warehouse SKU configurations
    console.log('\n3. Creating warehouse SKU configurations...')
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        await prisma.warehouseSkuConfig.create({
          data: {
            warehouseId: warehouse.id,
            skuId: sku.id,
            storageCartonsPerPallet: 48,
            shippingCartonsPerPallet: 40,
            effectiveDate: new Date(),
            createdById: user.id,
          }
        })
      }
    }
    console.log('Created configurations')

    // 5. Create a test receiving transaction
    console.log('\n5. Creating test receiving transaction...')
    const warehouse = warehouses[0]
    const sku = skus[0]
    
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        transactionId: `RCV-${Date.now()}`,
        transactionDate: new Date(),
        transactionType: 'RECEIVE',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 3,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 48,
        createdById: user.id,
      }
    })
    console.log(`Created receiving transaction: ${transaction.transactionId}`)

    // 6. Check inventory balance
    console.log('\n6. Checking inventory balance...')
    const balance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: warehouse.id,
        skuId: sku.id,
      },
      include: {
        warehouse: true,
        sku: true,
      }
    })
    
    if (balance) {
      console.log(`Inventory balance for ${balance.sku.skuCode} at ${balance.warehouse.name}:`)
      console.log(`  Cartons: ${balance.currentCartons}`)
      console.log(`  Pallets: ${balance.currentPallets}`)
      console.log(`  Units: ${balance.currentUnits}`)
    } else {
      console.log('No inventory balance found')
    }

    // 7. Test shipping
    console.log('\n7. Creating test shipping transaction...')
    const shipTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionId: `SHIP-${Date.now()}`,
        transactionDate: new Date(),
        transactionType: 'SHIP',
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'BATCH-001',
        cartonsIn: 0,
        cartonsOut: 20,
        storagePalletsIn: 0,
        shippingPalletsOut: 1,
        shippingCartonsPerPallet: 40,
        createdById: user.id,
      }
    })
    console.log(`Created shipping transaction: ${shipTransaction.transactionId}`)

    // 8. Check updated balance
    console.log('\n8. Checking updated inventory balance...')
    const updatedBalance = await prisma.inventoryBalance.findFirst({
      where: {
        warehouseId: warehouse.id,
        skuId: sku.id,
      }
    })
    
    if (updatedBalance) {
      console.log(`Updated balance:`)
      console.log(`  Cartons: ${updatedBalance.currentCartons}`)
      console.log(`  Pallets: ${updatedBalance.currentPallets}`)
    }

    console.log('\n✅ Inventory workflow test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing inventory workflow:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()