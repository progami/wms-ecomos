import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTestData() {
  try {
    console.log('Cleaning up test data...\n')
    
    // Delete test transactions
    const testTransactions = await prisma.inventoryTransaction.deleteMany({
      where: {
        OR: [
          { transactionId: { startsWith: 'TEST-PIT-' } },
          { batchLot: 'TEST-2025' },
          { notes: { contains: 'Point-in-time test' } }
        ]
      }
    })
    
    console.log(`Deleted ${testTransactions.count} test transactions`)
    
    // Delete test inventory balances
    const testBalances = await prisma.inventoryBalance.deleteMany({
      where: {
        batchLot: 'TEST-2025'
      }
    })
    
    console.log(`Deleted ${testBalances.count} test inventory balances`)
    
    // Recalculate the correct balance for affected SKUs
    console.log('\nRecalculating correct balances...')
    
    // Get all warehouses and SKUs that might have been affected
    const warehouses = await prisma.warehouse.findMany()
    const skus = await prisma.sku.findMany()
    
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        // Get all transactions for this warehouse/SKU combination
        const transactions = await prisma.inventoryTransaction.findMany({
          where: {
            warehouseId: warehouse.id,
            skuId: sku.id
          },
          orderBy: {
            transactionDate: 'asc'
          }
        })
        
        if (transactions.length === 0) continue
        
        // Group by batch/lot
        const batchBalances = new Map<string, number>()
        
        transactions.forEach(tx => {
          const current = batchBalances.get(tx.batchLot) || 0
          batchBalances.set(tx.batchLot, current + tx.cartonsIn - tx.cartonsOut)
        })
        
        // Update or create inventory balances
        for (const [batchLot, cartons] of batchBalances) {
          if (cartons <= 0) continue
          
          const existingBalance = await prisma.inventoryBalance.findUnique({
            where: {
              warehouseId_skuId_batchLot: {
                warehouseId: warehouse.id,
                skuId: sku.id,
                batchLot: batchLot
              }
            }
          })
          
          const lastTransaction = transactions
            .filter(tx => tx.batchLot === batchLot)
            .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())[0]
          
          if (existingBalance) {
            await prisma.inventoryBalance.update({
              where: { id: existingBalance.id },
              data: {
                currentCartons: cartons,
                currentUnits: cartons * (sku.unitsPerCarton || 1),
                lastTransactionDate: lastTransaction.transactionDate
              }
            })
          }
        }
      }
    }
    
    console.log('\nCleanup completed successfully!')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

cleanupTestData()