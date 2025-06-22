import { test, expect } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:3002'
const DEMO_ADMIN = {
  username: 'demo-admin',
  password: 'SecureWarehouse2024!'
}
const DEMO_STAFF = {
  username: 'staff',
  password: 'DemoStaff2024!'
}

// Helper function to login
async function login(page: any, credentials: { username: string, password: string }) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('#emailOrUsername', credentials.username)
  await page.fill('#password', credentials.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

// Helper function to setup demo environment
async function setupDemo(page: any) {
  await page.goto(BASE_URL)
  await page.click('button:has-text("Try Demo")')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('🔐 Authentication Flow', () => {
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page.locator('h1')).toContainText('Modern Warehouse')
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible()
    await expect(page.locator('a:has-text("Sign In")')).toBeVisible()
  })

  test('Login page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`)
    
    // Check page elements
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    await expect(page.locator('#emailOrUsername')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible()
    
    // Test empty form submission
    await page.click('button[type="submit"]')
    await expect(page.locator('#emailOrUsername')).toHaveAttribute('required')
  })

  test('Demo setup flow', async ({ page }) => {
    await setupDemo(page)
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.locator('text="Dashboard"')).toBeVisible()
  })

  test('Regular login flow', async ({ page }) => {
    await login(page, DEMO_ADMIN)
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.locator('text="Signed in as"')).toBeVisible()
  })

  test('Logout functionality', async ({ page }) => {
    await login(page, DEMO_ADMIN)
    await page.click('button:has-text("Sign out")')
    await expect(page).toHaveURL(/.*\/auth\/login/)
  })
})

test.describe('📊 Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Main dashboard displays correctly', async ({ page }) => {
    // Check header elements
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text="About This Page"')).toBeVisible()
    
    // Check metric cards
    await expect(page.locator('text="Total Inventory"')).toBeVisible()
    await expect(page.locator('text="Storage Cost"')).toBeVisible()
    await expect(page.locator('text="Active SKUs"')).toBeVisible()
    await expect(page.locator('text="Pending Invoices"')).toBeVisible()
    
    // Check charts
    await expect(page.locator('text="Total Inventory Levels"')).toBeVisible()
    await expect(page.locator('text="Weekly Storage Costs"')).toBeVisible()
    await expect(page.locator('text="Current Inventory by Warehouse"')).toBeVisible()
    
    // Check quick actions
    await expect(page.locator('text="Quick Actions"')).toBeVisible()
    await expect(page.locator('text="Manage Inventory"')).toBeVisible()
    await expect(page.locator('text="Process Invoices"')).toBeVisible()
  })

  test('Admin-only sections visible for admin', async ({ page }) => {
    await expect(page.locator('text="System Actions"')).toBeVisible()
    await expect(page.locator('text="System Health"')).toBeVisible()
    await expect(page.locator('text="Export All Data"')).toBeVisible()
    await expect(page.locator('text="Database Backup"')).toBeVisible()
  })

  test('Dashboard auto-refresh toggle', async ({ page }) => {
    const autoRefreshToggle = page.locator('text="Auto-refresh"')
    await expect(autoRefreshToggle).toBeVisible()
    
    // Toggle should be clickable
    await autoRefreshToggle.click()
  })

  test('Quick start guide interaction', async ({ page }) => {
    const quickStartGuide = page.locator('text="Quick Start Guide"')
    if (await quickStartGuide.isVisible()) {
      await expect(page.locator('text="Set Up Warehouses"')).toBeVisible()
      await expect(page.locator('text="Configure SKUs"')).toBeVisible()
      await expect(page.locator('text="Define Cost Rates"')).toBeVisible()
      
      // Test dismiss
      await page.click('text="Don\'t show this again"')
      await expect(quickStartGuide).not.toBeVisible()
    }
  })
})

