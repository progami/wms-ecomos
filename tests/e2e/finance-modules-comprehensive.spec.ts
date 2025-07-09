import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:3002'
const ADMIN_CREDENTIALS = {
  username: 'demo-admin',
  password: 'SecureWarehouse2024!'
}

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('#emailOrUsername', ADMIN_CREDENTIALS.username)
  await page.fill('#password', ADMIN_CREDENTIALS.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

async function navigateToFinance(page: Page, module: string) {
  await page.click('a[href="/finance"]')
  await page.waitForURL('**/finance')
  if (module) {
    await page.click(`a:has-text("${module}")`)
  }
}

// Test financial calculations
async function verifyCalculation(page: Page, selector: string, expectedPattern: RegExp) {
  const element = page.locator(selector)
  await expect(element).toBeVisible()
  const value = await element.textContent()
  expect(value).toMatch(expectedPattern)
}

// Test currency formatting
async function verifyCurrencyFormat(page: Page, selector: string) {
  const element = page.locator(selector)
  const value = await element.textContent()
  expect(value).toMatch(/^\$[\d,]+(\.\d{2})?$/)
}

test.describe('Finance - Cost Ledger Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToFinance(page, 'Cost Ledger')
  })

  test('Cost ledger overview displays correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Cost Ledger')
    
    // Check summary cards
    await expect(page.locator('text="Total Costs MTD"')).toBeVisible()
    await expect(page.locator('text="Budget Variance"')).toBeVisible()
    await expect(page.locator('text="Cost per Unit"')).toBeVisible()
    await expect(page.locator('text="YoY Change"')).toBeVisible()
    
    // Verify currency formatting
    await verifyCurrencyFormat(page, '[data-testid="total-costs-value"]')
    
    // Check cost categories
    await expect(page.locator('text="Labor Costs"')).toBeVisible()
    await expect(page.locator('text="Equipment Costs"')).toBeVisible()
    await expect(page.locator('text="Facility Costs"')).toBeVisible()
    await expect(page.locator('text="Transportation"')).toBeVisible()
    await expect(page.locator('text="Other Costs"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add Entry")')).toBeVisible()
    await expect(page.locator('button:has-text("Import Costs")')).toBeVisible()
    await expect(page.locator('button:has-text("Export Ledger")')).toBeVisible()
    await expect(page.locator('button:has-text("Run Report")')).toBeVisible()
  })

  test('Add new cost entry', async ({ page }) => {
    await page.click('button:has-text("Add Entry")')
    
    // Check cost entry form
    await expect(page.locator('h2:has-text("Add Cost Entry")')).toBeVisible()
    
    // Fill basic information
    await page.fill('[name="entryDate"]', '2024-01-20')
    await page.selectOption('[name="costCategory"]', 'labor')
    await page.selectOption('[name="costSubCategory"]', 'overtime')
    await page.fill('[name="description"]', 'Weekend overtime for urgent shipment')
    
    // Fill cost details
    await page.fill('[name="amount"]', '2500.00')
    await page.selectOption('[name="currency"]', 'USD')
    await page.selectOption('[name="paymentMethod"]', 'bank-transfer')
    await page.fill('[name="invoiceNumber"]', 'INV-2024-0120')
    
    // Allocate to cost centers
    await page.click('button:has-text("Add Allocation")')
    await page.selectOption('[name="costCenter"]', 'warehouse-a')
    await page.fill('[name="allocationPercentage"]', '60')
    
    await page.click('button:has-text("Add Allocation")')
    await page.selectOption('[name="costCenter"][last]', 'warehouse-b')
    await page.fill('[name="allocationPercentage"][last]', '40')
    
    // Add vendor information
    await page.selectOption('[name="vendor"]', { index: 1 })
    await page.fill('[name="vendorInvoiceDate"]', '2024-01-15')
    await page.fill('[name="dueDate"]', '2024-02-15')
    
    // Add supporting documents
    const docInput = page.locator('input[type="file"][name="supportingDocs"]')
    await docInput.setInputFiles({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('invoice content')
    })
    
    // Add approval workflow
    await page.click('input[name="requiresApproval"]')
    await page.selectOption('[name="approver"]', { index: 1 })
    
    // Save entry
    await page.click('button:has-text("Save Entry")')
    await expect(page.locator('text="Cost entry created"')).toBeVisible()
  })

  test('Cost allocation and distribution', async ({ page }) => {
    // Navigate to allocation settings
    await page.click('button:has-text("Allocation Rules")')
    
    // Check allocation interface
    await expect(page.locator('h2:has-text("Cost Allocation Rules")')).toBeVisible()
    
    // Create new allocation rule
    await page.click('button:has-text("New Rule")')
    
    // Fill rule details
    await page.fill('[name="ruleName"]', 'Facility Cost Distribution')
    await page.selectOption('[name="costType"]', 'facility')
    await page.selectOption('[name="allocationMethod"]', 'square-footage')
    
    // Define allocation targets
    await page.click('button:has-text("Add Target")')
    await page.selectOption('[name="targetDepartment"]', 'receiving')
    await page.fill('[name="squareFootage"]', '5000')
    
    await page.click('button:has-text("Add Target")')
    await page.selectOption('[name="targetDepartment"][last]', 'storage')
    await page.fill('[name="squareFootage"][last]', '15000')
    
    await page.click('button:has-text("Add Target")')
    await page.selectOption('[name="targetDepartment"][last]', 'shipping')
    await page.fill('[name="squareFootage"][last]', '3000')
    
    // Preview allocation
    await page.click('button:has-text("Preview Allocation")')
    await expect(page.locator('text="Allocation Preview"')).toBeVisible()
    await expect(page.locator('text="Receiving: 21.74%"')).toBeVisible()
    await expect(page.locator('text="Storage: 65.22%"')).toBeVisible()
    await expect(page.locator('text="Shipping: 13.04%"')).toBeVisible()
    
    // Save rule
    await page.click('button:has-text("Save Rule")')
    await expect(page.locator('text="Allocation rule saved"')).toBeVisible()
  })

  test('Budget management and tracking', async ({ page }) => {
    // Navigate to budgets
    await page.click('tab:has-text("Budgets")')
    
    // Check budget overview
    await expect(page.locator('text="Budget Overview"')).toBeVisible()
    await expect(page.locator('[data-testid="budget-chart"]')).toBeVisible()
    
    // Create new budget
    await page.click('button:has-text("Create Budget")')
    
    // Fill budget details
    await page.fill('[name="budgetName"]', 'Q1 2024 Operating Budget')
    await page.selectOption('[name="budgetPeriod"]', 'quarterly')
    await page.fill('[name="startDate"]', '2024-01-01')
    await page.fill('[name="endDate"]', '2024-03-31')
    
    // Add budget lines
    const categories = [
      { category: 'Labor', amount: '150000' },
      { category: 'Equipment', amount: '25000' },
      { category: 'Facility', amount: '50000' },
      { category: 'Transportation', amount: '75000' },
      { category: 'Supplies', amount: '20000' }
    ]
    
    for (const item of categories) {
      await page.click('button:has-text("Add Line Item")')
      await page.fill('[name="lineCategory"][last]', item.category)
      await page.fill('[name="lineAmount"][last]', item.amount)
    }
    
    // Set budget alerts
    await page.click('input[name="enableAlerts"]')
    await page.fill('[name="alertThreshold"]', '80')
    await page.fill('[name="alertEmail"]', 'finance@example.com')
    
    // Save budget
    await page.click('button:has-text("Save Budget")')
    await expect(page.locator('text="Budget created"')).toBeVisible()
    
    // Check budget tracking
    await expect(page.locator('text="Budget vs Actual"')).toBeVisible()
    await expect(page.locator('[data-testid="variance-chart"]')).toBeVisible()
  })

  test('Cost analysis and reporting', async ({ page }) => {
    // Navigate to analysis
    await page.click('tab:has-text("Analysis")')
    
    // Check analysis dashboard
    await expect(page.locator('text="Cost Analysis"')).toBeVisible()
    await expect(page.locator('[data-testid="cost-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible()
    
    // Apply filters
    await page.fill('[name="dateFrom"]', '2024-01-01')
    await page.fill('[name="dateTo"]', '2024-01-31')
    await page.selectOption('[name="warehouse"]', { index: 1 })
    await page.selectOption('[name="category"]', 'labor')
    await page.click('button:has-text("Apply Filters")')
    await page.waitForTimeout(500)
    
    // Check drill-down capability
    await page.click('[data-testid="cost-breakdown-chart"] [data-category="labor"]')
    await expect(page.locator('text="Labor Cost Details"')).toBeVisible()
    await expect(page.locator('text="Regular Hours"')).toBeVisible()
    await expect(page.locator('text="Overtime"')).toBeVisible()
    await expect(page.locator('text="Benefits"')).toBeVisible()
    
    // Generate report
    await page.click('button:has-text("Generate Report")')
    
    // Configure report
    await expect(page.locator('h3:has-text("Cost Report Configuration")')).toBeVisible()
    await page.selectOption('[name="reportType"]', 'detailed')
    await page.click('input[name="includeCharts"]')
    await page.click('input[name="includeComparisons"]')
    await page.click('input[name="includeTrends"]')
    
    // Generate
    await page.click('button:has-text("Generate")')
    await expect(page.locator('text="Report generated"')).toBeVisible()
  })

  test('Vendor cost management', async ({ page }) => {
    // Navigate to vendors
    await page.click('button:has-text("Vendor Costs")')
    
    // Check vendor list
    await expect(page.locator('h2:has-text("Vendor Cost Management")')).toBeVisible()
    await expect(page.locator('[data-testid="vendor-table"]')).toBeVisible()
    
    // Add new vendor
    await page.click('button:has-text("Add Vendor")')
    
    // Fill vendor details
    await page.fill('[name="vendorName"]', 'ABC Logistics')
    await page.fill('[name="vendorCode"]', 'VEN-001')
    await page.selectOption('[name="vendorType"]', 'transportation')
    await page.fill('[name="contactEmail"]', 'billing@abclogistics.com')
    await page.fill('[name="paymentTerms"]', 'Net 30')
    
    // Set cost rates
    await page.click('button:has-text("Add Rate")')
    await page.selectOption('[name="serviceType"]', 'ltl-shipping')
    await page.fill('[name="baseRate"]', '2.50')
    await page.selectOption('[name="rateUnit"]', 'per-mile')
    await page.fill('[name="minimumCharge"]', '150')
    
    // Add fuel surcharge
    await page.click('input[name="hasFuelSurcharge"]')
    await page.fill('[name="fuelSurchargePercent"]', '15')
    
    // Save vendor
    await page.click('button:has-text("Save Vendor")')
    await expect(page.locator('text="Vendor added"')).toBeVisible()
    
    // View vendor performance
    await page.click('[data-testid="vendor-row"]:first-child button:has-text("Performance")')
    await expect(page.locator('h3:has-text("Vendor Performance")')).toBeVisible()
    await expect(page.locator('text="Cost Trend"')).toBeVisible()
    await expect(page.locator('text="Invoice Accuracy"')).toBeVisible()
    await expect(page.locator('text="Payment History"')).toBeVisible()
  })

  test('Cost approval workflow', async ({ page }) => {
    // Navigate to approvals
    await page.click('button:has-text("Pending Approvals")')
    
    // Check approval queue
    await expect(page.locator('h2:has-text("Cost Approvals")')).toBeVisible()
    await expect(page.locator('[data-testid="approval-queue"]')).toBeVisible()
    
    // Review cost entry
    await page.click('[data-testid="approval-item"]:first-child button:has-text("Review")')
    
    // Check approval details
    await expect(page.locator('h3:has-text("Cost Approval")')).toBeVisible()
    await expect(page.locator('text="Cost Details"')).toBeVisible()
    await expect(page.locator('text="Supporting Documents"')).toBeVisible()
    await expect(page.locator('text="Budget Impact"')).toBeVisible()
    
    // Verify budget availability
    const budgetStatus = page.locator('[data-testid="budget-status"]')
    await expect(budgetStatus).toBeVisible()
    
    // Add approval notes
    await page.fill('textarea[name="approvalNotes"]', 'Approved - within budget limits')
    
    // Approve
    await page.click('button:has-text("Approve")')
    await expect(page.locator('text="Cost approved"')).toBeVisible()
    
    // Test rejection flow
    await page.click('[data-testid="approval-item"]:first-child button:has-text("Review")')
    await page.fill('textarea[name="rejectionReason"]', 'Exceeds budget allocation')
    await page.click('button:has-text("Reject")')
    await expect(page.locator('text="Cost rejected"')).toBeVisible()
  })

  test('Cost reconciliation', async ({ page }) => {
    // Navigate to reconciliation
    await page.click('button:has-text("Reconciliation")')
    
    // Check reconciliation interface
    await expect(page.locator('h2:has-text("Cost Reconciliation")')).toBeVisible()
    
    // Upload bank statement
    await page.click('button:has-text("Upload Statement")')
    const statementInput = page.locator('input[type="file"][name="bankStatement"]')
    await statementInput.setInputFiles({
      name: 'bank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Description,Amount\n2024-01-20,Vendor Payment,-2500.00')
    })
    
    // Process reconciliation
    await page.click('button:has-text("Process")')
    await page.waitForTimeout(1000)
    
    // Check matching results
    await expect(page.locator('text="Reconciliation Results"')).toBeVisible()
    await expect(page.locator('text="Matched Transactions"')).toBeVisible()
    await expect(page.locator('text="Unmatched Items"')).toBeVisible()
    
    // Manual match
    const unmatchedItem = page.locator('[data-testid="unmatched-item"]:first-child')
    if (await unmatchedItem.isVisible()) {
      await unmatchedItem.click()
      await page.click('button:has-text("Find Match")')
      await page.click('[data-testid="potential-match"]:first-child')
      await page.click('button:has-text("Confirm Match")')
      await expect(page.locator('text="Match confirmed"')).toBeVisible()
    }
    
    // Complete reconciliation
    await page.click('button:has-text("Complete Reconciliation")')
    await expect(page.locator('text="Reconciliation completed"')).toBeVisible()
  })

  test('Cost forecasting', async ({ page }) => {
    // Navigate to forecasting
    await page.click('button:has-text("Forecasting")')
    
    // Check forecasting interface
    await expect(page.locator('h2:has-text("Cost Forecasting")')).toBeVisible()
    
    // Configure forecast
    await page.selectOption('[name="forecastPeriod"]', '6months')
    await page.selectOption('[name="forecastMethod"]', 'moving-average')
    await page.click('input[name="includeSeasonality"]')
    await page.click('input[name="includeGrowthRate"]')
    await page.fill('[name="growthRate"]', '5')
    
    // Run forecast
    await page.click('button:has-text("Generate Forecast")')
    await page.waitForTimeout(1500)
    
    // Check forecast results
    await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible()
    await expect(page.locator('text="Forecast Summary"')).toBeVisible()
    await expect(page.locator('text="Confidence Interval"')).toBeVisible()
    
    // Adjust scenarios
    await page.click('button:has-text("Scenarios")')
    await page.selectOption('[name="scenario"]', 'best-case')
    await page.waitForTimeout(500)
    await page.selectOption('[name="scenario"]', 'worst-case')
    await page.waitForTimeout(500)
    
    // Save forecast
    await page.click('button:has-text("Save Forecast")')
    await expect(page.locator('text="Forecast saved"')).toBeVisible()
  })
})

