import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillUnitsPerCarton() {
  console.log('Starting backfill of units_per_carton for existing transactions...')
  
  try {
    // Get all transactions that don't have units_per_carton set
    const transactionsToUpdate = await prisma.inventoryTransaction.findMany({
      where: {
        unitsPerCarton: null
      },
      include: {
        sku: true
      }
    })
    
    console.log(`Found ${transactionsToUpdate.length} transactions to backfill`)
    
    let updated = 0
    let errors = 0
    
    // Update in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < transactionsToUpdate.length; i += batchSize) {
      const batch = transactionsToUpdate.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (transaction) => {
          try {
            await prisma.inventoryTransaction.update({
              where: { id: transaction.id },
              data: {
                unitsPerCarton: transaction.sku.unitsPerCarton
              }
            })
            updated++
          } catch (error) {
            console.error(`Failed to update transaction ${transaction.transactionId}:`, error)
            errors++
          }
        })
      )
      
      console.log(`Progress: ${Math.min(i + batchSize, transactionsToUpdate.length)}/${transactionsToUpdate.length}`)
    }
    
    console.log(`\nBackfill completed:`)
    console.log(`- Updated: ${updated} transactions`)
    console.log(`- Errors: ${errors} transactions`)
    
    // Verify the update
    const stillMissing = await prisma.inventoryTransaction.count({
      where: {
        unitsPerCarton: null
      }
    })
    
    if (stillMissing > 0) {
      console.warn(`\n⚠️  Warning: ${stillMissing} transactions still missing units_per_carton`)
    } else {
      console.log(`\n✅ All transactions now have units_per_carton set`)
    }
    
  } catch (error) {
    console.error('Failed to backfill units_per_carton:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillUnitsPerCarton().then(() => {
  console.log('\nBackfill script completed')
}).catch((error) => {
  console.error('Backfill script failed:', error)
  process.exit(1)
})