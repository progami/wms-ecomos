import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPointInTime() {
  try {
    console.log('Creating historical transactions for point-in-time testing...\n')
    
    // Get a warehouse and SKU
    const warehouse = await prisma.warehouse.findFirst({
      where: { code: 'VGLOBAL' }
    })
    
    const sku = await prisma.sku.findFirst({
      where: { skuCode: 'CS 008' }
    })
    
    if (!warehouse || !sku) {
      console.error('Required warehouse or SKU not found')
      return
    }
    
    // Get system user
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@warehouse.com' }
    })
    
    if (!systemUser) {
      console.error('System user not found')
      return
    }
    
    console.log(`Using warehouse: ${warehouse.name} and SKU: ${sku.skuCode}\n`)
    
    // Create transactions at different dates
    const dates = [
      new Date('2025-01-01'), // 100 cartons in
      new Date('2025-01-15'), // 20 cartons out
      new Date('2025-02-01'), // 50 cartons in
      new Date('2025-02-15'), // 30 cartons out
      new Date('2025-03-01'), // 40 cartons in
      new Date('2025-03-15'), // 10 cartons out
    ]
    
    console.log('Creating transactions:')
    
    // Transaction 1: Receive 100 cartons on Jan 1
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-1`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'RECEIVE',
        referenceId: 'PO-TEST-001',
        cartonsIn: 100,
        cartonsOut: 0,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[0],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Initial receive'
      }
    })
    console.log('- Jan 1: Received 100 cartons (Balance: 100)')
    
    // Transaction 2: Ship 20 cartons on Jan 15
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-2`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'SHIP',
        referenceId: 'SO-TEST-001',
        cartonsIn: 0,
        cartonsOut: 20,
        storagePalletsIn: 0,
        shippingPalletsOut: 2,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[1],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Shipment'
      }
    })
    console.log('- Jan 15: Shipped 20 cartons (Balance: 80)')
    
    // Transaction 3: Receive 50 cartons on Feb 1
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-3`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'RECEIVE',
        referenceId: 'PO-TEST-002',
        cartonsIn: 50,
        cartonsOut: 0,
        storagePalletsIn: 5,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[2],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Second receive'
      }
    })
    console.log('- Feb 1: Received 50 cartons (Balance: 130)')
    
    // Transaction 4: Ship 30 cartons on Feb 15
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-4`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'SHIP',
        referenceId: 'SO-TEST-002',
        cartonsIn: 0,
        cartonsOut: 30,
        storagePalletsIn: 0,
        shippingPalletsOut: 3,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[3],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Second shipment'
      }
    })
    console.log('- Feb 15: Shipped 30 cartons (Balance: 100)')
    
    // Transaction 5: Receive 40 cartons on Mar 1
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-5`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'RECEIVE',
        referenceId: 'PO-TEST-003',
        cartonsIn: 40,
        cartonsOut: 0,
        storagePalletsIn: 4,
        shippingPalletsOut: 0,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[4],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Third receive'
      }
    })
    console.log('- Mar 1: Received 40 cartons (Balance: 140)')
    
    // Transaction 6: Ship 10 cartons on Mar 15
    await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TEST-PIT-6`,
        warehouseId: warehouse.id,
        skuId: sku.id,
        batchLot: 'TEST-2025',
        transactionType: 'SHIP',
        referenceId: 'SO-TEST-003',
        cartonsIn: 0,
        cartonsOut: 10,
        storagePalletsIn: 0,
        shippingPalletsOut: 1,
        storageCartonsPerPallet: 10,
        shippingCartonsPerPallet: 10,
        transactionDate: dates[5],
        createdById: systemUser.id,
        notes: 'Point-in-time test: Third shipment'
      }
    })
    console.log('- Mar 15: Shipped 10 cartons (Balance: 130)')
    
    console.log('\nPoint-in-time test data created!')
    console.log('\nExpected balances when selecting different dates:')
    console.log('- Before Jan 1: 0 cartons')
    console.log('- Jan 10: 100 cartons')
    console.log('- Jan 20: 80 cartons')
    console.log('- Feb 10: 130 cartons')
    console.log('- Feb 20: 100 cartons')
    console.log('- Mar 10: 140 cartons')
    console.log('- Current: 130 cartons')
    
    // Update the inventory balance
    const existingBalance = await prisma.inventoryBalance.findUnique({
      where: {
        warehouseId_skuId_batchLot: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'TEST-2025'
        }
      }
    })
    
    if (existingBalance) {
      await prisma.inventoryBalance.update({
        where: { id: existingBalance.id },
        data: {
          currentCartons: 130,
          currentPallets: 13,
          currentUnits: 130 * (sku.unitsPerCarton || 1),
          lastTransactionDate: dates[5],
          storageCartonsPerPallet: 10,
          shippingCartonsPerPallet: 10
        }
      })
    } else {
      await prisma.inventoryBalance.create({
        data: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          batchLot: 'TEST-2025',
          currentCartons: 130,
          currentPallets: 13,
          currentUnits: 130 * (sku.unitsPerCarton || 1),
          lastTransactionDate: dates[5],
          storageCartonsPerPallet: 10,
          shippingCartonsPerPallet: 10
        }
      })
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

testPointInTime()