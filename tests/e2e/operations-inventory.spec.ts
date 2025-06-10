import { test, expect } from '@playwright/test'

test.describe('Inventory Ledger', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/operations/inventory')
  })

  test('search functionality works', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    
    // Search by SKU
    await searchInput.fill('CS 007')
    await searchInput.press('Enter')
    
    // Wait for results to filter
    await page.waitForTimeout(500)
    
    // Check results contain search term
    const results = page.locator('table tbody tr')
    const count = await results.count()
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const row = results.nth(i)
        const text = await row.textContent()
        expect(text?.toLowerCase()).toContain('cs 007')
      }
    }
    
    // Clear search
    await searchInput.clear()
    await searchInput.press('Enter')
  })

  test('filters panel toggles', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: 'Filters' })
    
    // Initially filters should be hidden
    const filterPanel = page.locator('[aria-label="Filter panel"], .filter-panel')
    await expect(filterPanel).not.toBeVisible()
    
    // Click to show filters
    await filterButton.click()
    await expect(filterPanel).toBeVisible()
    
    // Click to hide filters
    await filterButton.click()
    await expect(filterPanel).not.toBeVisible()
  })

  test('warehouse filter works', async ({ page }) => {
    // Open filters
    await page.getByRole('button', { name: 'Filters' }).click()
    
    // Select warehouse
    const warehouseSelect = page.locator('select[aria-label="Warehouse filter"]')
    await warehouseSelect.selectOption({ index: 1 })
    
    // Wait for results to update
    await page.waitForTimeout(500)
    
    // Verify filtered results
    const selectedWarehouse = await warehouseSelect.inputValue()
    if (selectedWarehouse) {
      const results = page.locator('table tbody tr')
      const firstRow = results.first()
      if (await firstRow.isVisible()) {
        await expect(firstRow).toContainText(selectedWarehouse)
      }
    }
  })

  test('tab switching works', async ({ page }) => {
    const balancesTab = page.getByRole('tab', { name: 'Current Balances' })
    const transactionsTab = page.getByRole('tab', { name: 'Inventory Ledger' })
    
    // Check initial state - one should be selected
    const transactionsSelected = await transactionsTab.getAttribute('aria-selected')
    expect(['true', 'false']).toContain(transactionsSelected)
    
    // Switch to balances
    await balancesTab.click()
    await expect(balancesTab).toHaveAttribute('aria-selected', 'true')
    await expect(transactionsTab).toHaveAttribute('aria-selected', 'false')
    
    // Content should change
    await expect(page.getByText('Inventory Balance Details')).toBeVisible()
    
    // Switch back to transactions
    await transactionsTab.click()
    await expect(transactionsTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Inventory Ledger Details')).toBeVisible()
  })

  test('export button works', async ({ page }) => {
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download')
    
    // Click export
    await page.getByRole('button', { name: 'Export' }).click()
    
    // Wait for download
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/inventory.*\.xlsx?$/i)
  })

  test('transaction row click navigates to detail', async ({ page }) => {
    // Click on first transaction row
    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.isVisible()) {
      await firstRow.click()
      
      // Should navigate to transaction detail
      await expect(page).toHaveURL(/\/operations\/transactions\/[\w-]+/)
      
      // Detail page should load
      await expect(page.getByText('Transaction Details')).toBeVisible()
    }
  })

  test('sort by date works', async ({ page }) => {
    // Find sort button
    const sortButton = page.getByRole('button', { name: /creation date/i })
    
    if (await sortButton.isVisible()) {
      // Get initial sort indicator
      const initialIcon = await sortButton.locator('svg').getAttribute('class')
      
      // Click to sort
      await sortButton.click()
      await page.waitForTimeout(500)
      
      // Sort indicator should change
      const newIcon = await sortButton.locator('svg').getAttribute('class')
      expect(newIcon).not.toBe(initialIcon)
      
      // Verify dates are sorted
      const dates = await page.locator('table tbody tr td:first-child').allTextContents()
      if (dates.length > 1) {
        const parsedDates = dates.map(d => new Date(d.trim()).getTime())
        const sorted = [...parsedDates].sort((a, b) => b - a) // Descending
        expect(parsedDates).toEqual(sorted)
      }
    }
  })

  test('incomplete transactions filter', async ({ page }) => {
    // Open filters
    await page.getByRole('button', { name: 'Filters' }).click()
    
    // Check incomplete only
    const incompleteCheckbox = page.locator('input[type="checkbox"][id="showIncomplete"]')
    await incompleteCheckbox.check()
    
    // Wait for filter to apply
    await page.waitForTimeout(500)
    
    // All visible transactions should have warning icon
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const row = rows.nth(i)
        const warningIcon = row.locator('.lucide-alert-circle, [aria-label*="Missing"]')
        await expect(warningIcon).toBeVisible()
      }
    }
  })

  test('quick action buttons work', async ({ page }) => {
    // Test Receive Goods button
    const receiveButton = page.getByRole('link', { name: 'Receive Goods' })
    await receiveButton.click()
    await expect(page).toHaveURL('/operations/receive')
    await page.goBack()
    
    // Test Ship Goods button
    const shipButton = page.getByRole('link', { name: 'Ship Goods' })
    await shipButton.click()
    await expect(page).toHaveURL('/operations/ship')
    await page.goBack()
  })

  test('ledger info tooltip shows on hover', async ({ page }) => {
    const infoIcon = page.locator('.lucide-info').first()
    
    if (await infoIcon.isVisible()) {
      // Hover over info icon
      await infoIcon.hover()
      
      // Tooltip should appear
      await expect(page.getByText('Immutable Ledger')).toBeVisible()
      await expect(page.getByText(/cannot be edited or deleted/i)).toBeVisible()
      
      // Move away to hide tooltip
      await page.mouse.move(0, 0)
      await expect(page.getByText('Immutable Ledger')).not.toBeVisible()
    }
  })

  test('empty state is shown when no data', async ({ page }) => {
    // Apply filters that return no results
    await page.getByRole('button', { name: 'Filters' }).click()
    
    // Set impossible filter combination
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('IMPOSSIBLE_SEARCH_TERM_12345')
    
    // Wait for results
    await page.waitForTimeout(500)
    
    // Should show empty state
    await expect(page.getByText(/no.*found/i)).toBeVisible()
    await expect(page.locator('[data-testid="empty-state"], .empty-state')).toBeVisible()
  })
})