import { test, expect } from '@playwright/test'

test.describe('Reports', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
  })

  test('report generator interface', async ({ page }) => {
    // Check page elements
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible()
    
    // Report type selector
    await expect(page.locator('select[name="reportType"]')).toBeVisible()
    
    // Date range inputs
    await expect(page.locator('input[name="startDate"]')).toBeVisible()
    await expect(page.locator('input[name="endDate"]')).toBeVisible()
    
    // Generate button
    await expect(page.getByRole('button', { name: 'Generate Report' })).toBeVisible()
  })

  test('select report type', async ({ page }) => {
    const reportTypeSelect = page.locator('select[name="reportType"]')
    
    // Check available options
    await reportTypeSelect.click()
    const options = await reportTypeSelect.locator('option').allTextContents()
    
    expect(options).toContain('Inventory Summary')
    expect(options).toContain('Transaction History')
    expect(options).toContain('Cost Analysis')
    expect(options).toContain('SKU Performance')
    
    // Select a report type
    await reportTypeSelect.selectOption('inventory-summary')
    
    // Additional filters might appear based on report type
    await page.waitForTimeout(500)
    
    // Warehouse filter should be visible for inventory report
    await expect(page.locator('select[name="warehouses"]')).toBeVisible()
  })

  test('date range selection', async ({ page }) => {
    const startDate = page.locator('input[name="startDate"]')
    const endDate = page.locator('input[name="endDate"]')
    
    // Set date range
    await startDate.fill('2024-01-01')
    await endDate.fill('2024-01-31')
    
    // Verify values
    await expect(startDate).toHaveValue('2024-01-01')
    await expect(endDate).toHaveValue('2024-01-31')
    
    // End date should not be before start date
    await endDate.fill('2023-12-31')
    await page.getByRole('button', { name: 'Generate Report' }).click()
    
    // Should show validation error
    await expect(page.getByText(/end date.*before.*start/i)).toBeVisible()
  })

  test('multi-select filters', async ({ page }) => {
    // Select report type that has multi-select
    await page.locator('select[name="reportType"]').selectOption('inventory-summary')
    await page.waitForTimeout(500)
    
    const warehouseSelect = page.locator('select[name="warehouses"]')
    if (await warehouseSelect.isVisible()) {
      // Select multiple warehouses
      await warehouseSelect.selectOption(['warehouse-1', 'warehouse-2'])
      
      // Check selections
      const selected = await warehouseSelect.evaluate((select: HTMLSelectElement) => {
        return Array.from(select.selectedOptions).map(opt => opt.value)
      })
      expect(selected.length).toBeGreaterThan(0)
    }
    
    // SKU multi-select
    const skuSelect = page.locator('select[name="skus"]')
    if (await skuSelect.isVisible()) {
      await skuSelect.selectOption(['sku-1', 'sku-2', 'sku-3'])
    }
  })

  test('generate report', async ({ page }) => {
    // Select report type
    await page.locator('select[name="reportType"]').selectOption('transaction-history')
    
    // Set date range
    await page.fill('input[name="startDate"]', '2024-01-01')
    await page.fill('input[name="endDate"]', '2024-01-31')
    
    // Generate report
    await page.getByRole('button', { name: 'Generate Report' }).click()
    
    // Loading state
    const generateButton = page.getByRole('button', { name: /generat/i })
    await expect(generateButton).toBeDisabled()
    await expect(generateButton).toContainText(/generating/i)
    
    // Wait for report
    await expect(generateButton).toBeEnabled({ timeout: 30000 })
    
    // Report preview should appear
    await expect(page.locator('.report-preview, [data-testid="report-preview"]')).toBeVisible()
    
    // Export button should be available
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()
  })

  test('export report', async ({ page }) => {
    // Generate a report first
    await page.locator('select[name="reportType"]').selectOption('inventory-summary')
    await page.fill('input[name="startDate"]', '2024-01-01')
    await page.fill('input[name="endDate"]', '2024-01-31')
    await page.getByRole('button', { name: 'Generate Report' }).click()
    
    // Wait for report
    await page.waitForSelector('.report-preview, [data-testid="report-preview"]')
    
    // Export report
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export' }).click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/report.*\.(xlsx?|pdf|csv)$/i)
  })

  test('print report', async ({ page }) => {
    // Generate a report
    await page.locator('select[name="reportType"]').selectOption('inventory-summary')
    await page.fill('input[name="startDate"]', '2024-01-01')
    await page.fill('input[name="endDate"]', '2024-01-31')
    await page.getByRole('button', { name: 'Generate Report' }).click()
    
    // Wait for report
    await page.waitForSelector('.report-preview, [data-testid="report-preview"]')
    
    // Mock print dialog
    await page.evaluate(() => {
      window.print = () => {
        window.printCalled = true
      }
    })
    
    // Click print
    const printButton = page.getByRole('button', { name: 'Print' })
    if (await printButton.isVisible()) {
      await printButton.click()
      
      // Check print was called
      const printCalled = await page.evaluate(() => window.printCalled)
      expect(printCalled).toBeTruthy()
    }
  })
})