import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Calculating inventory balances from transactions...')

  try {
    // Get all transactions ordered by date
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        warehouse: true,
        sku: true
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    console.log(`Found ${transactions.length} transactions`)

    // Calculate balances
    const balances = new Map<string, any>()
    
    for (const transaction of transactions) {
      const key = `${transaction.warehouseId}-${transaction.skuId}-${transaction.batchLot}`
      
      const current = balances.get(key) || {
        warehouseId: transaction.warehouseId,
        skuId: transaction.skuId,
        batchLot: transaction.batchLot,
        currentCartons: 0,
        currentPallets: 0,
        currentUnits: 0,
        storageCartonsPerPallet: null,
        shippingCartonsPerPallet: null,
        lastTransactionDate: null
      }
      
      // Update cartons
      current.currentCartons += transaction.cartonsIn - transaction.cartonsOut
      current.currentUnits = current.currentCartons * transaction.sku.unitsPerCarton
      current.lastTransactionDate = transaction.transactionDate
      
      // Update pallet configs if provided
      if (transaction.storageCartonsPerPallet) {
        current.storageCartonsPerPallet = transaction.storageCartonsPerPallet
      }
      if (transaction.shippingCartonsPerPallet) {
        current.shippingCartonsPerPallet = transaction.shippingCartonsPerPallet
      }
      
      // Calculate pallets
      if (current.currentCartons > 0 && current.storageCartonsPerPallet) {
        current.currentPallets = Math.ceil(current.currentCartons / current.storageCartonsPerPallet)
      }
      
      balances.set(key, current)
    }

    // Update database
    console.log('Updating inventory balances...')
    let updated = 0
    let created = 0
    
    for (const [key, balance] of balances.entries()) {
      // Only create/update if there's positive stock
      if (balance.currentCartons > 0) {
        await prisma.inventoryBalance.upsert({
          where: {
            warehouseId_skuId_batchLot: {
              warehouseId: balance.warehouseId,
              skuId: balance.skuId,
              batchLot: balance.batchLot
            }
          },
          update: {
            currentCartons: balance.currentCartons,
            currentPallets: balance.currentPallets,
            currentUnits: balance.currentUnits,
            storageCartonsPerPallet: balance.storageCartonsPerPallet,
            shippingCartonsPerPallet: balance.shippingCartonsPerPallet,
            lastTransactionDate: balance.lastTransactionDate,
            lastUpdated: new Date()
          },
          create: {
            warehouseId: balance.warehouseId,
            skuId: balance.skuId,
            batchLot: balance.batchLot,
            currentCartons: balance.currentCartons,
            currentPallets: balance.currentPallets,
            currentUnits: balance.currentUnits,
            storageCartonsPerPallet: balance.storageCartonsPerPallet,
            shippingCartonsPerPallet: balance.shippingCartonsPerPallet,
            lastTransactionDate: balance.lastTransactionDate
          }
        }).then(() => created++).catch(() => updated++)
      }
    }

    console.log(`✅ Inventory balances calculated!`)
    console.log(`   - Created: ${created} new balances`)
    console.log(`   - Updated: ${updated} existing balances`)
    
    // Show current stock levels
    const currentBalances = await prisma.inventoryBalance.findMany({
      where: { currentCartons: { gt: 0 } },
      include: {
        warehouse: true,
        sku: true
      }
    })
    
    console.log('\n📊 Current Stock Levels:')
    for (const balance of currentBalances) {
      console.log(`   - ${balance.sku.skuCode} @ ${balance.warehouse.name} (${balance.batchLot}): ${balance.currentCartons} cartons`)
    }
    
  } catch (error) {
    console.error('❌ Error calculating balances:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()