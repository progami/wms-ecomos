import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding test data...')

  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@warehouse.com' }
    })

    if (!adminUser) {
      console.error('❌ Admin user not found. Please run the seed script first.')
      return
    }

    // Get warehouses
    const fmc = await prisma.warehouse.findFirst({ where: { code: 'FMC' } })
    const vglobal = await prisma.warehouse.findFirst({ where: { code: 'VGLOBAL' } })

    if (!fmc || !vglobal) {
      console.error('❌ Warehouses not found. Please run the seed script first.')
      return
    }

    // Create test SKUs
    console.log('Creating test SKUs...')
    const sku1 = await prisma.sku.upsert({
      where: { skuCode: 'TEST-001' },
      update: {},
      create: {
        skuCode: 'TEST-001',
        asin: 'B08ABC123',
        description: 'Test Product 1 - Widget A',
        packSize: 1,
        material: 'Plastic',
        unitDimensionsCm: '10x10x10',
        unitWeightKg: 0.5,
        unitsPerCarton: 12,
        cartonDimensionsCm: '40x30x30',
        cartonWeightKg: 6.5,
        packagingType: 'Box',
        isActive: true
      }
    })

    const sku2 = await prisma.sku.upsert({
      where: { skuCode: 'TEST-002' },
      update: {},
      create: {
        skuCode: 'TEST-002',
        asin: 'B08DEF456',
        description: 'Test Product 2 - Widget B',
        packSize: 2,
        material: 'Metal',
        unitDimensionsCm: '15x15x15',
        unitWeightKg: 1.0,
        unitsPerCarton: 6,
        cartonDimensionsCm: '45x35x35',
        cartonWeightKg: 7.0,
        packagingType: 'Box',
        isActive: true
      }
    })

    console.log('✅ Created test SKUs')

    // Create warehouse SKU configurations
    console.log('Creating warehouse SKU configurations...')
    await prisma.warehouseSkuConfig.create({
      data: {
        warehouseId: fmc.id,
        skuId: sku1.id,
        storageCartonsPerPallet: 48,
        shippingCartonsPerPallet: 48,
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUser.id
      }
    }).catch(() => console.log('Config already exists'))

    await prisma.warehouseSkuConfig.create({
      data: {
        warehouseId: vglobal.id,
        skuId: sku2.id,
        storageCartonsPerPallet: 36,
        shippingCartonsPerPallet: 36,
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUser.id
      }
    }).catch(() => console.log('Config already exists'))

    console.log('✅ Created warehouse SKU configurations')

    // Create inventory transactions
    console.log('Creating inventory transactions...')
    
    // Transaction 1: Receive 100 cartons of TEST-001 at FMC
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TXN-${Date.now()}-001`,
        transactionType: TransactionType.RECEIVE,
        warehouseId: fmc.id,
        skuId: sku1.id,
        batchLot: 'BATCH001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 2,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 48,
        referenceId: 'PO-2024-001',
        shipName: 'OOCL VESSEL',
        trackingNumber: 'CONT123456',
        modeOfTransportation: 'Sea',
        transactionDate: new Date('2024-01-15'),
        pickupDate: new Date('2024-01-10'),
        isReconciled: true,
        createdById: adminUser.id
      }
    })

    // Transaction 2: Ship 20 cartons of TEST-001 from FMC
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TXN-${Date.now()}-002`,
        transactionType: TransactionType.SHIP,
        warehouseId: fmc.id,
        skuId: sku1.id,
        batchLot: 'BATCH001',
        cartonsIn: 0,
        cartonsOut: 20,
        storagePalletsIn: 0,
        shippingPalletsOut: 1,
        shippingCartonsPerPallet: 48,
        referenceId: 'SO-2024-001',
        trackingNumber: 'TRK789012',
        modeOfTransportation: 'Road',
        transactionDate: new Date('2024-01-20'),
        pickupDate: new Date('2024-01-20'),
        isReconciled: true,
        createdById: adminUser.id
      }
    })

    // Transaction 3: Receive 50 cartons of TEST-002 at VGlobal
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TXN-${Date.now()}-003`,
        transactionType: TransactionType.RECEIVE,
        warehouseId: vglobal.id,
        skuId: sku2.id,
        batchLot: 'BATCH002',
        cartonsIn: 50,
        cartonsOut: 0,
        storagePalletsIn: 2,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 36,
        referenceId: 'PO-2024-002',
        shipName: 'MSC SHIP',
        trackingNumber: 'CONT234567',
        modeOfTransportation: 'Sea',
        transactionDate: new Date('2024-02-01'),
        pickupDate: new Date('2024-01-25'),
        isReconciled: true,
        createdById: adminUser.id
      }
    })

    // Transaction 4: Ship 10 cartons of TEST-002 from VGlobal (incomplete - missing tracking)
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TXN-${Date.now()}-004`,
        transactionType: TransactionType.SHIP,
        warehouseId: vglobal.id,
        skuId: sku2.id,
        batchLot: 'BATCH002',
        cartonsIn: 0,
        cartonsOut: 10,
        storagePalletsIn: 0,
        shippingPalletsOut: 1,
        shippingCartonsPerPallet: 36,
        referenceId: 'SO-2024-002',
        // Missing tracking number to show incomplete transaction
        transactionDate: new Date('2024-02-10'),
        pickupDate: new Date('2024-02-10'),
        isReconciled: false,
        createdById: adminUser.id
      }
    })

    console.log('✅ Created inventory transactions')
    console.log('\n✅ Test data added successfully!')
    console.log('📝 Summary:')
    console.log('   - 2 Test SKUs created')
    console.log('   - 4 Inventory transactions created')
    console.log('   - Current stock: TEST-001 @ FMC: 80 cartons, TEST-002 @ VGlobal: 40 cartons')
    
  } catch (error) {
    console.error('❌ Error adding test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()