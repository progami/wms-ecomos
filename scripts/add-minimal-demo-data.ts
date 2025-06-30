#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simple console logger for scripts
const logger = {
  info: (message: string) => console.log(`ℹ️  ${message}`),
  error: (message: string, error?: any) => console.error(`❌ ${message}`, error || ''),
  success: (message: string) => console.log(`✅ ${message}`)
}

async function addMinimalDemoData() {
  console.log('🌱 Adding minimal demo data for testing...\n')
  
  try {
    // 1. Create SKUs with different stock levels for restock testing
    console.log('📦 Creating SKUs...')
    const skus = await Promise.all([
      prisma.sku.create({
        data: {
          skuCode: 'LAPTOP-001',
          asin: 'B08N5WRWNW',
          description: 'Echo Laptop Stand - Ergonomic Aluminum',
          packSize: 1,
          material: 'Aluminum',
          unitDimensionsCm: '25x20x5',
          unitWeightKg: 0.8,
          unitsPerCarton: 12,
          cartonDimensionsCm: '40x30x20',
          cartonWeightKg: 10.5,
          packagingType: 'Box',
          fbaStock: 50, // Low stock - will trigger high urgency
          fbaStockLastUpdated: new Date(),
        }
      }),
      prisma.sku.create({
        data: {
          skuCode: 'PHONE-CASE-001',
          asin: 'B07XQXZXJC',
          description: 'Premium Silicone Phone Case - iPhone 15',
          packSize: 1,
          material: 'Silicone',
          unitDimensionsCm: '15x8x1',
          unitWeightKg: 0.05,
          unitsPerCarton: 100,
          cartonDimensionsCm: '40x30x20',
          cartonWeightKg: 6,
          packagingType: 'Poly Bag',
          fbaStock: 200, // Medium stock
          fbaStockLastUpdated: new Date(),
        }
      }),
      prisma.sku.create({
        data: {
          skuCode: 'WATER-BOTTLE-001',
          asin: 'B096ZGFMKN',
          description: 'Insulated Stainless Steel Water Bottle - 32oz',
          packSize: 1,
          material: 'Stainless Steel',
          unitDimensionsCm: '28x8x8',
          unitWeightKg: 0.35,
          unitsPerCarton: 24,
          cartonDimensionsCm: '50x40x30',
          cartonWeightKg: 9.5,
          packagingType: 'Box',
          fbaStock: 500, // Good stock
          fbaStockLastUpdated: new Date(),
        }
      }),
      prisma.sku.create({
        data: {
          skuCode: 'CHARGER-001',
          asin: 'B0BK8QZH6M',
          description: 'Fast Charging USB-C Adapter - 65W',
          packSize: 1,
          material: 'Plastic',
          unitDimensionsCm: '6x6x3',
          unitWeightKg: 0.15,
          unitsPerCarton: 50,
          cartonDimensionsCm: '30x25x15',
          cartonWeightKg: 8.5,
          packagingType: 'Box',
          fbaStock: 0, // Out of stock - critical
          fbaStockLastUpdated: new Date(),
        }
      })
    ])
    console.log(`✅ Created ${skus.length} SKUs`)

    // 2. Create Cost Rates for each warehouse
    console.log('\n💰 Creating cost rates...')
    const warehouses = await prisma.warehouse.findMany()
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    
    for (const warehouse of warehouses) {
      await prisma.costRate.createMany({
        data: [
          {
            warehouseId: warehouse.id,
            costCategory: 'Storage',
            costName: 'Weekly Storage Rate',
            costValue: 0.75,
            unitOfMeasure: 'pallet/week',
            effectiveDate: new Date('2024-01-01'),
            createdById: admin!.id,
          },
          {
            warehouseId: warehouse.id,
            costCategory: 'Container',
            costName: 'Container Unloading',
            costValue: 450,
            unitOfMeasure: 'container',
            effectiveDate: new Date('2024-01-01'),
            createdById: admin!.id,
          },
          {
            warehouseId: warehouse.id,
            costCategory: 'Carton',
            costName: 'Inbound Processing',
            costValue: 0.50,
            unitOfMeasure: 'carton',
            effectiveDate: new Date('2024-01-01'),
            createdById: admin!.id,
          },
          {
            warehouseId: warehouse.id,
            costCategory: 'Carton',
            costName: 'Outbound Processing',
            costValue: 0.75,
            unitOfMeasure: 'carton',
            effectiveDate: new Date('2024-01-01'),
            createdById: admin!.id,
          }
        ]
      })
    }
    console.log(`✅ Created cost rates for ${warehouses.length} warehouses`)

    // 3. Create some inventory transactions
    console.log('\n📦 Creating inventory transactions...')
    const fmcWarehouse = warehouses.find(w => w.code === 'FMC')!
    
    // Create receive transactions
    const receiveTransactions = []
    for (const sku of skus) {
      const transaction = await prisma.inventoryTransaction.create({
        data: {
          transactionId: `RCV-${Date.now()}-${sku.skuCode}`,
          warehouseId: fmcWarehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-2024-06',
          transactionType: 'RECEIVE',
          referenceId: 'PO-2024-06-001',
          cartonsIn: 10,
          cartonsOut: 0,
          storagePalletsIn: 2,
          shippingPalletsOut: 0,
          transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          pickupDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          storageCartonsPerPallet: 5,
          shipName: 'EVERGREEN GLORY',
          trackingNumber: `TRK${Math.random().toString(36).substring(7).toUpperCase()}`,
          modeOfTransportation: 'Sea',
          createdById: admin!.id,
        }
      })
      receiveTransactions.push(transaction)
    }
    console.log(`✅ Created ${receiveTransactions.length} receive transactions`)

    // Create ship transactions for some SKUs
    const shipTransactions = []
    for (let i = 0; i < 2; i++) {
      const sku = skus[i]
      const transaction = await prisma.inventoryTransaction.create({
        data: {
          transactionId: `SHP-${Date.now()}-${sku.skuCode}-${i}`,
          warehouseId: fmcWarehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-2024-06',
          transactionType: 'SHIP',
          referenceId: `FBA-SHIP-2024-06-${i + 1}`,
          cartonsIn: 0,
          cartonsOut: 3,
          storagePalletsIn: 0,
          shippingPalletsOut: 1,
          transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          pickupDate: new Date(),
          shippingCartonsPerPallet: 3,
          trackingNumber: `UPS${Math.random().toString(36).substring(7).toUpperCase()}`,
          modeOfTransportation: 'Ground',
          createdById: admin!.id,
        }
      })
      shipTransactions.push(transaction)
    }
    console.log(`✅ Created ${shipTransactions.length} ship transactions`)

    // 4. Update inventory balances
    console.log('\n📊 Updating inventory balances...')
    for (const sku of skus) {
      const balance = await prisma.inventoryBalance.findFirst({
        where: {
          warehouseId: fmcWarehouse.id,
          skuId: sku.id,
          batchLot: 'BATCH-2024-06'
        }
      })

      if (!balance) {
        await prisma.inventoryBalance.create({
          data: {
            warehouseId: fmcWarehouse.id,
            skuId: sku.id,
            batchLot: 'BATCH-2024-06',
            currentCartons: 7, // 10 received - 3 shipped (for first 2 SKUs)
            currentPallets: 2,
            currentUnits: sku.unitsPerCarton * 7,
            lastTransactionDate: new Date(),
            storageCartonsPerPallet: 5,
          }
        })
      }
    }
    console.log('✅ Updated inventory balances')

    // 5. Create warehouse SKU configurations
    console.log('\n⚙️ Creating warehouse SKU configurations...')
    for (const sku of skus) {
      await prisma.warehouseSkuConfig.create({
        data: {
          warehouseId: fmcWarehouse.id,
          skuId: sku.id,
          storageCartonsPerPallet: 5,
          shippingCartonsPerPallet: 5,
          maxStackingHeightCm: 200,
          effectiveDate: new Date('2024-01-01'),
          createdById: admin!.id,
        }
      })
    }
    console.log('✅ Created warehouse SKU configurations')

    console.log('\n✨ Demo data added successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - ${skus.length} SKUs with various stock levels`)
    console.log(`   - ${warehouses.length * 4} cost rates`)
    console.log(`   - ${receiveTransactions.length + shipTransactions.length} inventory transactions`)
    console.log(`   - Inventory balances updated`)
    console.log(`   - Warehouse SKU configurations created`)
    
    console.log('\n🎯 You can now test:')
    console.log('   1. Shipment Planning - View restock alerts with different urgency levels')
    console.log('   2. Inventory Ledger - View and export transactions')
    console.log('   3. Receive/Ship Goods - Create new transactions')
    console.log('   4. Cost Calculations - View calculated costs for transactions')
    console.log('   5. Import/Export - Test with the generated templates')

  } catch (error) {
    console.error('❌ Error adding demo data:', error)
    logger.error('Failed to add demo data', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addMinimalDemoData()