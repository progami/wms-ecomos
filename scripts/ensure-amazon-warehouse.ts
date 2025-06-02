import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureAmazonWarehouse() {
  try {
    // Check if Amazon FBA UK warehouse exists
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        name: 'Amazon FBA UK'
      }
    })

    if (!existingWarehouse) {
      // Create Amazon FBA UK warehouse
      const amazonWarehouse = await prisma.warehouse.create({
        data: {
          name: 'Amazon FBA UK',
          code: 'AMZN-UK',
          address: 'Amazon Fulfillment Centers, Various Locations, UK',
          contactEmail: 'fba-support@amazon.co.uk',
          isActive: true
        }
      })
      console.log('Created Amazon FBA UK warehouse:', amazonWarehouse)
    } else {
      console.log('Amazon FBA UK warehouse already exists')
    }

    // Also create some sample Amazon inventory transactions if needed
    const sampleSku = await prisma.sku.findFirst()
    if (sampleSku && existingWarehouse) {
      const amazonTransactions = await prisma.transaction.count({
        where: {
          warehouseId: existingWarehouse.id
        }
      })

      if (amazonTransactions === 0) {
        // Create a sample Amazon inventory transaction
        await prisma.transaction.create({
          data: {
            type: 'RECEIVE',
            date: new Date(),
            skuId: sampleSku.id,
            warehouseId: existingWarehouse.id,
            quantity: 100,
            notes: 'Sample Amazon FBA inventory'
          }
        })
        console.log('Created sample Amazon inventory transaction')
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('Error ensuring Amazon warehouse:', error)
    process.exit(1)
  }
}

ensureAmazonWarehouse()