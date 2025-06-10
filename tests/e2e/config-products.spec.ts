import { test, expect } from '@playwright/test'

test.describe('SKU Management', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/config/products')
  })

  test('SKU list displays correctly', async ({ page }) => {
    // Check page elements
    await expect(page.getByRole('heading', { name: /products.*sku/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add SKU' })).toBeVisible()
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
    await expect(page.locator('input[type="checkbox"][id="showInactive"]')).toBeVisible()
    
    // Check table structure
    await expect(page.getByRole('columnheader', { name: 'SKU Code' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'ASIN' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Units/Carton' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('search SKUs', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    
    // Search by SKU code
    await searchInput.fill('CS 007')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)
    
    // Check results
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count > 0) {
      const firstRow = rows.first()
      await expect(firstRow).toContainText('CS 007')
    }
    
    // Clear and search by description
    await searchInput.clear()
    await searchInput.fill('Cotton')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)
    
    // Check results contain search term
    if (await rows.first().isVisible()) {
      const text = await rows.first().textContent()
      expect(text?.toLowerCase()).toContain('cotton')
    }
  })

  test('show inactive filter', async ({ page }) => {
    const inactiveCheckbox = page.locator('input[type="checkbox"][id="showInactive"]')
    
    // Initially unchecked
    await expect(inactiveCheckbox).not.toBeChecked()
    
    // Check to show inactive
    await inactiveCheckbox.check()
    await page.waitForTimeout(500)
    
    // Should show inactive SKUs
    const statusBadges = page.locator('.badge, [class*="status"]')
    const hasInactive = await statusBadges.locator(':text("Inactive")').count() > 0
    
    // Uncheck to hide inactive
    await inactiveCheckbox.uncheck()
    await page.waitForTimeout(500)
    
    // Should not show inactive SKUs
    const inactiveCount = await page.locator(':text("Inactive")').count()
    expect(inactiveCount).toBe(0)
  })

  test('SKU action buttons', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    
    if (await firstRow.isVisible()) {
      // Test Edit button
      const editButton = firstRow.getByRole('button', { name: 'Edit' })
      await editButton.click()
      await expect(page).toHaveURL(/\/config\/products\/[\w-]+\/edit/)
      await page.goBack()
      
      // Test Delete button
      const deleteButton = firstRow.getByRole('button', { name: 'Delete' })
      await deleteButton.click()
      
      // Confirm dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/are you sure.*delete/i)).toBeVisible()
      
      // Cancel deletion
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
      
      // Test Activate/Deactivate toggle
      const toggleButton = firstRow.getByRole('button', { name: /activate|deactivate/i })
      if (await toggleButton.isVisible()) {
        const initialText = await toggleButton.textContent()
        await toggleButton.click()
        
        // Wait for update
        await page.waitForTimeout(1000)
        
        // Button text should change
        const newText = await toggleButton.textContent()
        expect(newText).not.toBe(initialText)
      }
    }
  })

  test('navigate to add SKU', async ({ page }) => {
    await page.getByRole('link', { name: 'Add SKU' }).click()
    await expect(page).toHaveURL('/config/products/new')
    await expect(page.getByRole('heading', { name: /add.*sku|create.*sku/i })).toBeVisible()
  })
})

test.describe('Create/Edit SKU', () => {
  test.use({ storageState: 'tests/auth.json' })

  test('create new SKU', async ({ page }) => {
    await page.goto('/config/products/new')
    
    // Check all form fields
    await expect(page.locator('input[name="skuCode"]')).toBeVisible()
    await expect(page.locator('input[name="description"]')).toBeVisible()
    await expect(page.locator('input[name="asin"]')).toBeVisible()
    await expect(page.locator('input[name="packSize"]')).toBeVisible()
    await expect(page.locator('input[name="material"]')).toBeVisible()
    await expect(page.locator('input[name="unitsPerCarton"]')).toBeVisible()
    await expect(page.locator('input[name="cartonWeight"]')).toBeVisible()
    await expect(page.locator('input[name="length"]')).toBeVisible()
    await expect(page.locator('input[name="width"]')).toBeVisible()
    await expect(page.locator('input[name="height"]')).toBeVisible()
    await expect(page.locator('select[name="packagingType"]')).toBeVisible()
    await expect(page.locator('input[type="checkbox"][name="isActive"]')).toBeVisible()
    
    // Fill form
    await page.fill('input[name="skuCode"]', 'TEST-001')
    await page.fill('input[name="description"]', 'Test Product Description')
    await page.fill('input[name="asin"]', 'B00TEST001')
    await page.fill('input[name="packSize"]', '100')
    await page.fill('input[name="material"]', '100% Cotton')
    await page.fill('input[name="unitsPerCarton"]', '24')
    await page.fill('input[name="cartonWeight"]', '15.5')
    await page.fill('input[name="length"]', '20')
    await page.fill('input[name="width"]', '15')
    await page.fill('input[name="height"]', '10')
    await page.selectOption('select[name="packagingType"]', 'box')
    
    // Check active by default
    const activeCheckbox = page.locator('input[type="checkbox"][name="isActive"]')
    await expect(activeCheckbox).toBeChecked()
    
    // Submit form
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Should redirect to SKU list
    await expect(page).toHaveURL('/config/products')
    
    // Success message
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/created|saved/i)
  })

  test('form validation', async ({ page }) => {
    await page.goto('/config/products/new')
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Check required field validation
    await expect(page.locator('input[name="skuCode"]:invalid')).toBeVisible()
    await expect(page.locator('input[name="description"]:invalid')).toBeVisible()
    await expect(page.locator('input[name="unitsPerCarton"]:invalid')).toBeVisible()
    
    // Fill only SKU code
    await page.fill('input[name="skuCode"]', 'TEST')
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Other fields still invalid
    await expect(page.locator('input[name="description"]:invalid')).toBeVisible()
    
    // Fill remaining required fields
    await page.fill('input[name="description"]', 'Test Description')
    await page.fill('input[name="unitsPerCarton"]', '12')
    
    // Form should now be valid
    const saveButton = page.getByRole('button', { name: 'Save' })
    await expect(saveButton).toBeEnabled()
  })

  test('cancel returns to list', async ({ page }) => {
    await page.goto('/config/products/new')
    
    // Fill some data
    await page.fill('input[name="skuCode"]', 'TEST-CANCEL')
    
    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Should return to list without saving
    await expect(page).toHaveURL('/config/products')
    
    // Data should not be saved
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('TEST-CANCEL')
    await searchInput.press('Enter')
    await page.waitForTimeout(500)
    
    // No results
    await expect(page.getByText(/no.*found/i)).toBeVisible()
  })

  test('edit existing SKU', async ({ page }) => {
    // Go to SKU list
    await page.goto('/config/products')
    
    // Click edit on first SKU
    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: 'Edit' }).click()
      
      // Should navigate to edit page
      await expect(page).toHaveURL(/\/config\/products\/[\w-]+\/edit/)
      
      // Form should be pre-filled
      const skuCodeInput = page.locator('input[name="skuCode"]')
      await expect(skuCodeInput).not.toBeEmpty()
      
      // SKU code should be readonly in edit mode
      await expect(skuCodeInput).toHaveAttribute('readonly', '')
      
      // Update description
      const descInput = page.locator('input[name="description"]')
      await descInput.clear()
      await descInput.fill('Updated Description')
      
      // Save changes
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Should return to list
      await expect(page).toHaveURL('/config/products')
      
      // Success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/updated|saved/i)
    }
  })
})