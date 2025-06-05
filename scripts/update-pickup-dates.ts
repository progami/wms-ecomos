import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating pickup dates for existing transactions...')
  
  try {
    // Get all transactions with null pickup dates
    const transactionsToUpdate = await prisma.inventoryTransaction.findMany({
      where: {
        pickupDate: null
      },
      select: {
        id: true,
        transactionDate: true
      }
    })
    
    console.log(`Found ${transactionsToUpdate.length} transactions to update`)
    
    // Update each transaction individually
    for (const transaction of transactionsToUpdate) {
      await prisma.inventoryTransaction.update({
        where: { id: transaction.id },
        data: { pickupDate: transaction.transactionDate }
      })
    }
    
    console.log('✅ Successfully updated pickup dates for all transactions')
    
    // Verify the update
    const nullPickupCount = await prisma.inventoryTransaction.count({
      where: { pickupDate: null }
    })
    
    console.log(`Transactions with null pickup dates after update: ${nullPickupCount}`)
    
  } catch (error) {
    console.error('Error updating pickup dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()