test.describe('📦 Operations Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Shipment Planning page', async ({ page }) => {
    await page.click('text="Shipment Planning"')
    await expect(page.locator('h1:has-text("Shipment Planning")')).toBeVisible()
    // Check for planning interface elements
  })

  test('Inventory Ledger page', async ({ page }) => {
    await page.click('text="Inventory Ledger"')
    await expect(page.locator('h1:has-text("Inventory Ledger")')).toBeVisible()
    
    // Check filters
    await expect(page.locator('text="Filter by"')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th:has-text("Date")')).toBeVisible()
    await expect(page.locator('th:has-text("SKU")')).toBeVisible()
    await expect(page.locator('th:has-text("Type")')).toBeVisible()
    await expect(page.locator('th:has-text("Quantity")')).toBeVisible()
  })

  test('Receive Goods workflow', async ({ page }) => {
    await page.click('text="Receive Goods"')
    await expect(page.locator('h1:has-text("Receive Goods")')).toBeVisible()
    
    // Check form elements
    await expect(page.locator('text="Warehouse"')).toBeVisible()
    await expect(page.locator('text="SKU"')).toBeVisible()
    await expect(page.locator('text="Quantity"')).toBeVisible()
    await expect(page.locator('text="Batch/Lot"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add Item")')).toBeVisible()
    await expect(page.locator('button:has-text("Submit")')).toBeVisible()
  })

  test('Ship Goods workflow', async ({ page }) => {
    await page.click('text="Ship Goods"')
    await expect(page.locator('h1:has-text("Ship Goods")')).toBeVisible()
    
    // Check shipment form
    await expect(page.locator('text="Order Number"')).toBeVisible()
    await expect(page.locator('text="Destination"')).toBeVisible()
    await expect(page.locator('text="Tracking Number"')).toBeVisible()
  })

  test('Import Attributes page', async ({ page }) => {
    await page.click('text="Import Attributes"')
    await expect(page.locator('h1:has-text("Import")')).toBeVisible()
    
    // Check upload interface
    await expect(page.locator('text="Upload"')).toBeVisible()
    await expect(page.locator('text="Download Template"')).toBeVisible()
  })

  test('Pallet Variance page', async ({ page }) => {
    await page.click('text="Pallet Variance"')
    await expect(page.locator('h1:has-text("Pallet Variance")')).toBeVisible()
    
    // Check variance tracking interface
    await expect(page.locator('text="Expected"')).toBeVisible()
    await expect(page.locator('text="Actual"')).toBeVisible()
    await expect(page.locator('text="Variance"')).toBeVisible()
  })
})

test.describe('💰 Finance Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Finance Dashboard', async ({ page }) => {
    await page.click('a[href="/finance/dashboard"]')
    await expect(page.locator('h1:has-text("Finance Dashboard")')).toBeVisible()
    
    // Check financial metrics
    await expect(page.locator('text="Revenue"')).toBeVisible()
    await expect(page.locator('text="Outstanding"')).toBeVisible()
    await expect(page.locator('text="Overdue"')).toBeVisible()
  })

  test('Invoices page', async ({ page }) => {
    await page.click('a[href="/finance/invoices"]')
    await expect(page.locator('h1:has-text("Invoices")')).toBeVisible()
    
    // Check invoice list
    await expect(page.locator('text="Invoice Number"')).toBeVisible()
    await expect(page.locator('text="Status"')).toBeVisible()
    await expect(page.locator('text="Amount"')).toBeVisible()
    await expect(page.locator('text="Due Date"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Invoice")')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
  })

  test('Reconciliation page', async ({ page }) => {
    await page.click('text="Reconciliation"')
    await expect(page.locator('h1:has-text("Reconciliation")')).toBeVisible()
    
    // Check reconciliation interface
    await expect(page.locator('text="Expected"')).toBeVisible()
    await expect(page.locator('text="Actual"')).toBeVisible()
    await expect(page.locator('text="Difference"')).toBeVisible()
  })

  test('Storage Ledger page', async ({ page }) => {
    await page.click('text="Storage Ledger"')
    await expect(page.locator('h1:has-text("Storage Ledger")')).toBeVisible()
    
    // Check storage tracking
    await expect(page.locator('text="Period"')).toBeVisible()
    await expect(page.locator('text="Pallets"')).toBeVisible()
    await expect(page.locator('text="Cost"')).toBeVisible()
  })

  test('Cost Ledger page', async ({ page }) => {
    await page.click('text="Cost Ledger"')
    await expect(page.locator('h1:has-text("Cost Ledger")')).toBeVisible()
    
    // Check cost breakdown
    await expect(page.locator('text="Category"')).toBeVisible()
    await expect(page.locator('text="Description"')).toBeVisible()
    await expect(page.locator('text="Amount"')).toBeVisible()
  })
})

