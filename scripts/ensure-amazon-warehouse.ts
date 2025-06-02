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
      const amazonTransactions = await prisma.inventoryTransaction.count({
        where: {
          warehouseId: existingWarehouse.id
        }
      })

      if (amazonTransactions === 0) {
        // Create a sample Amazon inventory transaction
        const adminUser = await prisma.user.findFirst({
          where: { role: 'admin' }
        })
        
        if (adminUser) {
          await prisma.inventoryTransaction.create({
            data: {
              transactionId: `AMZN-${Date.now()}`,
              transactionType: 'RECEIVE',
              transactionDate: new Date(),
              skuId: sampleSku.id,
              warehouseId: existingWarehouse.id,
              batchLot: 'AMZN-001',
              cartonsIn: 10,
              cartonsOut: 0,
              storagePalletsIn: 1,
              shippingPalletsOut: 0,
              notes: 'Sample Amazon FBA inventory',
              createdById: adminUser.id
            }
          })
        }
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