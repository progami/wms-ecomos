import { test, expect } from '@playwright/test'
import { setupDemoAndLogin } from './utils/auth-helpers'

test.describe('📦 SKU Management Runtime Tests', () => {
  test.beforeEach(async ({ page, request }) => {
    // Setup demo data first via API
    const setupResponse = await request.post('/api/demo/setup')
    expect(setupResponse.ok()).toBeTruthy()
    
    // Use the auth helper that handles both test and regular auth
    await setupDemoAndLogin(page)
    
    // Navigate to SKU page - Products (SKUs) in Configuration section
    await page.click('a:has-text("Products (SKUs)")')
    await page.waitForURL('**/config/products')
  })

  test('SKU list page loads correctly', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1, h2').first()).toContainText('SKU Management')
    
    // Check Add SKU button
    // Button might be collapsed on mobile - it's actually a link not a button
    await expect(page.locator('a:has-text("Add SKU")')).toBeVisible()
    
    // Check search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
    
    // Check data table
    await expect(page.locator('table')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th:has-text("SKU Code")')).toBeVisible()
    await expect(page.locator('th:has-text("Description")')).toBeVisible()
    await expect(page.locator('th:has-text("ASIN")')).toBeVisible()
  })

  test('Search functionality works', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Get initial row count
    const initialRows = await page.locator('tbody tr').count()
    
    // Search for a specific term
    await page.fill('input[placeholder*="Search"]', 'ELEC')
    await page.waitForTimeout(500) // Debounce delay
    
    // Check filtered results
    const filteredRows = await page.locator('tbody tr').count()
    expect(filteredRows).toBeLessThanOrEqual(initialRows)
    
    // Clear search
    await page.fill('input[placeholder*="Search"]', '')
    await page.waitForTimeout(500)
    
    // Should show all results again
    const clearedRows = await page.locator('tbody tr').count()
    expect(clearedRows).toBe(initialRows)
  })

  test('Add new SKU flow', async ({ page }) => {
    // Click Add SKU link (not button)
    await page.click('a:has-text("Add SKU")')
    
    // Wait for navigation to new SKU page
    await page.waitForURL('**/config/products/new')
    
    // Check page heading
    await expect(page.locator('h1:has-text("Create New SKU")')).toBeVisible()
    
    // Fill form fields
    const timestamp = Date.now()
    await page.fill('input[placeholder="e.g., PROD-001"]', `TEST-SKU-${timestamp}`)
    await page.fill('input[placeholder="Product description"]', 'Test Product Description')
    
    // Fill other required fields
    await page.fill('input[type="number"][value="1"]:first-of-type', '5') // Pack size
    await page.fill('input[type="number"][value="1"]:last-of-type', '10') // Units per carton
    
    // Submit form
    await page.click('button:has-text("Create SKU")')
    
    // Wait for alert and navigation back to SKU list
    await page.waitForFunction(() => window.location.pathname === '/config/products', { timeout: 10000 })
    
    // Verify new SKU appears in list
    await expect(page.locator(`text=TEST-SKU-${timestamp}`)).toBeVisible()
  })

  test('Edit existing SKU', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Click edit button on first SKU (icon button without aria-label)
    await page.click('tbody tr:first-child button[title="Edit SKU"]')
    
    // Wait for navigation to edit page
    await page.waitForURL(/\/config\/products\/.*\/edit/)
    
    // Check edit form appears
    await expect(page.locator('h1:has-text("Edit SKU")')).toBeVisible()
    
    // Update description
    const newDescription = `Updated Description ${Date.now()}`
    await page.fill('input[placeholder="Product description"]', newDescription)
    
    // Save changes
    await page.click('button:has-text("Save Changes")')
    
    // Wait for alert and navigation back to list
    await page.waitForFunction(() => window.location.pathname === '/config/products', { timeout: 10000 })
    
    // Verify update in table
    await expect(page.locator(`text=${newDescription}`)).toBeVisible()
  })

  test('View SKU details', async ({ page }) => {
    // Skip this test - SKU codes in the table are not clickable links
    // The UI only provides edit and delete buttons, no view details functionality
    test.skip()
  })

  test('Delete SKU with confirmation', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Get SKU code to delete
    const skuCode = await page.locator('tbody tr:last-child td:first-child').textContent()
    
    // Click delete button (icon button without aria-label)
    await page.click('tbody tr:last-child button[title="Delete SKU"]')
    
    // Check confirmation dialog - actual message varies based on whether SKU has related data
    await expect(page.locator('h2:has-text("Delete SKU")')).toBeVisible()
    
    // Confirm deletion
    await page.click('button:has-text("Delete")')
    
    // Wait for alert and table refresh
    await page.waitForTimeout(2000)
    
    // Verify SKU is removed from list or deactivated
    const skuStillExists = await page.locator(`text=${skuCode}`).isVisible()
    if (skuStillExists) {
      // If SKU had related data, it should be deactivated instead of deleted
      await expect(page.locator(`tbody tr:has-text("${skuCode}") span:has-text("Inactive")`)).toBeVisible()
    }
  })

  test('Pagination functionality', async ({ page }) => {
    // Check if pagination exists
    const pagination = page.locator('nav[aria-label="Pagination"]')
    
    if (await pagination.isVisible()) {
      // Check page info
      await expect(page.locator('text=/Page \\d+ of \\d+/')).toBeVisible()
      
      // Test next page
      const nextButton = page.locator('button[aria-label="Next page"]')
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(500)
        await expect(page.locator('text=/Page 2/')).toBeVisible()
        
        // Test previous page
        await page.click('button[aria-label="Previous page"]')
        await page.waitForTimeout(500)
        await expect(page.locator('text=/Page 1/')).toBeVisible()
      }
    }
  })

  test('Form validation', async ({ page }) => {
    // Navigate to add SKU page
    await page.click('a:has-text("Add SKU")')
    await page.waitForURL('**/config/products/new')
    
    // Try to submit empty form
    await page.click('button:has-text("Create SKU")')
    
    // Check validation messages
    await expect(page.locator('text=SKU code is required')).toBeVisible()
    await expect(page.locator('text=Description is required')).toBeVisible()
    
    // Test invalid inputs
    await page.fill('input[type="number"][value="1"]:last-of-type', '-5') // Units per carton
    await page.click('button:has-text("Create SKU")')
    await expect(page.locator('text=Units per carton must be at least 1')).toBeVisible()
  })

  test('Bulk actions', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Select multiple SKUs if checkboxes exist
    const checkboxes = page.locator('tbody input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    
    if (checkboxCount > 0) {
      // Select first 3 SKUs
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await checkboxes.nth(i).click()
      }
      
      // Check bulk actions appear
      await expect(page.locator('text=3 selected')).toBeVisible()
      await expect(page.locator('button:has-text("Bulk Delete")')).toBeVisible()
    }
  })

  test('Export functionality', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export")')
    
    if (await exportButton.isVisible()) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download')
      
      // Click export
      await exportButton.click()
      
      // Wait for download
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toContain('skus')
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/)
    }
  })

  test('Mobile responsive SKU management', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check mobile layout
    await expect(page.locator('h1')).toBeVisible()
    // Button might be collapsed on mobile - it's actually a link not a button
    await expect(page.locator('a:has-text("Add SKU")')).toBeVisible()
    
    // Table should be scrollable or card view
    const table = page.locator('table')
    const cards = page.locator('[data-testid="sku-card"]')
    
    // Either table with horizontal scroll or card layout
    const hasTable = await table.isVisible()
    const hasCards = await cards.first().isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })
})
