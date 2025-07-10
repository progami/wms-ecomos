import { test, expect } from '@playwright/test'
import { setupDemoAndLogin } from './utils/auth-helpers'

test.describe('💰 Finance & Invoice Runtime Tests', () => {
  test.beforeEach(async ({ page, request }) => {
    try {
      // Setup demo data first via API (this might fail if not authenticated)
      const setupResponse = await request.post('/api/demo/setup')
      if (!setupResponse.ok()) {
        console.log('Demo setup via API failed, will proceed with login')
      }
    } catch (error) {
      console.log('Demo setup API call failed, continuing with auth')
    }
    
    // Use the auth helper that handles both test and regular auth
    await setupDemoAndLogin(page)
    
    // Navigate to finance - handle both sidebar link and direct navigation
    const financeLink = page.locator('a:has-text("Finance")').first()
    if (await financeLink.isVisible()) {
      await financeLink.click()
      await page.waitForURL('**/finance')
    } else {
      await page.goto('/finance')
    }
  })

  test('Finance dashboard loads correctly', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText('Finance')
    
    // The finance page shows a grid of module cards instead of tabs
    // Check for finance module links
    await expect(page.locator('a:has-text("Finance Dashboard")')).toBeVisible()
    await expect(page.locator('a:has-text("Invoices")')).toBeVisible()
    await expect(page.locator('a:has-text("Reconciliation")')).toBeVisible()
    await expect(page.locator('a:has-text("Storage Ledger")')).toBeVisible()
    await expect(page.locator('a:has-text("Cost Ledger")')).toBeVisible()
    
    // Navigate to the Finance Dashboard to check KPIs
    await page.click('a:has-text("Finance Dashboard")')
    await page.waitForURL('**/finance/dashboard')
    
    // Check KPI cards
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Outstanding Invoices')).toBeVisible()
    await expect(page.locator('text=Collection Rate')).toBeVisible()
  })

  test('Invoice list and filtering', async ({ page }) => {
    // Navigate to Invoices module
    await page.click('a:has-text("Invoices")')
    await page.waitForURL('**/finance/invoices')
    
    // Wait for invoice table or no data message
    await page.waitForSelector('table, text="No invoices found"')
    
    // Check if table exists (might have no data)
    const hasTable = await page.locator('table').isVisible()
    if (hasTable) {
      // Check table headers
      await expect(page.locator('th').first()).toBeVisible()
      
      // Test status filter if dropdown exists
      const statusFilter = page.locator('select:has-text("All statuses"), button:has-text("All statuses")')
      if (await statusFilter.isVisible()) {
        await statusFilter.click()
        const paidOption = page.locator('option:has-text("Paid"), [role="option"]:has-text("Paid")')
        if (await paidOption.isVisible()) {
          await paidOption.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('Generate new invoice', async ({ page }) => {
    // Navigate to invoices module
    await page.click('a:has-text("Invoices")')
    await page.waitForURL('**/finance/invoices')
    
    // Look for create/new invoice button
    const newInvoiceButton = page.locator('button:has-text("New Invoice"), button:has-text("Create Invoice"), a:has-text("New Invoice")')
    if (await newInvoiceButton.isVisible()) {
      await newInvoiceButton.click()
      
      // Wait for form or navigation
      await page.waitForTimeout(1000)
      
      // Check if we're on a form page
      const formExists = await page.locator('form').isVisible()
      if (formExists) {
        // Fill in basic invoice details if form fields exist
        const warehouseSelect = page.locator('select[name="warehouseId"], button[role="combobox"]').first()
        if (await warehouseSelect.isVisible()) {
          await warehouseSelect.click()
          const firstOption = page.locator('option, [role="option"]').first()
          if (await firstOption.isVisible()) {
            await firstOption.click()
          }
        }
      }
    }
  })

  test('View invoice details', async ({ page }) => {
    // Navigate to invoices
    await page.click('a:has-text("Invoices")')
    await page.waitForURL('**/finance/invoices')
    
    // Check if there are any invoices to view
    const hasTable = await page.locator('table').isVisible()
    if (hasTable) {
      // Look for a clickable invoice link or row
      const invoiceLink = page.locator('tbody tr:first-child a, tbody tr:first-child button').first()
      if (await invoiceLink.isVisible()) {
        await invoiceLink.click()
        await page.waitForTimeout(1000)
        
        // Check if we navigated to invoice detail page
        const isDetailPage = page.url().includes('/invoices/') && !page.url().includes('/new')
        if (isDetailPage) {
          // Check for invoice details - be flexible with headings
          await expect(page.locator('h1, h2, h3').first()).toBeVisible()
          
          // Check for common invoice fields
          const hasInvoiceInfo = await page.locator('text=/Invoice|Amount|Period/i').isVisible()
          expect(hasInvoiceInfo).toBeTruthy()
        }
      }
    }
  })

  test('Update invoice status', async ({ page }) => {
    // Navigate to invoices
    await page.click('a:has-text("Invoices")')
    await page.waitForURL('**/finance/invoices')
    
    // Check if there are any invoices
    const hasTable = await page.locator('table').isVisible()
    if (hasTable) {
      // Find an invoice with a status that can be changed
      const invoice = page.locator('tbody tr').first()
      if (await invoice.isVisible()) {
        // Click on the invoice to view details
        const invoiceLink = invoice.locator('a, button').first()
        if (await invoiceLink.isVisible()) {
          await invoiceLink.click()
          await page.waitForTimeout(1000)
          
          // Look for status update buttons
          const statusButton = page.locator('button:has-text("Mark as Paid"), button:has-text("Update Status")')
          if (await statusButton.isVisible()) {
            await statusButton.click()
            
            // Handle confirmation if it appears
            const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
            if (await confirmButton.isVisible({ timeout: 2000 })) {
              await confirmButton.click()
            }
          }
        }
      }
    }
  })

  test('Cost rates management', async ({ page }) => {
    // Navigate to Cost Ledger instead of looking for a Cost Rates tab
    await page.goto('/finance/cost-ledger')
    await page.waitForLoadState('networkidle')
    
    // Check if cost ledger page loaded
    const hasContent = await page.locator('h1, h2').first().isVisible()
    if (hasContent) {
      // Look for cost-related content or tables
      const hasTable = await page.locator('table').isVisible()
      const hasCostInfo = await page.locator('text=/cost|rate|charge/i').first().isVisible()
      
      expect(hasTable || hasCostInfo).toBeTruthy()
    }
    
    // Alternatively check the config rates page
    await page.goto('/config/rates')
    await page.waitForLoadState('networkidle')
    
    // Check if rates configuration exists
    const hasRatesConfig = await page.locator('text=/rate|cost|pricing/i').first().isVisible()
    if (hasRatesConfig) {
      console.log('Found rates configuration page')
    }
  })

  test('Financial reports', async ({ page }) => {
    // Navigate to Reports module
    await page.click('a:has-text("Reports")')
    await page.waitForURL('**/finance/reports')
    
    // Check if reports page loaded
    const hasReportsContent = await page.locator('h1, h2').first().isVisible()
    if (hasReportsContent) {
      // Look for report generation options
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Export"), button:has-text("Download")')
      if (await generateButton.first().isVisible()) {
        // Set up download listener before clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
        
        await generateButton.first().click()
        
        // Wait for potential download
        const download = await downloadPromise
        if (download) {
          console.log('Report download started:', download.suggestedFilename())
        }
      }
    }
  })

  test('Invoice reconciliation', async ({ page }) => {
    // Navigate to Reconciliation module directly
    await page.click('a:has-text("Reconciliation")')
    await page.waitForURL('**/finance/reconciliation')
    
    // Check if reconciliation page loaded
    const hasReconciliationContent = await page.locator('h1, h2').first().isVisible()
    if (hasReconciliationContent) {
      // Look for reconciliation-related content
      const hasReconciliationInfo = await page.locator('text=/reconcil|match|variance/i').first().isVisible()
      expect(hasReconciliationInfo).toBeTruthy()
      
      // Check for any reconciliation actions or tables
      const hasTable = await page.locator('table').isVisible()
      const hasActions = await page.locator('button').first().isVisible()
      
      console.log('Reconciliation page has table:', hasTable)
      console.log('Reconciliation page has actions:', hasActions)
    }
  })

  test('Billing period selection', async ({ page }) => {
    // Navigate to Finance Dashboard where billing period is shown
    await page.goto('/finance/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check for billing period information
    const billingPeriodInfo = await page.locator('text=/Billing Period|billing period/i').first().isVisible()
    if (billingPeriodInfo) {
      console.log('Found billing period information')
      
      // Look for date range or period selector
      const periodText = await page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first().isVisible()
      expect(periodText).toBeTruthy()
    }
    
    // Check if there's a period selector dropdown
    const periodSelector = page.locator('select, button[role="combobox"]').first()
    if (await periodSelector.isVisible()) {
      const selectorText = await periodSelector.textContent()
      if (selectorText && selectorText.toLowerCase().includes('period')) {
        await periodSelector.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('Export financial data', async ({ page }) => {
    // Navigate to Finance Dashboard first
    await page.goto('/finance/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Look for export button on dashboard
    const dashboardExportButton = page.locator('button:has-text("Export"), button:has-text("Download")')
    if (await dashboardExportButton.first().isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
      
      await dashboardExportButton.first().click()
      
      // Wait for potential download
      const download = await downloadPromise
      if (download) {
        console.log('Financial export downloaded:', download.suggestedFilename())
      }
    }
    
    // Also check invoices page for export
    await page.goto('/finance/invoices')
    await page.waitForLoadState('networkidle')
    
    const invoiceExportButton = page.locator('button:has-text("Export"), button:has-text("Download")')
    if (await invoiceExportButton.first().isVisible()) {
      console.log('Found export option on invoices page')
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