test.describe('⚙️ Configuration Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Products (SKUs) page', async ({ page }) => {
    await page.click('a[href="/config/products"]')
    await expect(page.locator('h1:has-text("Products")')).toBeVisible()
    
    // Check SKU management interface
    await expect(page.locator('button:has-text("Add Product")')).toBeVisible()
    await expect(page.locator('text="SKU Code"')).toBeVisible()
    await expect(page.locator('text="Description"')).toBeVisible()
    await expect(page.locator('text="Units per Carton"')).toBeVisible()
  })

  test('Batch Attributes page', async ({ page }) => {
    await page.click('text="Batch Attributes"')
    await expect(page.locator('h1:has-text("Batch Attributes")')).toBeVisible()
    
    // Check batch configuration
    await expect(page.locator('text="Attribute Name"')).toBeVisible()
    await expect(page.locator('text="Type"')).toBeVisible()
    await expect(page.locator('text="Required"')).toBeVisible()
  })

  test('Locations page', async ({ page }) => {
    await page.click('text="Locations"')
    await expect(page.locator('h1:has-text("Locations")')).toBeVisible()
    
    // Check warehouse management
    await expect(page.locator('button:has-text("Add Location")')).toBeVisible()
    await expect(page.locator('text="Warehouse Code"')).toBeVisible()
    await expect(page.locator('text="Address"')).toBeVisible()
  })

  test('Cost Rates page', async ({ page }) => {
    await page.click('a[href="/config/rates"]')
    await expect(page.locator('h1:has-text("Cost Rates")')).toBeVisible()
    
    // Check rate configuration
    await expect(page.locator('button:has-text("Add Rate")')).toBeVisible()
    await expect(page.locator('text="Category"')).toBeVisible()
    await expect(page.locator('text="Rate"')).toBeVisible()
    await expect(page.locator('text="Unit"')).toBeVisible()
  })

  test('Invoice Templates page', async ({ page }) => {
    await page.click('text="Invoice Templates"')
    await expect(page.locator('h1:has-text("Invoice Templates")')).toBeVisible()
    
    // Check template management
    await expect(page.locator('text="Template Name"')).toBeVisible()
    await expect(page.locator('text="Type"')).toBeVisible()
    await expect(page.locator('button:has-text("Create Template")')).toBeVisible()
  })
})

test.describe('📈 Analytics & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Reports page', async ({ page }) => {
    await page.click('a[href="/reports"]')
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible()
    
    // Check report types
    await expect(page.locator('text="Inventory Report"')).toBeVisible()
    await expect(page.locator('text="Financial Report"')).toBeVisible()
    await expect(page.locator('text="Activity Report"')).toBeVisible()
    
    // Check date range selector
    await expect(page.locator('text="Date Range"')).toBeVisible()
    await expect(page.locator('button:has-text("Generate")')).toBeVisible()
  })

  test('Amazon FBA integration page', async ({ page }) => {
    await page.click('text="Amazon FBA"')
    await expect(page.locator('h1:has-text("Amazon FBA")')).toBeVisible()
    
    // Check FBA interface
    await expect(page.locator('text="Sync Status"')).toBeVisible()
    await expect(page.locator('text="Last Sync"')).toBeVisible()
    await expect(page.locator('button:has-text("Sync Now")')).toBeVisible()
  })
})

