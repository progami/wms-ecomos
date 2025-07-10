import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

// Helper to setup demo and login
async function setupAndLogin(page: any) {
  // Setup demo if needed
  const response = await page.request.get(`${BASE_URL}/api/demo/status`)
  const status = await response.json()
  
  if (!status.isDemoMode) {
    await page.request.post(`${BASE_URL}/api/demo/setup`)
  }
  
  // Login as demo admin
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('#emailOrUsername', 'demo-admin')
  await page.fill('#password', 'SecureWarehouse2024!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

test.describe('📦 Complete Receiving Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Receive new inventory with all details', async ({ page }) => {
    // Navigate to receive goods
    await page.click('text="Receive Goods"')
    await expect(page.locator('h1:has-text("Receive Goods")')).toBeVisible()
    
    // Fill in receiving form
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.selectOption('select[name="customer"]', { index: 1 })
    
    // Add items to receive
    await page.click('button:has-text("Add Item")')
    
    // Fill item details
    await page.selectOption('select[name="sku"]', { index: 1 })
    await page.fill('input[name="quantity"]', '100')
    await page.fill('input[name="batchLot"]', 'TEST-BATCH-001')
    await page.fill('input[name="expiryDate"]', '2025-12-31')
    
    // Add tracking information
    await page.fill('input[name="trackingNumber"]', 'ASN-TEST-001')
    await page.fill('input[name="poNumber"]', 'PO-2024-001')
    await page.fill('textarea[name="notes"]', 'Test receiving workflow')
    
    // Submit receiving
    await page.click('button:has-text("Submit")')
    
    // Verify success message
    await expect(page.locator('text="Successfully received"')).toBeVisible({ timeout: 10000 })
    
    // Verify inventory updated
    await page.click('text="Inventory Ledger"')
    await expect(page.locator('text="TEST-BATCH-001"')).toBeVisible()
  })

  test('Receive with pallet configuration', async ({ page }) => {
    await page.goto(`${BASE_URL}/operations/receive`)
    
    // Select warehouse and customer
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.selectOption('select[name="customer"]', { index: 1 })
    
    // Configure pallet settings
    await page.click('text="Pallet Configuration"')
    await page.fill('input[name="cartonsPerPallet"]', '48')
    await page.fill('input[name="palletHeight"]', '180')
    
    // Add multiple SKUs
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Item")')
      await page.selectOption(`select[name="sku-${i}"]`, { index: i + 1 })
      await page.fill(`input[name="quantity-${i}"]`, String(50 + i * 10))
      await page.fill(`input[name="batchLot-${i}"]`, `PALLET-BATCH-${i + 1}`)
    }
    
    // Submit and verify
    await page.click('button:has-text("Submit")')
    await expect(page.locator('text="Successfully received"')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('🚚 Complete Shipping Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Ship order with inventory validation', async ({ page }) => {
    // Navigate to ship goods
    await page.click('text="Ship Goods"')
    await expect(page.locator('h1:has-text("Ship Goods")')).toBeVisible()
    
    // Create shipment
    await page.fill('input[name="orderNumber"]', 'ORD-2024-001')
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.selectOption('select[name="customer"]', { index: 1 })
    
    // Add shipping details
    await page.fill('input[name="shipTo"]', 'Test Customer')
    await page.fill('textarea[name="shipAddress"]', '123 Test Street, London, UK')
    
    // Add items to ship
    await page.click('button:has-text("Add Item")')
    await page.selectOption('select[name="sku"]', { index: 1 })
    
    // Check available inventory
    const availableQty = await page.locator('text="Available:"').textContent()
    
    // Try to ship within available quantity
    await page.fill('input[name="quantity"]', '10')
    
    // Add shipping information
    await page.selectOption('select[name="carrier"]', 'DHL')
    await page.fill('input[name="trackingNumber"]', 'DHL1234567890')
    await page.fill('input[name="shipDate"]', new Date().toISOString().split('T')[0])
    
    // Submit shipment
    await page.click('button:has-text("Ship")')
    
    // Verify success
    await expect(page.locator('text="Shipment created successfully"')).toBeVisible({ timeout: 10000 })
    
    // Verify inventory decreased
    await page.click('text="Inventory Ledger"')
    await expect(page.locator('text="SHIP"')).toBeVisible()
  })

  test('Multi-warehouse shipment', async ({ page }) => {
    await page.goto(`${BASE_URL}/operations/ship`)
    
    // Create complex shipment from multiple warehouses
    await page.fill('input[name="orderNumber"]', 'ORD-MULTI-001')
    
    // Enable multi-warehouse mode
    await page.click('input[name="multiWarehouse"]')
    
    // Add items from different warehouses
    const warehouses = ['LON-01', 'MAN-01']
    
    for (let i = 0; i < warehouses.length; i++) {
      await page.click('button:has-text("Add Location")')
      await page.selectOption(`select[name="warehouse-${i}"]`, warehouses[i])
      
      // Add items for this warehouse
      await page.click(`button:has-text("Add Item to ${warehouses[i]}")`)
      await page.selectOption(`select[name="sku-${i}-0"]`, { index: 1 })
      await page.fill(`input[name="quantity-${i}-0"]`, '5')
    }
    
    // Submit multi-warehouse shipment
    await page.click('button:has-text("Create Shipments")')
    await expect(page.locator('text="shipments created"')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('💰 Invoice Generation & Reconciliation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Generate monthly invoice', async ({ page }) => {
    // Navigate to invoices
    await page.click('text="Invoices"')
    await page.click('button:has-text("Create Invoice")')
    
    // Select billing period
    await page.selectOption('select[name="customer"]', { index: 1 })
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.selectOption('select[name="billingMonth"]', 'Last Month')
    
    // Review calculated charges
    await page.click('button:has-text("Calculate Charges")')
    
    // Verify line items appear
    await expect(page.locator('text="Storage Fees"')).toBeVisible()
    await expect(page.locator('text="Inbound Processing"')).toBeVisible()
    await expect(page.locator('text="Outbound Processing"')).toBeVisible()
    
    // Add custom charges
    await page.click('button:has-text("Add Custom Charge")')
    await page.fill('input[name="customDescription"]', 'Special Handling')
    await page.fill('input[name="customAmount"]', '150.00')
    
    // Generate invoice
    await page.click('button:has-text("Generate Invoice")')
    await expect(page.locator('text="Invoice created"')).toBeVisible()
    
    // Verify invoice appears in list
    await expect(page.locator('text="INV-"')).toBeVisible()
  })

  test('Invoice reconciliation process', async ({ page }) => {
    // Navigate to reconciliation
    await page.click('text="Reconciliation"')
    
    // Upload customer invoice
    await page.click('text="Upload Invoice"')
    await page.setInputFiles('input[type="file"]', {
      name: 'customer-invoice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content')
    })
    
    // Select our invoice to match
    await page.selectOption('select[name="systemInvoice"]', { index: 1 })
    
    // Start reconciliation
    await page.click('button:has-text("Start Reconciliation")')
    
    // Review line items
    const lineItems = page.locator('.reconciliation-item')
    const count = await lineItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = lineItems.nth(i)
      
      // Check if amounts match
      const expected = await item.locator('.expected-amount').textContent()
      const actual = await item.locator('.actual-amount').textContent()
      
      if (expected === actual) {
        await item.locator('button:has-text("Match")').click()
      } else {
        await item.locator('button:has-text("Flag")').click()
        await item.locator('textarea[name="notes"]').fill('Amount mismatch requires review')
      }
    }
    
    // Complete reconciliation
    await page.click('button:has-text("Complete Reconciliation")')
    await expect(page.locator('text="Reconciliation completed"')).toBeVisible()
  })
})

test.describe('📊 Reporting Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Generate inventory aging report', async ({ page }) => {
    await page.click('text="Reports"')
    
    // Select report type
    await page.selectOption('select[name="reportType"]', 'Inventory Aging')
    
    // Configure parameters
    await page.selectOption('select[name="warehouse"]', 'All Warehouses')
    await page.fill('input[name="agingDays"]', '30,60,90,120')
    
    // Add filters
    await page.click('text="Add Filter"')
    await page.selectOption('select[name="filterType"]', 'Customer')
    await page.selectOption('select[name="filterValue"]', { index: 1 })
    
    // Generate report
    await page.click('button:has-text("Generate Report")')
    await expect(page.locator('.report-results')).toBeVisible({ timeout: 10000 })
    
    // Verify report sections
    await expect(page.locator('text="0-30 Days"')).toBeVisible()
    await expect(page.locator('text="31-60 Days"')).toBeVisible()
    await expect(page.locator('text="61-90 Days"')).toBeVisible()
    await expect(page.locator('text="Over 90 Days"')).toBeVisible()
    
    // Export report
    await page.click('button:has-text("Export to Excel")')
  })

  test('Financial summary report with drill-down', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`)
    
    // Select financial summary
    await page.selectOption('select[name="reportType"]', 'Financial Summary')
    
    // Set date range
    await page.fill('input[name="startDate"]', '2024-01-01')
    await page.fill('input[name="endDate"]', '2024-12-31')
    
    // Group by options
    await page.selectOption('select[name="groupBy"]', 'Customer')
    await page.click('input[name="includeDetails"]')
    
    // Generate
    await page.click('button:has-text("Generate Report")')
    
    // Verify summary appears
    await expect(page.locator('text="Total Revenue"')).toBeVisible()
    await expect(page.locator('text="Total Costs"')).toBeVisible()
    await expect(page.locator('text="Profit Margin"')).toBeVisible()
    
    // Drill down into customer details
    const customerRow = page.locator('.customer-summary-row').first()
    await customerRow.click()
    
    // Verify detailed breakdown appears
    await expect(page.locator('text="Monthly Breakdown"')).toBeVisible()
    await expect(page.locator('.monthly-chart')).toBeVisible()
  })
})

test.describe('🔧 Configuration Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Configure new SKU with warehouse rules', async ({ page }) => {
    // Navigate to products
    await page.click('text="Products (SKUs)"')
    await page.click('button:has-text("Add Product")')
    
    // Fill SKU details
    await page.fill('input[name="skuCode"]', 'TEST-SKU-001')
    await page.fill('input[name="description"]', 'Test Product for Workflow')
    await page.fill('input[name="unitsPerCarton"]', '24')
    
    // Add dimensions
    await page.fill('input[name="length"]', '30')
    await page.fill('input[name="width"]', '20')
    await page.fill('input[name="height"]', '15')
    await page.fill('input[name="weight"]', '5.5')
    
    // Configure warehouse-specific rules
    await page.click('text="Warehouse Configuration"')
    
    const warehouses = await page.locator('input[name^="warehouse-"]').count()
    for (let i = 0; i < warehouses; i++) {
      await page.click(`input[name="warehouse-${i}"]`)
      await page.fill(`input[name="minStock-${i}"]`, '50')
      await page.fill(`input[name="maxStock-${i}"]`, '500')
      await page.fill(`input[name="reorderPoint-${i}"]`, '100')
    }
    
    // Set storage requirements
    await page.click('text="Storage Requirements"')
    await page.selectOption('select[name="temperatureControl"]', 'Ambient')
    await page.click('input[name="fragile"]')
    await page.fill('textarea[name="handlingInstructions"]', 'Handle with care. Stack maximum 5 high.')
    
    // Save SKU
    await page.click('button:has-text("Save Product")')
    await expect(page.locator('text="Product created successfully"')).toBeVisible()
  })

  test('Set up tiered cost rates', async ({ page }) => {
    await page.goto(`${BASE_URL}/config/rates`)
    await page.click('button:has-text("Add Rate")')
    
    // Select tiered pricing
    await page.selectOption('select[name="rateType"]', 'Tiered')
    await page.selectOption('select[name="category"]', 'Storage')
    await page.fill('input[name="rateName"]', 'Tiered Pallet Storage')
    
    // Add tiers
    const tiers = [
      { min: 0, max: 100, rate: 30 },
      { min: 101, max: 500, rate: 25 },
      { min: 501, max: 1000, rate: 20 },
      { min: 1001, max: null, rate: 15 }
    ]
    
    for (const tier of tiers) {
      await page.click('button:has-text("Add Tier")')
      const index = tiers.indexOf(tier)
      
      await page.fill(`input[name="tierMin-${index}"]`, String(tier.min))
      if (tier.max) {
        await page.fill(`input[name="tierMax-${index}"]`, String(tier.max))
      }
      await page.fill(`input[name="tierRate-${index}"]`, String(tier.rate))
    }
    
    // Set effective date
    await page.fill('input[name="effectiveDate"]', '2024-01-01')
    
    // Save rate
    await page.click('button:has-text("Save Rate")')
    await expect(page.locator('text="Rate created successfully"')).toBeVisible()
  })
})

test.describe('🔄 Integration Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Amazon FBA inventory sync', async ({ page }) => {
    await page.click('text="Amazon FBA"')
    
    // Configure FBA settings
    await page.click('button:has-text("Settings")')
    await page.fill('input[name="sellerId"]', 'TEST-SELLER-ID')
    await page.fill('input[name="mwsToken"]', 'TEST-MWS-TOKEN')
    await page.selectOption('select[name="marketplace"]', 'UK')
    
    // Map SKUs
    await page.click('text="SKU Mapping"')
    await page.click('button:has-text("Auto-Match SKUs")')
    
    // Review matches
    const mappings = page.locator('.sku-mapping-row')
    const mappingCount = await mappings.count()
    
    for (let i = 0; i < Math.min(mappingCount, 5); i++) {
      const mapping = mappings.nth(i)
      await mapping.locator('button:has-text("Confirm")').click()
    }
    
    // Run sync
    await page.click('button:has-text("Sync Now")')
    await expect(page.locator('.sync-progress')).toBeVisible()
    
    // Wait for completion
    await expect(page.locator('text="Sync completed"')).toBeVisible({ timeout: 30000 })
    
    // Verify synced data
    await expect(page.locator('text="FBA Stock"')).toBeVisible()
    await expect(page.locator('text="Last Updated"')).toContainText(new Date().toLocaleDateString())
  })
})

test.describe('🚨 Exception Handling Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test('Handle damaged goods during receiving', async ({ page }) => {
    await page.goto(`${BASE_URL}/operations/receive`)
    
    // Start receiving process
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.fill('input[name="trackingNumber"]', 'DMG-TEST-001')
    
    // Add items
    await page.click('button:has-text("Add Item")')
    await page.selectOption('select[name="sku"]', { index: 1 })
    await page.fill('input[name="expectedQuantity"]', '100')
    await page.fill('input[name="receivedQuantity"]', '95')
    
    // Report damage
    await page.click('button:has-text("Report Discrepancy")')
    await page.selectOption('select[name="discrepancyType"]', 'Damaged')
    await page.fill('input[name="damagedQuantity"]', '5')
    await page.fill('textarea[name="damageDescription"]', 'Water damage on 5 cartons')
    
    // Upload photos
    await page.setInputFiles('input[name="damagePhotos"]', [
      {
        name: 'damage1.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake image data')
      }
    ])
    
    // Complete receiving with exception
    await page.click('button:has-text("Receive with Exceptions")')
    await expect(page.locator('text="Goods received with exceptions"')).toBeVisible()
    
    // Verify exception report created
    await page.click('text="View Exception Report"')
    await expect(page.locator('text="DMG-TEST-001"')).toBeVisible()
    await expect(page.locator('text="5 units damaged"')).toBeVisible()
  })

  test('Inventory adjustment workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/operations/inventory`)
    
    // Find item with discrepancy
    await page.click('button:has-text("Cycle Count")')
    
    // Select items to count
    await page.selectOption('select[name="countType"]', 'Spot Check')
    await page.selectOption('select[name="warehouse"]', { index: 1 })
    await page.click('button:has-text("Generate Count Sheet")')
    
    // Enter count results
    const countRows = page.locator('.count-row')
    const rowCount = await countRows.count()
    
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const row = countRows.nth(i)
      const expected = await row.locator('.expected-qty').textContent()
      const variance = Math.floor(Math.random() * 10) - 5 // Random variance
      
      await row.locator('input[name="actualCount"]').fill(String(parseInt(expected || '0') + variance))
      
      if (variance !== 0) {
        await row.locator('select[name="reason"]').selectOption('Counting Error')
        await row.locator('input[name="notes"]').fill(`Variance of ${variance} units found`)
      }
    }
    
    // Submit count
    await page.click('button:has-text("Submit Count")')
    
    // Review adjustments
    await expect(page.locator('text="Review Adjustments"')).toBeVisible()
    await page.click('button:has-text("Approve Adjustments")')
    
    // Verify adjustments posted
    await expect(page.locator('text="Adjustments posted successfully"')).toBeVisible()
  })
})