test.describe('Finance - Storage Ledger Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToFinance(page, 'Storage Ledger')
  })

  test('Storage ledger overview displays correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Storage Ledger')
    
    // Check summary metrics
    await expect(page.locator('text="Total Storage Revenue"')).toBeVisible()
    await expect(page.locator('text="Occupied Space"')).toBeVisible()
    await expect(page.locator('text="Revenue per Sq Ft"')).toBeVisible()
    await expect(page.locator('text="Outstanding Charges"')).toBeVisible()
    
    // Verify currency formatting
    await verifyCurrencyFormat(page, '[data-testid="storage-revenue-value"]')
    
    // Check storage types
    await expect(page.locator('text="Standard Storage"')).toBeVisible()
    await expect(page.locator('text="Temperature Controlled"')).toBeVisible()
    await expect(page.locator('text="Hazmat Storage"')).toBeVisible()
    await expect(page.locator('text="Bulk Storage"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Calculate Charges")')).toBeVisible()
    await expect(page.locator('button:has-text("Generate Invoices")')).toBeVisible()
    await expect(page.locator('button:has-text("Rate Management")')).toBeVisible()
  })

  test('Storage rate configuration', async ({ page }) => {
    await page.click('button:has-text("Rate Management")')
    
    // Check rate management interface
    await expect(page.locator('h2:has-text("Storage Rate Management")')).toBeVisible()
    
    // Create new rate structure
    await page.click('button:has-text("New Rate Structure")')
    
    // Fill rate details
    await page.fill('[name="rateName"]', 'Standard Pallet Storage 2024')
    await page.selectOption('[name="storageType"]', 'pallet')
    await page.selectOption('[name="billingMethod"]', 'daily')
    await page.fill('[name="baseRate"]', '1.50')
    await page.selectOption('[name="currency"]', 'USD')
    
    // Add tier pricing
    await page.click('input[name="enableTierPricing"]')
    
    await page.click('button:has-text("Add Tier")')
    await page.fill('[name="tierMin"]', '1')
    await page.fill('[name="tierMax"]', '100')
    await page.fill('[name="tierRate"]', '1.50')
    
    await page.click('button:has-text("Add Tier")')
    await page.fill('[name="tierMin"][last]', '101')
    await page.fill('[name="tierMax"][last]', '500')
    await page.fill('[name="tierRate"][last]', '1.25')
    
    await page.click('button:has-text("Add Tier")')
    await page.fill('[name="tierMin"][last]', '501')
    await page.fill('[name="tierMax"][last]', '999999')
    await page.fill('[name="tierRate"][last]', '1.00')
    
    // Add minimum charges
    await page.click('input[name="hasMinimumCharge"]')
    await page.fill('[name="minimumCharge"]', '100')
    await page.selectOption('[name="minimumPeriod"]', 'monthly')
    
    // Set effective dates
    await page.fill('[name="effectiveFrom"]', '2024-02-01')
    await page.fill('[name="effectiveTo"]', '2024-12-31')
    
    // Save rate structure
    await page.click('button:has-text("Save Rate Structure")')
    await expect(page.locator('text="Rate structure saved"')).toBeVisible()
  })

  test('Calculate storage charges', async ({ page }) => {
    await page.click('button:has-text("Calculate Charges")')
    
    // Check calculation interface
    await expect(page.locator('h2:has-text("Calculate Storage Charges")')).toBeVisible()
    
    // Select calculation period
    await page.fill('[name="calculationMonth"]', '2024-01')
    await page.selectOption('[name="warehouse"]', { index: 1 })
    
    // Configure calculation options
    await page.click('input[name="includeHandling"]')
    await page.click('input[name="includeAccessorial"]')
    await page.click('input[name="applyMinimums"]')
    
    // Preview calculation
    await page.click('button:has-text("Preview Calculation")')
    await page.waitForTimeout(1000)
    
    // Check preview results
    await expect(page.locator('text="Calculation Preview"')).toBeVisible()
    await expect(page.locator('text="Total Customers"')).toBeVisible()
    await expect(page.locator('text="Total Charges"')).toBeVisible()
    await expect(page.locator('[data-testid="charge-breakdown-table"]')).toBeVisible()
    
    // Review sample charges
    await page.click('[data-testid="customer-charge"]:first-child button:has-text("Details")')
    await expect(page.locator('h3:has-text("Charge Details")')).toBeVisible()
    await expect(page.locator('text="Storage Days"')).toBeVisible()
    await expect(page.locator('text="Average Pallets"')).toBeVisible()
    await expect(page.locator('text="Rate Applied"')).toBeVisible()
    
    // Approve and process
    await page.click('button:has-text("Close")')
    await page.click('button:has-text("Process Charges")')
    await expect(page.locator('text="Processing charges"')).toBeVisible()
    await expect(page.locator('text="Charges calculated successfully"')).toBeVisible({ timeout: 10000 })
  })

  test('Storage invoice generation', async ({ page }) => {
    await page.click('button:has-text("Generate Invoices")')
    
    // Check invoice generation interface
    await expect(page.locator('h2:has-text("Generate Storage Invoices")')).toBeVisible()
    
    // Select invoicing period
    await page.fill('[name="invoiceMonth"]', '2024-01')
    await page.selectOption('[name="invoiceType"]', 'monthly')
    
    // Filter customers
    await page.click('input[name="allCustomers"]')
    
    // Configure invoice options
    await page.click('input[name="consolidateInvoices"]')
    await page.click('input[name="includeDetails"]')
    await page.selectOption('[name="invoiceFormat"]', 'detailed')
    
    // Add invoice message
    await page.fill('textarea[name="invoiceMessage"]', 'Thank you for your business!')
    
    // Preview invoices
    await page.click('button:has-text("Preview Invoices")')
    await page.waitForTimeout(1000)
    
    // Check preview
    await expect(page.locator('text="Invoice Preview"')).toBeVisible()
    await expect(page.locator('[data-testid="invoice-preview-list"]')).toBeVisible()
    
    // Review sample invoice
    await page.click('[data-testid="invoice-preview"]:first-child button:has-text("View")')
    await expect(page.locator('h3:has-text("Invoice Preview")')).toBeVisible()
    await expect(page.locator('text="Invoice Number"')).toBeVisible()
    await expect(page.locator('text="Bill To"')).toBeVisible()
    await expect(page.locator('text="Line Items"')).toBeVisible()
    await expect(page.locator('text="Total Due"')).toBeVisible()
    
    // Generate invoices
    await page.click('button:has-text("Close Preview")')
    await page.click('button:has-text("Generate Invoices")')
    await expect(page.locator('text="Generating invoices"')).toBeVisible()
    await expect(page.locator('text="Invoices generated successfully"')).toBeVisible({ timeout: 10000 })
  })

  test('Customer storage agreements', async ({ page }) => {
    // Navigate to agreements
    await page.click('button:has-text("Agreements")')
    
    // Check agreements interface
    await expect(page.locator('h2:has-text("Storage Agreements")')).toBeVisible()
    
    // Create new agreement
    await page.click('button:has-text("New Agreement")')
    
    // Fill agreement details
    await page.selectOption('[name="customer"]', { index: 1 })
    await page.fill('[name="agreementNumber"]', 'SA-2024-001')
    await page.fill('[name="startDate"]', '2024-02-01')
    await page.fill('[name="endDate"]', '2025-01-31')
    
    // Set storage terms
    await page.selectOption('[name="storageType"]', 'dedicated')
    await page.fill('[name="dedicatedSpace"]', '5000')
    await page.selectOption('[name="spaceUnit"]', 'sqft')
    await page.fill('[name="monthlyRate"]', '2500')
    
    // Add special terms
    await page.click('button:has-text("Add Special Term")')
    await page.fill('[name="termDescription"]', 'Free handling for first 100 pallets per month')
    
    // Set billing terms
    await page.selectOption('[name="billingCycle"]', 'monthly')
    await page.selectOption('[name="paymentTerms"]', 'net-30')
    await page.click('input[name="autoRenewal"]')
    
    // Upload agreement document
    const agreementDoc = page.locator('input[type="file"][name="agreementDocument"]')
    await agreementDoc.setInputFiles({
      name: 'storage-agreement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('agreement content')
    })
    
    // Save agreement
    await page.click('button:has-text("Save Agreement")')
    await expect(page.locator('text="Agreement saved"')).toBeVisible()
  })

  test('Storage utilization tracking', async ({ page }) => {
    // Navigate to utilization
    await page.click('tab:has-text("Utilization")')
    
    // Check utilization dashboard
    await expect(page.locator('text="Storage Utilization"')).toBeVisible()
    await expect(page.locator('[data-testid="utilization-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="utilization-heatmap"]')).toBeVisible()
    
    // Check utilization metrics
    await expect(page.locator('text="Current Utilization"')).toBeVisible()
    await expect(page.locator('text="Peak Utilization"')).toBeVisible()
    await expect(page.locator('text="Average Utilization"')).toBeVisible()
    
    // Filter by warehouse
    await page.selectOption('[name="utilizationWarehouse"]', { index: 1 })
    await page.waitForTimeout(500)
    
    // View zone details
    await page.click('[data-testid="zone-utilization"]:first-child')
    await expect(page.locator('h3:has-text("Zone Details")')).toBeVisible()
    await expect(page.locator('text="Total Locations"')).toBeVisible()
    await expect(page.locator('text="Occupied Locations"')).toBeVisible()
    await expect(page.locator('text="Revenue per Location"')).toBeVisible()
    
    // Check customer breakdown
    await page.click('button:has-text("Customer Breakdown")')
    await expect(page.locator('[data-testid="customer-space-chart"]')).toBeVisible()
  })

  test('Billing adjustments and credits', async ({ page }) => {
    // Navigate to adjustments
    await page.click('button:has-text("Adjustments")')
    
    // Check adjustments interface
    await expect(page.locator('h2:has-text("Billing Adjustments")')).toBeVisible()
    
    // Create adjustment
    await page.click('button:has-text("New Adjustment")')
    
    // Fill adjustment details
    await page.selectOption('[name="adjustmentType"]', 'credit')
    await page.selectOption('[name="customer"]', { index: 1 })
    await page.fill('[name="adjustmentAmount"]', '150.00')
    await page.selectOption('[name="adjustmentReason"]', 'service-issue')
    await page.fill('textarea[name="adjustmentNotes"]', 'Credit for damaged goods during storage')
    
    // Link to invoice
    await page.selectOption('[name="relatedInvoice"]', { index: 1 })
    
    // Require approval
    await page.click('input[name="requiresApproval"]')
    await page.selectOption('[name="approver"]', { index: 1 })
    
    // Save adjustment
    await page.click('button:has-text("Save Adjustment")')
    await expect(page.locator('text="Adjustment created"')).toBeVisible()
  })

  test('Storage revenue analytics', async ({ page }) => {
    // Navigate to analytics
    await page.click('tab:has-text("Analytics")')
    
    // Check analytics dashboard
    await expect(page.locator('text="Revenue Analytics"')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-by-type-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-revenue-chart"]')).toBeVisible()
    
    // Apply date range
    await page.fill('[name="analyticsStartDate"]', '2024-01-01')
    await page.fill('[name="analyticsEndDate"]', '2024-01-31')
    await page.click('button:has-text("Apply")')
    await page.waitForTimeout(500)
    
    // Check revenue metrics
    await expect(page.locator('text="Total Revenue"')).toBeVisible()
    await expect(page.locator('text="Average Revenue per Customer"')).toBeVisible()
    await expect(page.locator('text="Revenue Growth"')).toBeVisible()
    
    // Drill down by customer
    await page.click('[data-testid="customer-revenue-chart"] [data-customer]')
    await expect(page.locator('h3:has-text("Customer Revenue Details")')).toBeVisible()
    await expect(page.locator('text="Monthly Trend"')).toBeVisible()
    await expect(page.locator('text="Service Breakdown"')).toBeVisible()
    
    // Generate revenue report
    await page.click('button:has-text("Generate Report")')
    await page.selectOption('[name="reportType"]', 'executive-summary')
    await page.click('button:has-text("Generate")')
    await expect(page.locator('text="Report generated"')).toBeVisible()
  })

  test('Accounts receivable management', async ({ page }) => {
    // Navigate to AR
    await page.click('button:has-text("Accounts Receivable")')
    
    // Check AR dashboard
    await expect(page.locator('h2:has-text("Accounts Receivable")')).toBeVisible()
    await expect(page.locator('text="Outstanding Balance"')).toBeVisible()
    await expect(page.locator('text="Current"')).toBeVisible()
    await expect(page.locator('text="30 Days"')).toBeVisible()
    await expect(page.locator('text="60 Days"')).toBeVisible()
    await expect(page.locator('text="90+ Days"')).toBeVisible()
    
    // Check aging report
    await expect(page.locator('[data-testid="aging-chart"]')).toBeVisible()
    
    // View customer details
    await page.click('[data-testid="ar-customer"]:first-child')
    await expect(page.locator('h3:has-text("Customer Account")')).toBeVisible()
    await expect(page.locator('text="Outstanding Invoices"')).toBeVisible()
    await expect(page.locator('text="Payment History"')).toBeVisible()
    
    // Record payment
    await page.click('button:has-text("Record Payment")')
    await page.fill('[name="paymentAmount"]', '2500.00')
    await page.selectOption('[name="paymentMethod"]', 'check')
    await page.fill('[name="checkNumber"]', '12345')
    await page.fill('[name="paymentDate"]', '2024-01-20')
    
    // Apply to invoices
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    
    // Save payment
    await page.click('button:has-text("Apply Payment")')
    await expect(page.locator('text="Payment recorded"')).toBeVisible()
    
    // Send statement
    await page.click('button:has-text("Send Statement")')
    await page.click('input[name="includeAging"]')
    await page.click('button:has-text("Send")')
    await expect(page.locator('text="Statement sent"')).toBeVisible()
  })
})