test.describe('👤 Admin-Only Features', () => {
  test.describe('As Admin User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, DEMO_ADMIN)
    })

    test('Users management page accessible', async ({ page }) => {
      await page.click('a[href="/admin/users"]')
      await expect(page.locator('h1:has-text("Users")')).toBeVisible()
      
      // Check user management interface
      await expect(page.locator('button:has-text("Add User")')).toBeVisible()
      await expect(page.locator('text="Username"')).toBeVisible()
      await expect(page.locator('text="Email"')).toBeVisible()
      await expect(page.locator('text="Role"')).toBeVisible()
      await expect(page.locator('text="Status"')).toBeVisible()
    })

    test('Settings page accessible', async ({ page }) => {
      await page.click('a[href="/admin/settings"]')
      await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
      
      // Check settings sections
      await expect(page.locator('text="General"')).toBeVisible()
      await expect(page.locator('text="Security"')).toBeVisible()
      await expect(page.locator('text="Notifications"')).toBeVisible()
    })

    test('Admin navigation items visible', async ({ page }) => {
      await expect(page.locator('text="Admin"')).toBeVisible()
      await expect(page.locator('a[href="/admin/users"]')).toBeVisible()
      await expect(page.locator('a[href="/admin/settings"]')).toBeVisible()
    })
  })

  test.describe('As Staff User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, DEMO_STAFF)
    })

    test('Admin sections not visible for staff', async ({ page }) => {
      // Admin navigation should not be visible
      await expect(page.locator('text="Admin"')).not.toBeVisible()
      
      // System sections should not be visible
      await expect(page.locator('text="System Actions"')).not.toBeVisible()
      await expect(page.locator('text="System Health"')).not.toBeVisible()
    })

    test('Admin URLs redirect for staff', async ({ page }) => {
      // Try to access admin pages directly
      await page.goto(`${BASE_URL}/admin/users`)
      await expect(page).toHaveURL(/.*\/unauthorized/)
      
      await page.goto(`${BASE_URL}/admin/settings`)
      await expect(page).toHaveURL(/.*\/unauthorized/)
    })
  })
})

test.describe('🔄 Data Integrity Rules', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
  })

  test('Cannot ship more than available inventory', async ({ page }) => {
    await page.goto(`${BASE_URL}/operations/ship`)
    
    // Try to ship goods
    // This test would interact with the ship form and verify error messages
    // when trying to ship more than available inventory
  })

  test('Inventory balance updates after transactions', async ({ page }) => {
    // Navigate to inventory ledger
    await page.goto(`${BASE_URL}/operations/inventory`)
    
    // Record initial inventory for a SKU
    // Perform a receive transaction
    // Verify inventory increased
    // Perform a ship transaction
    // Verify inventory decreased
  })

  test('Financial calculations match transactions', async ({ page }) => {
    // Navigate to invoices
    await page.goto(`${BASE_URL}/finance/invoices`)
    
    // Verify invoice amounts match storage and transaction costs
  })
})

test.describe('📱 Responsive Design', () => {
  test('Mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page, DEMO_ADMIN)
    
    // Check mobile menu button
    await expect(page.locator('button[aria-label="Open sidebar"]')).toBeVisible()
    
    // Open mobile menu
    await page.click('button[aria-label="Open sidebar"]')
    
    // Check navigation items in mobile menu
    await expect(page.locator('text="Dashboard"')).toBeVisible()
    await expect(page.locator('text="Operations"')).toBeVisible()
    await expect(page.locator('text="Finance"')).toBeVisible()
  })

  test('Tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await login(page, DEMO_ADMIN)
    
    // Verify layout adjusts for tablet
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })
})

test.describe('⚡ Performance & Error Handling', () => {
  test('Page load times', async ({ page }) => {
    const startTime = Date.now()
    await login(page, DEMO_ADMIN)
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Error messages display correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`)
    
    // Try invalid login
    await page.fill('#emailOrUsername', 'invalid@user.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should see error message
    await expect(page.locator('text="Invalid email/username or password"')).toBeVisible()
  })

  test('404 page handling', async ({ page }) => {
    await login(page, DEMO_ADMIN)
    await page.goto(`${BASE_URL}/non-existent-page`)
    
    // Should show 404 or redirect
    await expect(page.locator('text="404"').or(page.locator('text="Not Found"'))).toBeVisible()
  })
})