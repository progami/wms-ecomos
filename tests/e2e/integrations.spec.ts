import { test, expect } from '@playwright/test'

test.describe('Amazon FBA Integration', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations/amazon')
  })

  test('amazon integration page elements', async ({ page }) => {
    // Check page header
    await expect(page.getByRole('heading', { name: /amazon.*fba/i })).toBeVisible()
    
    // Sync controls
    await expect(page.getByRole('button', { name: 'Sync Now' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Setup Amazon FBA Warehouse' })).toBeVisible()
    
    // Settings section
    await expect(page.locator('input[name="autoSync"]')).toBeVisible()
    await expect(page.locator('select[name="syncInterval"]')).toBeVisible()
    
    // Warehouse mapping table
    await expect(page.getByText(/warehouse.*mapping/i)).toBeVisible()
  })

  test('sync now functionality', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: 'Sync Now' })
    
    // Click sync
    await syncButton.click()
    
    // Button should show loading state
    await expect(syncButton).toBeDisabled()
    await expect(syncButton).toContainText(/syncing/i)
    
    // Wait for sync to complete (mock or real)
    await expect(syncButton).toBeEnabled({ timeout: 30000 })
    await expect(syncButton).toContainText('Sync Now')
    
    // Success message
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/sync.*complete/i)
    
    // Last sync time should update
    await expect(page.getByText(/last sync.*ago/i)).toBeVisible()
  })

  test('setup warehouse button', async ({ page }) => {
    await page.getByRole('button', { name: 'Setup Amazon FBA Warehouse' }).click()
    
    // Should either open modal or navigate
    const modal = page.getByRole('dialog')
    if (await modal.isVisible()) {
      // Modal approach
      await expect(modal).toContainText(/setup.*warehouse/i)
      
      // Check form fields
      await expect(modal.locator('input[name="warehouseName"]')).toBeVisible()
      await expect(modal.locator('input[name="warehouseCode"]')).toBeVisible()
      
      // Cancel
      await modal.getByRole('button', { name: 'Cancel' }).click()
    } else {
      // Navigation approach
      await expect(page).toHaveURL(/setup|warehouse|create/i)
    }
  })

  test('auto-sync toggle', async ({ page }) => {
    const autoSyncToggle = page.locator('input[name="autoSync"]')
    
    // Get initial state
    const initialChecked = await autoSyncToggle.isChecked()
    
    // Toggle
    if (initialChecked) {
      await autoSyncToggle.uncheck()
      await expect(autoSyncToggle).not.toBeChecked()
    } else {
      await autoSyncToggle.check()
      await expect(autoSyncToggle).toBeChecked()
    }
    
    // When enabled, sync interval should be enabled
    if (await autoSyncToggle.isChecked()) {
      const intervalSelect = page.locator('select[name="syncInterval"]')
      await expect(intervalSelect).toBeEnabled()
      
      // Select interval
      await intervalSelect.selectOption('hourly')
      await expect(intervalSelect).toHaveValue('hourly')
    }
  })

  test('save integration settings', async ({ page }) => {
    // Enable auto-sync
    await page.locator('input[name="autoSync"]').check()
    
    // Set sync interval
    await page.selectOption('select[name="syncInterval"]', 'daily')
    
    // Save settings
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Check success
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/saved|updated/i)
    
    // Reload page and verify settings persisted
    await page.reload()
    
    await expect(page.locator('input[name="autoSync"]')).toBeChecked()
    await expect(page.locator('select[name="syncInterval"]')).toHaveValue('daily')
  })

  test('warehouse mapping table', async ({ page }) => {
    const mappingTable = page.locator('table').filter({ hasText: /amazon.*local/i })
    
    if (await mappingTable.isVisible()) {
      // Check table headers
      await expect(mappingTable.getByRole('columnheader', { name: /amazon.*warehouse/i })).toBeVisible()
      await expect(mappingTable.getByRole('columnheader', { name: /local.*warehouse/i })).toBeVisible()
      await expect(mappingTable.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      
      // Check for mapping rows
      const rows = mappingTable.locator('tbody tr')
      const rowCount = await rows.count()
      
      if (rowCount > 0) {
        // Test edit mapping
        const editButton = rows.first().getByRole('button', { name: 'Edit' })
        if (await editButton.isVisible()) {
          await editButton.click()
          
          // Edit form or inline edit
          const select = rows.first().locator('select')
          if (await select.isVisible()) {
            await select.selectOption({ index: 1 })
            
            // Save
            await rows.first().getByRole('button', { name: 'Save' }).click()
            
            // Success message
            await expect(page.locator('.toast, [role="alert"]')).toContainText(/updated/i)
          }
        }
      }
    }
  })

  test('sync history', async ({ page }) => {
    // Look for sync history section
    const historySection = page.locator('section').filter({ hasText: /sync.*history/i })
    
    if (await historySection.isVisible()) {
      // Should show recent syncs
      await expect(historySection.locator('table, .sync-entry')).toBeVisible()
      
      // Check for sync details
      const syncEntries = historySection.locator('tr, .sync-entry').filter({ hasText: /success|failed/i })
      const entryCount = await syncEntries.count()
      
      if (entryCount > 0) {
        // First entry should have timestamp
        const firstEntry = syncEntries.first()
        await expect(firstEntry).toContainText(/\d{1,2}:\d{2}/i) // Time format
        
        // Status indicator
        await expect(firstEntry.locator('.badge, [class*="status"]')).toBeVisible()
      }
    }
  })

  test('error handling for failed sync', async ({ page }) => {
    // Intercept API call to simulate failure
    await page.route('**/api/amazon/sync', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Connection failed' })
      })
    })
    
    // Try to sync
    await page.getByRole('button', { name: 'Sync Now' }).click()
    
    // Wait for error
    await page.waitForTimeout(1000)
    
    // Error message should appear
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/failed|error/i)
    
    // Sync button should be enabled again
    await expect(page.getByRole('button', { name: 'Sync Now' })).toBeEnabled()
  })
})