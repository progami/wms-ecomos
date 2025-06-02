import { chromium } from 'playwright'

async function testSkuEditNavigation() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log('🔍 Testing SKU Edit Navigation...')

    // Navigate to login page
    await page.goto('http://localhost:3001/auth/login')
    console.log('✅ Loaded login page')

    // Login as admin
    await page.fill('input[name="email"]', 'admin@warehouse.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log('✅ Logged in successfully')

    // Navigate to SKU management page
    await page.goto('http://localhost:3001/admin/settings/skus')
    await page.waitForLoadState('networkidle')
    console.log('✅ Navigated to SKU management page')

    // Check if SKUs are loaded
    const skuRows = await page.locator('tbody tr').count()
    console.log(`✅ Found ${skuRows} SKUs`)

    if (skuRows > 0) {
      // Click the first edit button
      const editButton = page.locator('button[title="Edit SKU"]').first()
      await editButton.waitFor({ state: 'visible' })
      
      // Get the current URL before clicking
      const beforeUrl = page.url()
      console.log('📍 Current URL:', beforeUrl)
      
      // Click the edit button
      await editButton.click()
      
      // Wait for navigation to edit page
      await page.waitForURL('**/admin/settings/skus/*/edit', { timeout: 5000 })
      const afterUrl = page.url()
      console.log('📍 Navigated to:', afterUrl)
      console.log('✅ Successfully navigated to SKU edit page!')

      // Verify the edit page loaded
      const pageTitle = await page.locator('h1').textContent()
      if (pageTitle?.includes('Edit SKU')) {
        console.log('✅ Edit page loaded correctly')
      } else {
        console.log('❌ Edit page did not load correctly')
      }
    } else {
      console.log('⚠️  No SKUs found to test edit functionality')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

// Run the test
testSkuEditNavigation().catch(console.error)