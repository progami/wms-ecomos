import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function adjustTestBatch() {
  try {
    console.log('Creating adjustment transactions to zero out TEST-2025 batch...\n')
    
    // Get system user
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@warehouse.com' }
    })
    
    if (!systemUser) {
      console.error('System user not found')
      return
    }
    
    // Find all inventory balances with TEST-2025 batch
    const testBalances = await prisma.inventoryBalance.findMany({
      where: {
        batchLot: 'TEST-2025'
      },
      include: {
        warehouse: true,
        sku: true
      }
    })
    
    console.log(`Found ${testBalances.length} inventory balances with TEST-2025 batch\n`)
    
    for (const balance of testBalances) {
      if (balance.currentCartons > 0) {
        console.log(`Creating adjustment for ${balance.sku.skuCode} in ${balance.warehouse.name}:`)
        console.log(`  Current balance: ${balance.currentCartons} cartons`)
        
        // Create ADJUST_OUT transaction to zero the balance
        const adjustmentId = `ADJ-OUT-${Date.now()}-${balance.sku.skuCode}`
        
        await prisma.inventoryTransaction.create({
          data: {
            transactionId: adjustmentId,
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            transactionType: 'ADJUST_OUT',
            referenceId: 'CLEANUP-TEST-DATA',
            cartonsIn: 0,
            cartonsOut: balance.currentCartons,
            storagePalletsIn: 0,
            shippingPalletsOut: balance.currentPallets,
            storageCartonsPerPallet: balance.storageCartonsPerPallet,
            shippingCartonsPerPallet: balance.shippingCartonsPerPallet,
            transactionDate: new Date(),
            createdById: systemUser.id,
            notes: 'Adjustment to remove TEST-2025 test data from inventory'
          }
        })
        
        // Update the inventory balance to zero
        await prisma.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            currentCartons: 0,
            currentPallets: 0,
            currentUnits: 0,
            lastTransactionDate: new Date()
          }
        })
        
        console.log(`  Created adjustment: ${adjustmentId}`)
        console.log(`  New balance: 0 cartons\n`)
      }
    }
    
    console.log('Adjustment transactions created successfully!')
    console.log('The TEST-2025 transactions remain in the ledger for audit purposes,')
    console.log('but the inventory balances have been adjusted to zero.')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

adjustTestBatch()