test.describe('Finance - Integration & Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToFinance(page, '')
  })

  test('Financial system integration', async ({ page }) => {
    // Navigate to integrations
    await page.click('button:has-text("Integrations")')
    
    // Check integration options
    await expect(page.locator('h2:has-text("Financial Integrations")')).toBeVisible()
    await expect(page.locator('text="Accounting Systems"')).toBeVisible()
    await expect(page.locator('text="ERP Integration"')).toBeVisible()
    await expect(page.locator('text="Banking Integration"')).toBeVisible()
    
    // Configure accounting integration
    await page.click('button:has-text("Configure"):near(:text("QuickBooks"))')
    
    // Fill integration details
    await page.fill('[name="companyId"]', 'QB-12345')
    await page.fill('[name="apiKey"]', 'test-api-key')
    await page.fill('[name="apiSecret"]', 'test-api-secret')
    
    // Map accounts
    await page.click('button:has-text("Map Accounts")')
    await page.selectOption('[name="revenueAccount"]', '4000 - Sales Revenue')
    await page.selectOption('[name="arAccount"]', '1200 - Accounts Receivable')
    await page.selectOption('[name="apAccount"]', '2000 - Accounts Payable')
    
    // Test connection
    await page.click('button:has-text("Test Connection")')
    await expect(page.locator('text="Connection successful"')).toBeVisible()
    
    // Configure sync settings
    await page.click('input[name="autoSync"]')
    await page.selectOption('[name="syncFrequency"]', 'daily')
    await page.fill('[name="syncTime"]', '02:00')
    
    // Save integration
    await page.click('button:has-text("Save Integration")')
    await expect(page.locator('text="Integration configured"')).toBeVisible()
  })

  test('Tax compliance and reporting', async ({ page }) => {
    // Navigate to tax settings
    await page.click('button:has-text("Tax Settings")')
    
    // Check tax configuration
    await expect(page.locator('h2:has-text("Tax Configuration")')).toBeVisible()
    
    // Add tax jurisdiction
    await page.click('button:has-text("Add Jurisdiction")')
    await page.selectOption('[name="taxState"]', 'CA')
    await page.fill('[name="stateTaxRate"]', '7.25')
    await page.fill('[name="countyTaxRate"]', '1.0')
    await page.fill('[name="cityTaxRate"]', '0.5')
    
    // Configure tax rules
    await page.click('input[name="taxOnStorage"]')
    await page.click('input[name="taxOnHandling"]')
    await page.selectOption('[name="taxCalculationMethod"]', 'destination-based')
    
    // Add exemptions
    await page.click('button:has-text("Add Exemption")')
    await page.selectOption('[name="exemptCustomer"]', { index: 1 })
    await page.fill('[name="exemptionNumber"]', 'EX-12345')
    await page.fill('[name="exemptionExpiry"]', '2024-12-31')
    
    // Save tax settings
    await page.click('button:has-text("Save Tax Settings")')
    await expect(page.locator('text="Tax settings saved"')).toBeVisible()
    
    // Generate tax report
    await page.click('button:has-text("Tax Reports")')
    await page.selectOption('[name="taxReportType"]', 'sales-tax')
    await page.fill('[name="taxPeriod"]', '2024-01')
    await page.click('button:has-text("Generate")')
    await expect(page.locator('text="Tax report generated"')).toBeVisible()
  })

  test('Audit trail and compliance', async ({ page }) => {
    // Navigate to audit trail
    await page.click('button:has-text("Audit Trail")')
    
    // Check audit interface
    await expect(page.locator('h2:has-text("Financial Audit Trail")')).toBeVisible()
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible()
    
    // Filter audit entries
    await page.fill('[name="auditDateFrom"]', '2024-01-01')
    await page.fill('[name="auditDateTo"]', '2024-01-31')
    await page.selectOption('[name="auditModule"]', 'invoicing')
    await page.selectOption('[name="auditAction"]', 'create')
    await page.click('button:has-text("Apply Filters")')
    await page.waitForTimeout(500)
    
    // View audit details
    await page.click('[data-testid="audit-entry"]:first-child button:has-text("Details")')
    await expect(page.locator('h3:has-text("Audit Details")')).toBeVisible()
    await expect(page.locator('text="User"')).toBeVisible()
    await expect(page.locator('text="Timestamp"')).toBeVisible()
    await expect(page.locator('text="Changes"')).toBeVisible()
    await expect(page.locator('text="Before"')).toBeVisible()
    await expect(page.locator('text="After"')).toBeVisible()
    
    // Export audit report
    await page.click('button:has-text("Export Audit Report")')
    await page.selectOption('[name="auditFormat"]', 'csv')
    await page.click('button:has-text("Export")')
    await expect(page.locator('text="Audit report exported"')).toBeVisible()
  })

  test('Financial dashboards and KPIs', async ({ page }) => {
    // Check main financial dashboard
    await expect(page.locator('h1:has-text("Financial Overview")')).toBeVisible()
    
    // Check KPI cards
    await expect(page.locator('text="Revenue YTD"')).toBeVisible()
    await expect(page.locator('text="Expenses YTD"')).toBeVisible()
    await expect(page.locator('text="Net Profit Margin"')).toBeVisible()
    await expect(page.locator('text="Cash Flow"')).toBeVisible()
    await expect(page.locator('text="DSO"')).toBeVisible()
    await expect(page.locator('text="Working Capital"')).toBeVisible()
    
    // Check interactive charts
    const charts = [
      'revenue-expense-trend',
      'cash-flow-chart',
      'profitability-chart',
      'budget-variance-chart'
    ]
    
    for (const chart of charts) {
      await expect(page.locator(`[data-testid="${chart}"]`)).toBeVisible()
    }
    
    // Test chart interactions
    await page.click('[data-testid="revenue-expense-trend"] [data-month="January"]')
    await expect(page.locator('text="January Details"')).toBeVisible()
    
    // Customize dashboard
    await page.click('button:has-text("Customize Dashboard")')
    await page.click('input[name="showCashFlow"]')
    await page.click('input[name="showBudgetVariance"]')
    await page.dragAndDrop('[data-widget="dso"]', '[data-widget="revenue"]')
    await page.click('button:has-text("Save Layout")')
    await expect(page.locator('text="Dashboard customized"')).toBeVisible()
  })
})

test.describe('Finance - Accessibility & Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToFinance(page, '')
  })

  test('Keyboard navigation', async ({ page }) => {
    // Tab through main navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    
    // Test form navigation
    const form = page.locator('form').first()
    if (await form.isVisible()) {
      await form.locator('input').first().focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Check focus visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return el?.tagName
      })
      expect(focusedElement).toBeTruthy()
    }
  })

  test('Screen reader compatibility', async ({ page }) => {
    // Check ARIA labels on buttons
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      expect(ariaLabel || text).toBeTruthy()
    }
    
    // Check form labels
    const inputs = await page.locator('input:not([type="hidden"])').all()
    for (const input of inputs.slice(0, 5)) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count()
        expect(label).toBeGreaterThan(0)
      }
    }
    
    // Check table accessibility
    const tables = await page.locator('table').all()
    for (const table of tables) {
      const caption = await table.locator('caption').count()
      const ariaLabel = await table.getAttribute('aria-label')
      expect(caption > 0 || ariaLabel).toBeTruthy()
    }
  })

  test('Responsive design for financial data', async ({ page }) => {
    // Test different viewports
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(300)
      
      // Check financial tables adapt
      const table = page.locator('table').first()
      if (await table.isVisible()) {
        const tableWidth = await table.evaluate(el => el.scrollWidth)
        expect(tableWidth).toBeLessThanOrEqual(viewport.width + 50) // Allow some overflow
      }
      
      // Check cards stack on mobile
      if (viewport.width < 768) {
        const cards = await page.locator('[data-testid*="card"]').all()
        if (cards.length > 1) {
          const firstBox = await cards[0].boundingBox()
          const secondBox = await cards[1].boundingBox()
          if (firstBox && secondBox) {
            expect(secondBox.y).toBeGreaterThan(firstBox.y)
          }
        }
      }
    }
  })

  test('Number formatting and localization', async ({ page }) => {
    // Check currency formatting
    const currencyElements = await page.locator('[data-format="currency"]').all()
    for (const element of currencyElements.slice(0, 5)) {
      const text = await element.textContent()
      expect(text).toMatch(/^\$[\d,]+(\.\d{2})?$/)
    }
    
    // Check percentage formatting
    const percentElements = await page.locator('[data-format="percent"]').all()
    for (const element of percentElements.slice(0, 5)) {
      const text = await element.textContent()
      expect(text).toMatch(/^\d+(\.\d+)?%$/)
    }
    
    // Check date formatting
    const dateElements = await page.locator('[data-format="date"]').all()
    for (const element of dateElements.slice(0, 5)) {
      const text = await element.textContent()
      expect(text).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
    }
  })

  test('Print optimization for financial reports', async ({ page }) => {
    // Navigate to a report
    const reportsButton = page.locator('button:has-text("Reports")').first();
    await reportsButton.click();
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' })
    
    // Check print-specific styling
    const noPrintElements = await page.locator('.no-print').count()
    const printOnlyElements = await page.locator('.print-only').count()
    
    // Reset media
    await page.emulateMedia({ media: 'screen' })
    
    // Test print preview
    const printButton = page.locator('button:has-text("Print")')
    if (await printButton.isVisible()) {
      // Mock print dialog
      page.on('dialog', dialog => dialog.accept())
      await printButton.click()
    }
  })

  test('Data export functionality', async ({ page }) => {
    // Test various export options
    const exportButton = page.locator('button:has-text("Export")').first()
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Check export formats
      await expect(page.locator('text="Export Format"')).toBeVisible()
      await expect(page.locator('input[value="csv"]')).toBeVisible()
      await expect(page.locator('input[value="excel"]')).toBeVisible()
      await expect(page.locator('input[value="pdf"]')).toBeVisible()
      
      // Test CSV export
      await page.click('input[value="csv"]')
      await page.click('button:has-text("Download")')
      
      // Verify download initiated
      await expect(page.locator('text="Export started"').or(page.locator('text="Download complete"'))).toBeVisible()
    }
  })

  test('Real-time data updates', async ({ page }) => {
    // Check for real-time indicators
    const liveIndicators = await page.locator('[data-live="true"], .live-data').count()
    
    if (liveIndicators > 0) {
      // Wait for an update
      const initialValue = await page.locator('[data-live="true"]').first().textContent()
      await page.waitForTimeout(5000)
      const updatedValue = await page.locator('[data-live="true"]').first().textContent()
      
      // Values might or might not change, but element should still be present
      await expect(page.locator('[data-live="true"]').first()).toBeVisible()
    }
    
    // Test manual refresh
    const refreshButton = page.locator('button[aria-label="Refresh"]')
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      await expect(page.locator('.loading, [aria-busy="true"]')).toBeVisible()
      await expect(page.locator('.loading, [aria-busy="true"]')).not.toBeVisible({ timeout: 5000 })
    }
  })
})