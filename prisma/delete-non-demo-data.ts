import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteNonDemoData() {
  console.log('Starting deletion of non-demo data...')
  
  try {
    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // First, find all non-demo users
      const nonDemoUsers = await tx.user.findMany({
        where: { isDemo: false },
        select: { id: true, username: true }
      })
      
      console.log(`Found ${nonDemoUsers.length} non-demo users to delete`)
      
      // Delete related data for non-demo users
      for (const user of nonDemoUsers) {
        console.log(`Deleting data for user: ${user.username}`)
        
        // Delete inventory transactions created by this user
        await tx.inventoryTransaction.deleteMany({
          where: { createdById: user.id }
        })
        
        // Delete calculated costs created by this user
        await tx.calculatedCost.deleteMany({
          where: { createdById: user.id }
        })
        
        // Delete invoices created by this user
        await tx.invoice.deleteMany({
          where: { createdById: user.id }
        })
      }
      
      // Delete all non-demo warehouses and their related data
      // Keep only demo warehouses (e.g., LON-01, MAN-01)
      const nonDemoWarehouses = await tx.warehouse.findMany({
        where: { 
          NOT: {
            OR: [
              { code: 'LON-01' },
              { code: 'MAN-01' }
            ]
          }
        },
        select: { id: true, code: true }
      })
      
      console.log(`Found ${nonDemoWarehouses.length} non-demo warehouses to delete`)
      
      for (const warehouse of nonDemoWarehouses) {
        console.log(`Deleting data for warehouse: ${warehouse.code}`)
        
        // Delete inventory balances
        await tx.inventoryBalance.deleteMany({
          where: { warehouseId: warehouse.id }
        })
        
        // Delete inventory transactions
        await tx.inventoryTransaction.deleteMany({
          where: { warehouseId: warehouse.id }
        })
        
        // Delete warehouse SKU configurations
        await tx.warehouseSkuConfig.deleteMany({
          where: { warehouseId: warehouse.id }
        })
        
        // Delete calculated costs
        await tx.calculatedCost.deleteMany({
          where: { warehouseId: warehouse.id }
        })
        
        // Delete invoices
        await tx.invoice.deleteMany({
          where: { warehouseId: warehouse.id }
        })
      }
      
      // Delete non-demo warehouses
      await tx.warehouse.deleteMany({
        where: { 
          NOT: {
            OR: [
              { code: 'LON-01' },
              { code: 'MAN-01' }
            ]
          }
        }
      })
      
      // Delete non-demo SKUs and their related data
      // Keep only demo SKUs (e.g., those starting with DEMO-)
      const nonDemoSkus = await tx.sku.findMany({
        where: { 
          NOT: {
            skuCode: {
              startsWith: 'DEMO-'
            }
          }
        },
        select: { id: true, skuCode: true }
      })
      
      console.log(`Found ${nonDemoSkus.length} non-demo SKUs to delete`)
      
      for (const sku of nonDemoSkus) {
        console.log(`Deleting data for SKU: ${sku.skuCode}`)
        
        // Delete inventory balances
        await tx.inventoryBalance.deleteMany({
          where: { skuId: sku.id }
        })
        
        // Delete inventory transactions
        await tx.inventoryTransaction.deleteMany({
          where: { skuId: sku.id }
        })
        
        // Delete warehouse SKU configurations
        await tx.warehouseSkuConfig.deleteMany({
          where: { skuId: sku.id }
        })
        
        // Delete calculated costs
        await tx.calculatedCost.deleteMany({
          where: { skuId: sku.id }
        })
      }
      
      // Delete non-demo SKUs
      await tx.sku.deleteMany({
        where: { 
          NOT: {
            skuCode: {
              startsWith: 'DEMO-'
            }
          }
        }
      })
      
      // Finally, delete non-demo users
      await tx.user.deleteMany({
        where: { isDemo: false }
      })
      
      console.log('Successfully deleted all non-demo data')
    })
    
    // Log summary of remaining data
    const remainingUsers = await prisma.user.count()
    const remainingWarehouses = await prisma.warehouse.count()
    const remainingSkus = await prisma.sku.count()
    const remainingTransactions = await prisma.inventoryTransaction.count()
    
    console.log('\nRemaining data summary:')
    console.log(`- Users: ${remainingUsers}`)
    console.log(`- Warehouses: ${remainingWarehouses}`)
    console.log(`- SKUs: ${remainingSkus}`)
    console.log(`- Transactions: ${remainingTransactions}`)
    
  } catch (error) {
    console.error('Error deleting non-demo data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
deleteNonDemoData()