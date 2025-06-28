import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDashboardStats() {
  try {
    // Count inventory balances with positive cartons (excluding Amazon)
    const inventoryCount = await prisma.inventoryBalance.count({
      where: {
        currentCartons: { gt: 0 },
        warehouse: {
          NOT: {
            OR: [
              { code: 'AMZN' },
              { code: 'AMZN-UK' }
            ]
          }
        }
      }
    })

    // Count unique SKUs with positive inventory (excluding Amazon)
    const uniqueSkus = await prisma.inventoryBalance.findMany({
      where: {
        currentCartons: { gt: 0 },
        warehouse: {
          NOT: {
            OR: [
              { code: 'AMZN' },
              { code: 'AMZN-UK' }
            ]
          }
        }
      },
      select: { skuId: true },
      distinct: ['skuId']
    })

    // Sum total cartons (excluding Amazon)
    const totalCartons = await prisma.inventoryBalance.aggregate({
      where: {
        warehouse: {
          NOT: {
            OR: [
              { code: 'AMZN' },
              { code: 'AMZN-UK' }
            ]
          }
        }
      },
      _sum: {
        currentCartons: true
      }
    })

    // Count pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        status: 'pending'
      }
    })

    // Get all SKUs count
    const allSkus = await prisma.sku.count()

    // Get transaction count
    const transactionCount = await prisma.inventoryTransaction.count()

    console.log('\n=== Dashboard Statistics Check ===\n')
    console.log(`Inventory Balance Records (with stock): ${inventoryCount}`)
    console.log(`Unique SKUs (with stock): ${uniqueSkus.length}`)
    console.log(`Total SKUs in system: ${allSkus}`)
    console.log(`Total Cartons: ${totalCartons._sum.currentCartons || 0}`)
    console.log(`Pending Invoices: ${pendingInvoices}`)
    console.log(`Total Transactions: ${transactionCount}`)
    
    console.log('\n=== Details ===')
    
    // Show SKUs with their inventory
    const skusWithInventory = await prisma.sku.findMany({
      include: {
        inventoryBalances: {
          where: {
            currentCartons: { gt: 0 },
            warehouse: {
              NOT: {
                OR: [
                  { code: 'AMZN' },
                  { code: 'AMZN-UK' }
                ]
              }
            }
          },
          include: {
            warehouse: true
          }
        }
      },
      orderBy: {
        skuCode: 'asc'
      }
    })

    console.log('\nSKUs with inventory:')
    skusWithInventory.forEach(sku => {
      if (sku.inventoryBalances.length > 0) {
        const totalForSku = sku.inventoryBalances.reduce((sum, bal) => sum + bal.currentCartons, 0)
        console.log(`- ${sku.skuCode}: ${totalForSku} cartons across ${sku.inventoryBalances.length} locations`)
      }
    })

  } catch (error) {
    console.error('Error checking stats:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDashboardStats()