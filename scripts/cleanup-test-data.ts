#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🧹 Starting cleanup of test/dummy data...\n')
  
  try {
    // Start a transaction to ensure atomic cleanup
    await prisma.$transaction(async (tx) => {
      // 1. Delete all audit logs
      console.log('📝 Cleaning audit logs...')
      const auditLogs = await tx.auditLog.deleteMany()
      console.log(`   ✓ Deleted ${auditLogs.count} audit logs`)

      // 2. Delete all inventory transactions
      console.log('\n📦 Cleaning inventory transactions...')
      const inventoryTransactions = await tx.inventoryTransaction.deleteMany()
      console.log(`   ✓ Deleted ${inventoryTransactions.count} inventory transactions`)

      // 3. Delete all inventory balances
      console.log('\n📊 Cleaning inventory balances...')
      const inventoryBalances = await tx.inventoryBalance.deleteMany()
      console.log(`   ✓ Deleted ${inventoryBalances.count} inventory balances`)

      // 4. Delete all storage ledger entries
      console.log('\n🗄️ Cleaning storage ledger...')
      const storageLedger = await tx.storageLedger.deleteMany()
      console.log(`   ✓ Deleted ${storageLedger.count} storage ledger entries`)

      // 5. Delete all calculated costs
      console.log('\n💵 Cleaning calculated costs...')
      const calculatedCosts = await tx.calculatedCost.deleteMany()
      console.log(`   ✓ Deleted ${calculatedCosts.count} calculated costs`)

      // 6. Delete all reconciliation details
      console.log('\n🔍 Cleaning reconciliation details...')
      const reconciliationDetails = await tx.reconciliationDetail.deleteMany()
      console.log(`   ✓ Deleted ${reconciliationDetails.count} reconciliation details`)

      // 7. Delete all invoice reconciliations
      console.log('\n📃 Cleaning invoice reconciliations...')
      const invoiceReconciliations = await tx.invoiceReconciliation.deleteMany()
      console.log(`   ✓ Deleted ${invoiceReconciliations.count} invoice reconciliations`)

      // 8. Delete all invoice line items
      console.log('\n📋 Cleaning invoice line items...')
      const invoiceLineItems = await tx.invoiceLineItem.deleteMany()
      console.log(`   ✓ Deleted ${invoiceLineItems.count} invoice line items`)

      // 9. Delete all invoice audit logs
      console.log('\n📜 Cleaning invoice audit logs...')
      const invoiceAuditLogs = await tx.invoiceAuditLog.deleteMany()
      console.log(`   ✓ Deleted ${invoiceAuditLogs.count} invoice audit logs`)

      // 10. Delete all dispute resolutions
      console.log('\n⚠️ Cleaning dispute resolutions...')
      const disputeResolutions = await tx.disputeResolution.deleteMany()
      console.log(`   ✓ Deleted ${disputeResolutions.count} dispute resolutions`)

      // 11. Delete all invoice disputes
      console.log('\n🚨 Cleaning invoice disputes...')
      const invoiceDisputes = await tx.invoiceDispute.deleteMany()
      console.log(`   ✓ Deleted ${invoiceDisputes.count} invoice disputes`)

      // 12. Delete all payments
      console.log('\n💳 Cleaning payments...')
      const payments = await tx.payment.deleteMany()
      console.log(`   ✓ Deleted ${payments.count} payments`)

      // 13. Delete all warehouse notifications
      console.log('\n🔔 Cleaning warehouse notifications...')
      const warehouseNotifications = await tx.warehouseNotification.deleteMany()
      console.log(`   ✓ Deleted ${warehouseNotifications.count} warehouse notifications`)

      // 14. Delete all invoices
      console.log('\n🧾 Cleaning invoices...')
      const invoices = await tx.invoice.deleteMany()
      console.log(`   ✓ Deleted ${invoices.count} invoices`)

      // 15. Delete all cost rates
      console.log('\n💲 Cleaning cost rates...')
      const costRates = await tx.costRate.deleteMany()
      console.log(`   ✓ Deleted ${costRates.count} cost rates`)

      // 16. Delete all warehouse SKU configurations
      console.log('\n⚙️ Cleaning warehouse SKU configurations...')
      const warehouseSkuConfigs = await tx.warehouseSkuConfig.deleteMany()
      console.log(`   ✓ Deleted ${warehouseSkuConfigs.count} warehouse SKU configurations`)

      // 17. Delete all SKU versions
      console.log('\n📦 Cleaning SKU versions...')
      const skuVersions = await tx.skuVersion.deleteMany()
      console.log(`   ✓ Deleted ${skuVersions.count} SKU versions`)

      // 18. Delete all SKUs
      console.log('\n🏷️ Cleaning SKUs...')
      const skus = await tx.sku.deleteMany()
      console.log(`   ✓ Deleted ${skus.count} SKUs`)

      // 19. Delete all demo users (keep admin)
      console.log('\n👥 Cleaning demo users...')
      const demoUsers = await tx.user.deleteMany({
        where: {
          OR: [
            { isDemo: true },
            { email: { contains: 'demo' } }
          ]
        }
      })
      console.log(`   ✓ Deleted ${demoUsers.count} demo users`)

      // 20. Delete test warehouses (keep essential ones)
      console.log('\n🏭 Cleaning test warehouses...')
      const testWarehouses = await tx.warehouse.deleteMany({
        where: {
          OR: [
            { code: { in: ['LON-01', 'MAN-01', 'EDI-01', 'BHM-01', 'GLA-01'] } }, // Demo warehouses
            { name: { contains: 'Test' } },
            { name: { contains: 'Demo' } }
          ]
        }
      })
      console.log(`   ✓ Deleted ${testWarehouses.count} test warehouses`)

      // 21. Delete settings
      console.log('\n⚙️ Cleaning settings...')
      const settings = await tx.settings.deleteMany()
      console.log(`   ✓ Deleted ${settings.count} settings`)

      // 22. Reset inventory audit log
      console.log('\n🔍 Cleaning inventory audit log...')
      const inventoryAuditLog = await tx.inventory_audit_log.deleteMany()
      console.log(`   ✓ Deleted ${inventoryAuditLog.count} inventory audit logs`)
    })

    console.log('\n✅ Cleanup completed successfully!')
    
    // Show remaining data
    console.log('\n📊 Remaining data in database:')
    const remainingUsers = await prisma.user.count()
    const remainingWarehouses = await prisma.warehouse.count()
    const remainingSkus = await prisma.sku.count()
    
    console.log(`   - Users: ${remainingUsers}`)
    console.log(`   - Warehouses: ${remainingWarehouses}`)
    console.log(`   - SKUs: ${remainingSkus}`)
    
    console.log('\n💡 To recreate minimal data, run:')
    console.log('   npm run db:seed')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupTestData()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })