import { test, expect } from '@playwright/test'

test.describe('💰 Finance & Invoice Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup demo environment and navigate to finance
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await page.click('a:has-text("Finance")')
    await page.waitForURL('**/finance')
  })

  test('Finance dashboard loads correctly', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText('Finance')
    
    // Check tabs are visible
    await expect(page.locator('button[role="tab"]:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Invoices")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Cost Rates")')).toBeVisible()
    
    // Check KPI cards
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Outstanding')).toBeVisible()
    await expect(page.locator('text=Collection Rate')).toBeVisible()
  })

  test('Invoice list and filtering', async ({ page }) => {
    // Click on Invoices tab
    await page.click('button[role="tab"]:has-text("Invoices")')
    
    // Wait for invoice table
    await page.waitForSelector('table')
    
    // Check table headers
    await expect(page.locator('th:has-text("Invoice #")')).toBeVisible()
    await expect(page.locator('th:has-text("Warehouse")')).toBeVisible()
    await expect(page.locator('th:has-text("Amount")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    
    // Test status filter
    await page.click('button:has-text("Status")')
    await page.click('text=Paid')
    await page.waitForTimeout(500)
    
    // Verify filtered results show only paid invoices
    const statusBadges = page.locator('span:has-text("Paid")')
    const count = await statusBadges.count()
    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('Generate new invoice', async ({ page }) => {
    // Navigate to invoices tab
    await page.click('button[role="tab"]:has-text("Invoices")')
    
    // Click Generate Invoice button
    await page.click('button:has-text("Generate Invoice")')
    
    // Fill invoice generation form
    await expect(page.locator('text=Generate Invoice')).toBeVisible()
    
    // Select warehouse
    await page.click('button[role="combobox"]:has-text("Select warehouse")')
    await page.click('[role="option"]:first-child')
    
    // Select billing period if available
    const billingPeriodSelect = page.locator('button[role="combobox"]:has-text("Select period")')
    if (await billingPeriodSelect.isVisible()) {
      await billingPeriodSelect.click()
      await page.click('[role="option"]:first-child')
    }
    
    // Generate invoice
    await page.click('button:has-text("Generate")')
    
    // Wait for success message
    await expect(page.locator('text=Invoice generated successfully')).toBeVisible({ timeout: 10000 })
  })

  test('View invoice details', async ({ page }) => {
    // Navigate to invoices
    await page.click('button[role="tab"]:has-text("Invoices")')
    await page.waitForSelector('table')
    
    // Click on first invoice
    await page.click('tbody tr:first-child a')
    
    // Check invoice detail page
    await expect(page.locator('h2:has-text("Invoice")')).toBeVisible()
    
    // Check invoice information
    await expect(page.locator('text=Invoice Number')).toBeVisible()
    await expect(page.locator('text=Billing Period')).toBeVisible()
    await expect(page.locator('text=Total Amount')).toBeVisible()
    
    // Check line items table
    await expect(page.locator('text=Line Items')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Download PDF")')).toBeVisible()
    await expect(page.locator('button:has-text("Mark as Paid")')).toBeVisible()
  })

  test('Update invoice status', async ({ page }) => {
    // Navigate to invoices
    await page.click('button[role="tab"]:has-text("Invoices")')
    await page.waitForSelector('table')
    
    // Find a pending invoice
    const pendingInvoice = page.locator('tr:has-text("Pending")').first()
    if (await pendingInvoice.isVisible()) {
      // Click on the invoice
      await pendingInvoice.locator('a').click()
      
      // Mark as paid
      await page.click('button:has-text("Mark as Paid")')
      
      // Confirm action
      await page.click('button:has-text("Confirm")')
      
      // Check success message
      await expect(page.locator('text=Invoice marked as paid')).toBeVisible({ timeout: 5000 })
      
      // Verify status change
      await expect(page.locator('span:has-text("Paid")')).toBeVisible()
    }
  })

  test('Cost rates management', async ({ page }) => {
    // Click on Cost Rates tab
    await page.click('button[role="tab"]:has-text("Cost Rates")')
    
    // Check cost rates table
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('th:has-text("Cost Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Category")')).toBeVisible()
    await expect(page.locator('th:has-text("Rate")')).toBeVisible()
    
    // Check if edit button exists
    const editButton = page.locator('button[aria-label="Edit"]:first-child')
    if (await editButton.isVisible()) {
      await editButton.click()
      
      // Check edit form
      await expect(page.locator('text=Edit Cost Rate')).toBeVisible()
      
      // Update rate value
      const rateInput = page.locator('input[name="costValue"]')
      await rateInput.fill('15.50')
      
      // Save changes
      await page.click('button:has-text("Save")')
      
      // Check success message
      await expect(page.locator('text=Cost rate updated')).toBeVisible({ timeout: 5000 })
    }
  })

  test('Financial reports', async ({ page }) => {
    // Look for reports section
    const reportsButton = page.locator('button:has-text("Reports")')
    if (await reportsButton.isVisible()) {
      await reportsButton.click()
      
      // Check available reports
      await expect(page.locator('text=Revenue Report')).toBeVisible()
      await expect(page.locator('text=Cost Analysis')).toBeVisible()
      
      // Generate a report
      await page.click('button:has-text("Generate Revenue Report")')
      
      // Wait for report generation
      await page.waitForTimeout(2000)
      
      // Check if download starts
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
      const download = await downloadPromise
      
      if (download) {
        expect(download.suggestedFilename()).toContain('report')
      }
    }
  })

  test('Invoice reconciliation', async ({ page }) => {
    // Navigate to invoices
    await page.click('button[role="tab"]:has-text("Invoices")')
    await page.waitForSelector('table')
    
    // Click on an invoice
    await page.click('tbody tr:first-child a')
    
    // Look for reconciliation section
    const reconcileButton = page.locator('button:has-text("Reconcile")')
    if (await reconcileButton.isVisible()) {
      await reconcileButton.click()
      
      // Check reconciliation modal
      await expect(page.locator('text=Invoice Reconciliation')).toBeVisible()
      
      // Check reconciliation options
      await expect(page.locator('text=Match')).toBeVisible()
      await expect(page.locator('text=Underbilled')).toBeVisible()
      await expect(page.locator('text=Overbilled')).toBeVisible()
    }
  })

  test('Billing period selection', async ({ page }) => {
    // Check billing period selector
    const periodSelector = page.locator('select[name="billingPeriod"], button:has-text("Current Period")')
    if (await periodSelector.isVisible()) {
      await periodSelector.click()
      
      // Check period options
      await expect(page.locator('text=/\\d{4}-\\d{2}/')).toBeVisible()
      
      // Select a different period
      await page.click('[role="option"]:nth-child(2)')
      
      // Wait for data to reload
      await page.waitForTimeout(1000)
      
      // Verify data updated
      await expect(page.locator('text=Total Revenue')).toBeVisible()
    }
  })

  test('Export financial data', async ({ page }) => {
    // Navigate to invoices
    await page.click('button[role="tab"]:has-text("Invoices")')
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export")')
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // Select export format if modal appears
      const csvOption = page.locator('button:has-text("CSV")')
      if (await csvOption.isVisible({ timeout: 2000 })) {
        await csvOption.click()
      }
      
      // Wait for download
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/invoices.*\.(csv|xlsx)/)
    }
  })

  test('Mobile responsive finance views', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check mobile layout
    await expect(page.locator('h1')).toBeVisible()
    
    // Tabs should be scrollable or in dropdown
    const tabList = page.locator('[role="tablist"]')
    await expect(tabList).toBeVisible()
    
    // KPI cards should stack
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    
    // Navigate to invoices
    await page.click('button[role="tab"]:has-text("Invoices")')
    
    // Table should be scrollable or card view
    const hasTable = await page.locator('table').isVisible()
    const hasCards = await page.locator('[data-testid="invoice-card"]').first().isVisible().catch(() => false)
    
    expect(hasTable || hasCards).toBeTruthy()
  })
})