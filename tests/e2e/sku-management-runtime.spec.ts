import { test, expect } from '@playwright/test'

test.describe('📦 SKU Management Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup demo environment and navigate to SKU page
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.click('a:has-text("SKUs")')
    await page.waitForURL('**/skus')
  })

  test('SKU list page loads correctly', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText('SKU Management')
    
    // Check Add SKU button
    await expect(page.locator('button:has-text("Add SKU")')).toBeVisible()
    
    // Check search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
    
    // Check data table
    await expect(page.locator('table')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th:has-text("SKU Code")')).toBeVisible()
    await expect(page.locator('th:has-text("Description")')).toBeVisible()
    await expect(page.locator('th:has-text("Category")')).toBeVisible()
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
    // Click Add SKU button
    await page.click('button:has-text("Add SKU")')
    
    // Check modal/form appears
    await expect(page.locator('text=Add New SKU')).toBeVisible()
    
    // Fill form fields
    const timestamp = Date.now()
    await page.fill('input[name="skuCode"]', `TEST-SKU-${timestamp}`)
    await page.fill('input[name="description"]', 'Test Product Description')
    
    // Select category
    await page.click('button[role="combobox"]:has-text("Select category")')
    await page.click('text=Electronics')
    
    // Fill other required fields
    await page.fill('input[name="unitsPerCarton"]', '10')
    await page.fill('input[name="unitsPerPallet"]', '100')
    
    // Submit form
    await page.click('button:has-text("Create SKU")')
    
    // Wait for success message or redirect
    await expect(page.locator('text=SKU created successfully')).toBeVisible({ timeout: 5000 })
    
    // Verify new SKU appears in list
    await expect(page.locator(`text=TEST-SKU-${timestamp}`)).toBeVisible()
  })

  test('Edit existing SKU', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Click edit button on first SKU
    await page.click('tbody tr:first-child button[aria-label="Edit"]')
    
    // Check edit form appears
    await expect(page.locator('text=Edit SKU')).toBeVisible()
    
    // Update description
    const newDescription = `Updated Description ${Date.now()}`
    await page.fill('input[name="description"]', newDescription)
    
    // Save changes
    await page.click('button:has-text("Save Changes")')
    
    // Wait for success message
    await expect(page.locator('text=SKU updated successfully')).toBeVisible({ timeout: 5000 })
    
    // Verify update in table
    await expect(page.locator(`text=${newDescription}`)).toBeVisible()
  })

  test('View SKU details', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Click on SKU code to view details
    await page.click('tbody tr:first-child a')
    
    // Check detail view
    await expect(page.locator('h2:has-text("SKU Details")')).toBeVisible()
    
    // Check key information is displayed
    await expect(page.locator('text=SKU Code')).toBeVisible()
    await expect(page.locator('text=Description')).toBeVisible()
    await expect(page.locator('text=Category')).toBeVisible()
    await expect(page.locator('text=Dimensions')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Edit")')).toBeVisible()
    await expect(page.locator('button:has-text("Back")')).toBeVisible()
  })

  test('Delete SKU with confirmation', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Get SKU code to delete
    const skuCode = await page.locator('tbody tr:last-child td:first-child').textContent()
    
    // Click delete button
    await page.click('tbody tr:last-child button[aria-label="Delete"]')
    
    // Check confirmation dialog
    await expect(page.locator('text=Are you sure you want to delete this SKU?')).toBeVisible()
    
    // Confirm deletion
    await page.click('button:has-text("Delete")')
    
    // Wait for success message
    await expect(page.locator('text=SKU deleted successfully')).toBeVisible({ timeout: 5000 })
    
    // Verify SKU is removed from list
    await expect(page.locator(`text=${skuCode}`)).not.toBeVisible()
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
    // Open add SKU form
    await page.click('button:has-text("Add SKU")')
    
    // Try to submit empty form
    await page.click('button:has-text("Create SKU")')
    
    // Check validation messages
    await expect(page.locator('text=SKU Code is required')).toBeVisible()
    await expect(page.locator('text=Description is required')).toBeVisible()
    
    // Test invalid inputs
    await page.fill('input[name="unitsPerCarton"]', '-5')
    await page.click('button:has-text("Create SKU")')
    await expect(page.locator('text=Must be a positive number')).toBeVisible()
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
    await expect(page.locator('button:has-text("Add SKU")')).toBeVisible()
    
    // Table should be scrollable or card view
    const table = page.locator('table')
    const cards = page.locator('[data-testid="sku-card"]')
    
    // Either table with horizontal scroll or card layout
    const hasTable = await table.isVisible()
    const hasCards = await cards.first().isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })
})