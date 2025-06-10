import { test, expect } from '@playwright/test'

test.describe('Invoice Management', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/finance/invoices')
  })

  test('invoice list displays correctly', async ({ page }) => {
    // Check page elements
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New Invoice' })).toBeVisible()
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Invoice #' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Warehouse' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Period' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    
    // Search by invoice number
    await searchInput.fill('INV-2024')
    await searchInput.press('Enter')
    
    // Wait for results
    await page.waitForTimeout(500)
    
    // Check filtered results
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count > 0) {
      const firstRow = rows.first()
      const text = await firstRow.textContent()
      expect(text).toContain('INV-2024')
    }
  })

  test('status filter works', async ({ page }) => {
    const statusFilter = page.locator('select[aria-label="Status filter"]')
    
    // Filter by pending
    await statusFilter.selectOption('pending')
    await page.waitForTimeout(500)
    
    // Check all visible invoices are pending
    const statusBadges = page.locator('table tbody tr').locator('.badge, [class*="status"]')
    const count = await statusBadges.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(statusBadges.nth(i)).toContainText(/pending/i)
      }
    }
    
    // Filter by reconciled
    await statusFilter.selectOption('reconciled')
    await page.waitForTimeout(500)
    
    // Check status changed
    const reconciledBadges = page.locator('table tbody tr').locator('.badge, [class*="status"]')
    const reconciledCount = await reconciledBadges.count()
    if (reconciledCount > 0) {
      await expect(reconciledBadges.first()).toContainText(/reconciled/i)
    }
  })

  test('invoice action buttons', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    
    if (await firstRow.isVisible()) {
      // Test View button
      const viewButton = firstRow.getByRole('button', { name: 'View' })
      if (await viewButton.isVisible()) {
        await viewButton.click()
        await expect(page).toHaveURL(/\/finance\/invoices\/[\w-]+/)
        await page.goBack()
      }
      
      // Test Process button (for pending invoices)
      const processButton = firstRow.getByRole('button', { name: 'Process' })
      if (await processButton.isVisible()) {
        await processButton.click()
        // Should navigate to reconciliation
        await expect(page).toHaveURL(/\/finance\/reconciliation/)
        await page.goBack()
      }
      
      // Test Accept button (for reconciled invoices)
      const acceptButton = firstRow.getByRole('button', { name: 'Accept' })
      if (await acceptButton.isVisible()) {
        await acceptButton.click()
        // Should show confirmation or success message
        await expect(page.locator('.toast, [role="alert"]')).toBeVisible()
      }
    }
  })

  test('pagination controls', async ({ page }) => {
    const prevButton = page.getByRole('button', { name: 'Previous' })
    const nextButton = page.getByRole('button', { name: 'Next' })
    
    // Initially previous should be disabled
    await expect(prevButton).toBeDisabled()
    
    // If there are multiple pages, next should be enabled
    if (await nextButton.isEnabled()) {
      // Click next
      await nextButton.click()
      await page.waitForTimeout(500)
      
      // Now previous should be enabled
      await expect(prevButton).toBeEnabled()
      
      // Click previous to go back
      await prevButton.click()
      await page.waitForTimeout(500)
      
      // Previous should be disabled again
      await expect(prevButton).toBeDisabled()
    }
  })

  test('export invoices', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    
    await page.getByRole('button', { name: 'Export' }).click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/invoices.*\.xlsx?$/i)
  })

  test('navigate to new invoice', async ({ page }) => {
    await page.getByRole('link', { name: 'New Invoice' }).click()
    await expect(page).toHaveURL('/finance/invoices/new')
    
    // Check new invoice form
    await expect(page.getByRole('heading', { name: /create.*invoice/i })).toBeVisible()
    await expect(page.locator('input[name="invoiceNumber"]')).toBeVisible()
  })
})

test.describe('Create Invoice', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/finance/invoices/new')
  })

  test('invoice form has all fields', async ({ page }) => {
    // Basic fields
    await expect(page.locator('input[name="invoiceNumber"]')).toBeVisible()
    await expect(page.locator('select[name="warehouseId"]')).toBeVisible()
    await expect(page.locator('input[name="periodStart"]')).toBeVisible()
    await expect(page.locator('input[name="periodEnd"]')).toBeVisible()
    await expect(page.locator('input[name="dueDate"]')).toBeVisible()
    
    // Line items section
    await expect(page.getByRole('button', { name: 'Add Line Item' })).toBeVisible()
    
    // Notes
    await expect(page.locator('textarea[name="notes"]')).toBeVisible()
    
    // Action buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Invoice' })).toBeVisible()
  })

  test('add and remove line items', async ({ page }) => {
    // Should start with one line item
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(1)
    
    // Add line item
    await page.getByRole('button', { name: 'Add Line Item' }).click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(2)
    
    // Add another
    await page.getByRole('button', { name: 'Add Line Item' }).click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(3)
    
    // Remove second item
    await page.locator('[data-testid="line-item"]:nth-child(2) button[aria-label="Remove line item"]').click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(2)
  })

  test('line item calculations', async ({ page }) => {
    // Fill first line item
    await page.locator('select[name="lineItems[0].serviceType"]').selectOption('storage')
    await page.fill('input[name="lineItems[0].description"]', 'Storage Fee')
    await page.fill('input[name="lineItems[0].quantity"]', '100')
    await page.fill('input[name="lineItems[0].rate"]', '5.50')
    
    // Check total calculation
    const totalField = page.locator('[data-testid="line-total-0"], input[name="lineItems[0].total"]')
    if (await totalField.isVisible()) {
      await expect(totalField).toHaveValue('550.00')
    }
    
    // Add another line item
    await page.getByRole('button', { name: 'Add Line Item' }).click()
    await page.locator('select[name="lineItems[1].serviceType"]').selectOption('handling')
    await page.fill('input[name="lineItems[1].description"]', 'Handling Fee')
    await page.fill('input[name="lineItems[1].quantity"]', '50')
    await page.fill('input[name="lineItems[1].rate"]', '2.00')
    
    // Check grand total
    const grandTotal = page.locator('[data-testid="grand-total"], .grand-total')
    if (await grandTotal.isVisible()) {
      await expect(grandTotal).toContainText('650.00')
    }
  })

  test('form validation', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Invoice' }).click()
    
    // Check validation
    await expect(page.locator('input[name="invoiceNumber"]:invalid')).toBeVisible()
    await expect(page.locator('select[name="warehouseId"]:invalid')).toBeVisible()
    
    // Fill required fields
    await page.fill('input[name="invoiceNumber"]', 'INV-2024-001')
    await page.locator('select[name="warehouseId"]').selectOption({ index: 1 })
    await page.fill('input[name="periodStart"]', '2024-01-01')
    await page.fill('input[name="periodEnd"]', '2024-01-31')
    await page.fill('input[name="dueDate"]', '2024-02-15')
    
    // Add line item details
    await page.locator('select[name="lineItems[0].serviceType"]').selectOption('storage')
    await page.fill('input[name="lineItems[0].description"]', 'Monthly Storage')
    await page.fill('input[name="lineItems[0].quantity"]', '100')
    await page.fill('input[name="lineItems[0].rate"]', '5.00')
    
    // Form should now be valid
    const submitButton = page.getByRole('button', { name: 'Create Invoice' })
    await expect(submitButton).toBeEnabled()
  })

  test('cancel returns to invoice list', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL('/finance/invoices')
  })
})