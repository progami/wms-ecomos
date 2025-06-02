import { chromium } from 'playwright'

async function testAllPages() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const results: any[] = []
  
  // Helper function to test a page
  async function testPage(name: string, url: string, checks: () => Promise<any>) {
    console.log(`\nTesting ${name}...`)
    try {
      await page.goto(`http://localhost:3000${url}`)
      await page.waitForTimeout(2000)
      
      const result = await checks()
      results.push({ page: name, url, status: 'success', ...result })
      console.log(`✅ ${name} - Success`)
    } catch (error: any) {
      results.push({ page: name, url, status: 'error', error: error.message })
      console.log(`❌ ${name} - Error: ${error.message}`)
    }
  }
  
  // Test 1: Login Page
  await testPage('Login Page', '/auth/login', async () => {
    const title = await page.textContent('h1')
    const hasEmailInput = await page.isVisible('input[type="email"]')
    const hasPasswordInput = await page.isVisible('input[type="password"]')
    const hasLoginButton = await page.isVisible('button[type="submit"]')
    
    return {
      title,
      hasEmailInput,
      hasPasswordInput,
      hasLoginButton
    }
  })
  
  // Login as admin
  console.log('\nLogging in as admin...')
  await page.fill('input[type="email"]', 'admin@warehouse.com')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
  
  // Test 2: Main Dashboard
  await testPage('Main Dashboard', '/dashboard', async () => {
    const hasQuickActions = await page.isVisible('text="Quick Actions"')
    const quickActionCount = await page.locator('a[href^="/"]').count()
    
    // Click on first quick action
    if (quickActionCount > 0) {
      await page.locator('a[href^="/"]').first().click()
      await page.waitForTimeout(1000)
      await page.goBack()
    }
    
    return {
      hasQuickActions,
      quickActionCount
    }
  })
  
  // Test 3: Admin Dashboard
  await testPage('Admin Dashboard', '/admin/dashboard', async () => {
    const hasStats = await page.isVisible('text="Total Inventory"')
    const hasCharts = await page.isVisible('text="Inventory Trends"')
    const statsCount = await page.locator('.rounded-lg.border').count()
    
    return {
      hasStats,
      hasCharts,
      statsCount
    }
  })
  
  // Test 4: SKU Management
  await testPage('SKU Management', '/admin/settings/skus', async () => {
    const hasHeader = await page.isVisible('text="SKU Management"')
    const hasSearchBar = await page.isVisible('input[placeholder*="Search"]')
    const hasAddButton = await page.isVisible('text="Add New SKU"')
    const skuCount = await page.locator('tbody tr').count()
    
    // Try search
    if (hasSearchBar) {
      await page.fill('input[placeholder*="Search"]', 'CS')
      await page.waitForTimeout(1000)
    }
    
    return {
      hasHeader,
      hasSearchBar,
      hasAddButton,
      skuCount
    }
  })
  
  // Test 5: Warehouse Management
  await testPage('Warehouse Management', '/admin/settings/warehouses', async () => {
    const hasHeader = await page.isVisible('text="Warehouse Management"')
    const hasAddButton = await page.isVisible('text="Add Warehouse"')
    const warehouseCount = await page.locator('.grid > div').count()
    
    return {
      hasHeader,
      hasAddButton,
      warehouseCount
    }
  })
  
  // Test 6: Finance Dashboard
  await testPage('Finance Dashboard', '/finance/dashboard', async () => {
    const hasRevenue = await page.isVisible('text="Total Revenue"')
    const hasCostBreakdown = await page.isVisible('text="Cost Breakdown"')
    const hasActivity = await page.isVisible('text="Recent Financial Activity"')
    
    return {
      hasRevenue,
      hasCostBreakdown,
      hasActivity
    }
  })
  
  // Test 7: Invoice Management
  await testPage('Invoice Management', '/finance/invoices', async () => {
    const hasHeader = await page.isVisible('text="Invoice Management"')
    const hasUploadButton = await page.isVisible('text="Upload Invoice"')
    const hasNewButton = await page.isVisible('text="New Invoice"')
    const invoiceCount = await page.locator('tbody tr').count()
    
    return {
      hasHeader,
      hasUploadButton,
      hasNewButton,
      invoiceCount
    }
  })
  
  // Test 8: Warehouse Inventory
  await testPage('Warehouse Inventory', '/warehouse/inventory', async () => {
    const hasHeader = await page.isVisible('text="Inventory Management"')
    const hasSearchBar = await page.isVisible('input[placeholder*="Search"]')
    const hasExportButton = await page.isVisible('text="Export"')
    const inventoryCount = await page.locator('tbody tr').count()
    
    return {
      hasHeader,
      hasSearchBar,
      hasExportButton,
      inventoryCount
    }
  })
  
  // Test 9: Receive Shipments
  await testPage('Receive Shipments', '/warehouse/receive', async () => {
    const hasHeader = await page.isVisible('text="Receive Shipments"')
    const hasWarehouseSelect = await page.isVisible('select#warehouse')
    const hasSkuSelect = await page.isVisible('select#sku')
    const hasSubmitButton = await page.isVisible('button[type="submit"]')
    
    return {
      hasHeader,
      hasWarehouseSelect,
      hasSkuSelect,
      hasSubmitButton
    }
  })
  
  // Test 10: Ship Orders
  await testPage('Ship Orders', '/warehouse/ship', async () => {
    const hasHeader = await page.isVisible('text="Ship Orders"')
    const hasWarehouseSelect = await page.isVisible('select#warehouse')
    const hasItemsSection = await page.isVisible('text="Shipment Items"')
    
    return {
      hasHeader,
      hasWarehouseSelect,
      hasItemsSection
    }
  })
  
  // Test 11: Reports
  await testPage('Reports', '/admin/reports', async () => {
    const hasHeader = await page.isVisible('text="Reports"')
    const reportTypes = await page.locator('button').count()
    
    return {
      hasHeader,
      reportTypes
    }
  })
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('TEST SUMMARY')
  console.log('='.repeat(50))
  
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  console.log(`Total Pages Tested: ${results.length}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  
  console.log('\nDetailed Results:')
  results.forEach(result => {
    if (result.status === 'error') {
      console.log(`\n❌ ${result.page}:`)
      console.log(`   Error: ${result.error}`)
    } else {
      console.log(`\n✅ ${result.page}:`)
      Object.entries(result).forEach(([key, value]) => {
        if (key !== 'page' && key !== 'url' && key !== 'status') {
          console.log(`   ${key}: ${value}`)
        }
      })
    }
  })
  
  await browser.close()
}

testAllPages().catch(console.error)