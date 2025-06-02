import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPages() {
  console.log('=== TESTING ALL PAGES AND FUNCTIONALITY ===\n')
  
  const results: any = {
    database: {},
    apis: {},
    issues: []
  }
  
  // 1. Test Database Content
  console.log('1. DATABASE CONTENT CHECK:')
  try {
    const users = await prisma.user.count()
    const warehouses = await prisma.warehouse.count()
    const skus = await prisma.sku.count()
    const transactions = await prisma.inventoryTransaction.count()
    const balances = await prisma.inventoryBalance.count()
    const invoices = await prisma.invoice.count()
    const costRates = await prisma.costRate.count()
    
    results.database = {
      users,
      warehouses,
      skus,
      transactions,
      balances,
      invoices,
      costRates
    }
    
    console.log(`   ✅ Users: ${users}`)
    console.log(`   ✅ Warehouses: ${warehouses}`)
    console.log(`   ✅ SKUs: ${skus}`)
    console.log(`   ✅ Transactions: ${transactions}`)
    console.log(`   ✅ Inventory Balances: ${balances}`)
    console.log(`   ✅ Invoices: ${invoices}`)
    console.log(`   ✅ Cost Rates: ${costRates}`)
    
    if (users === 0) results.issues.push('No users in database - login will fail')
    if (warehouses === 0) results.issues.push('No warehouses - warehouse operations will fail')
    if (skus === 0) results.issues.push('No SKUs - inventory management will be empty')
    
  } catch (error) {
    console.log('   ❌ Database Error:', error)
    results.issues.push('Database connection failed')
  }
  
  // 2. Test Specific Queries
  console.log('\n2. TESTING SPECIFIC QUERIES:')
  
  // Test admin user exists
  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@warehouse.com' }
    })
    if (adminUser) {
      console.log(`   ✅ Admin user exists: ${adminUser.fullName}`)
    } else {
      console.log('   ❌ Admin user not found')
      results.issues.push('Admin user missing - cannot login as admin')
    }
  } catch (error) {
    console.log('   ❌ Error checking admin user:', error)
  }
  
  // Test warehouse with inventory
  try {
    const warehouseWithInventory = await prisma.warehouse.findFirst({
      include: {
        inventoryBalances: {
          take: 1
        }
      }
    })
    if (warehouseWithInventory?.inventoryBalances.length > 0) {
      console.log(`   ✅ Warehouse with inventory: ${warehouseWithInventory.name}`)
    } else {
      console.log('   ⚠️  No warehouses have inventory')
      results.issues.push('No inventory data - inventory pages will be empty')
    }
  } catch (error) {
    console.log('   ❌ Error checking inventory:', error)
  }
  
  // Test SKU with details
  try {
    const skuDetails = await prisma.sku.findFirst({
      include: {
        _count: {
          select: {
            inventoryBalances: true,
            warehouseConfigs: true
          }
        }
      }
    })
    if (skuDetails) {
      console.log(`   ✅ SKU with details: ${skuDetails.skuCode} - ${skuDetails.description}`)
      console.log(`      - Inventory locations: ${skuDetails._count.inventoryBalances}`)
      console.log(`      - Warehouse configs: ${skuDetails._count.warehouseConfigs}`)
    } else {
      console.log('   ❌ No SKUs found')
    }
  } catch (error) {
    console.log('   ❌ Error checking SKUs:', error)
  }
  
  // 3. Test API Endpoints
  console.log('\n3. API ENDPOINT TESTS:')
  
  const apiTests = [
    { name: 'Health Check', url: 'http://localhost:3000/api/health' },
    { name: 'SKUs List', url: 'http://localhost:3000/api/skus' },
    { name: 'SKUs Simple', url: 'http://localhost:3000/api/skus-simple' },
    { name: 'Admin Dashboard', url: 'http://localhost:3000/api/admin/dashboard' },
    { name: 'Finance Dashboard', url: 'http://localhost:3000/api/finance/dashboard' },
    { name: 'Warehouses', url: 'http://localhost:3000/api/warehouses' },
    { name: 'Transactions', url: 'http://localhost:3000/api/transactions' },
    { name: 'Invoices', url: 'http://localhost:3000/api/invoices' },
    { name: 'Rates', url: 'http://localhost:3000/api/rates' },
  ]
  
  for (const test of apiTests) {
    try {
      const response = await fetch(test.url)
      const status = response.status
      results.apis[test.name] = status
      
      if (status === 200) {
        console.log(`   ✅ ${test.name}: OK (${status})`)
      } else if (status === 401) {
        console.log(`   ⚠️  ${test.name}: Requires authentication (${status})`)
      } else {
        console.log(`   ❌ ${test.name}: Error (${status})`)
        results.issues.push(`${test.name} API returned error ${status}`)
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: Failed to connect`)
      results.issues.push(`${test.name} API is not responding`)
    }
  }
  
  // 4. Summary
  console.log('\n4. SUMMARY:')
  console.log('='.repeat(50))
  
  if (results.issues.length === 0) {
    console.log('✅ All tests passed! The application should work correctly.')
  } else {
    console.log(`⚠️  Found ${results.issues.length} issues:\n`)
    results.issues.forEach((issue: string, index: number) => {
      console.log(`   ${index + 1}. ${issue}`)
    })
  }
  
  // 5. Recommendations
  console.log('\n5. TESTING RECOMMENDATIONS:')
  console.log('   - Login with: admin@warehouse.com / admin123')
  console.log('   - Check SKU Management page for product list')
  console.log('   - Check Warehouse Inventory for current stock')
  console.log('   - Try Receive Shipments to add inventory')
  console.log('   - Finance Dashboard should show cost breakdowns')
  
  await prisma.$disconnect()
}

testPages().catch(console.error)