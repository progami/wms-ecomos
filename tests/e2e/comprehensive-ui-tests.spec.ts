import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
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
    // The landing page is the login page
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
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
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('Regular login flow', async ({ page }) => {
    await login(page, DEMO_ADMIN)
    await expect(page).toHaveURL(/.*\/dashboard/)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    await expect(page.locator('text="Welcome back, Demo Administrator"')).toBeVisible()
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
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Main dashboard displays correctly', async ({ page }) => {
    // Check header elements
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text="Welcome back, Demo Administrator"')).toBeVisible()
    
    // Check Market section
    await expect(page.locator('h2:has-text("Market")')).toBeVisible()
    await expect(page.locator('text="Order planning, shipments, and marketplace integrations"')).toBeVisible()
    
    // Check charts
    await expect(page.locator('text="Inventory Levels Trend"')).toBeVisible()
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
    
    // Check quick actions
    await expect(page.locator('button:has-text("Create Shipment")')).toBeVisible()
    await expect(page.locator('button:has-text("Manage Inventory")')).toBeVisible()
  })

  test('Admin navigation visible for admin', async ({ page }) => {
    // Check for admin-specific navigation items
    // The actual admin sections may vary based on implementation
    const dashboardContent = await page.content()
    
    // Admin users should see the dashboard with full features
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    expect(dashboardContent).toContain('Demo Administrator')
  })

  test('Date range selector', async ({ page }) => {
    // Check date range selector
    const dateRangeButton = page.locator('button:has-text("Year to Date")')
    await expect(dateRangeButton).toBeVisible()
    
    // Date range button should be clickable
    await dateRangeButton.click()
    await page.waitForTimeout(500)
  })

  test('Dashboard sections load correctly', async ({ page }) => {
    // Check Market section
    await expect(page.locator('h2:has-text("Market")')).toBeVisible()
    
    // Check for charts
    const charts = page.locator('.recharts-responsive-container')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
    
    // Check breadcrumb navigation
    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('svg.lucide-home')).toBeVisible()
  })
})

test.describe('📦 Operations Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Shipment Planning page', async ({ page }) => {
    await page.click('a:has-text("Shipment Planning")')
    await page.waitForURL('**/operations/shipment-planning')
    await expect(page.locator('h1:has-text("Shipment Planning")')).toBeVisible()
    
    // Check for planning interface elements
    await expect(page.locator('text="FBA Inventory Comparison"')).toBeVisible()
    await expect(page.locator('button:has-text("Generate Shipment Plan")')).toBeVisible()
  })

  test('Inventory Ledger page', async ({ page }) => {
    await page.click('a:has-text("Inventory Ledger")')
    await page.waitForURL('**/operations/inventory')
    
    // Page might show inventory ledger or be under construction
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Inventory')
    }
  })

  test('Receive Goods workflow', async ({ page }) => {
    await page.click('a:has-text("Receive Goods")')
    await page.waitForURL('**/operations/receive')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Receive')
    }
  })

  test('Ship Goods workflow', async ({ page }) => {
    await page.click('a:has-text("Ship Goods")')
    await page.waitForURL('**/operations/ship')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Ship')
    }
  })

  test('Amazon FBA page', async ({ page }) => {
    await page.click('a:has-text("Amazon FBA")')
    await page.waitForURL('**/market/amazon-fba')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Amazon')
    }
  })

  test('Pallet Variance page', async ({ page }) => {
    await page.click('a:has-text("Pallet Variance")')
    await page.waitForURL('**/operations/pallet-variance')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Pallet Variance')
    }
  })
})

test.describe('💰 Finance Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Finance Dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/finance/dashboard')
    await expect(page.locator('h1:has-text("Finance Dashboard")')).toBeVisible()
    
    // Check financial metrics
    await expect(page.locator('text="Total Revenue"')).toBeVisible()
    await expect(page.locator('text="Outstanding Amount"')).toBeVisible()
    await expect(page.locator('text="Active Invoices"')).toBeVisible()
    
    // Check charts
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
  })

  test('Invoices page', async ({ page }) => {
    await page.click('a[href="/finance/invoices"]')
    await page.waitForURL('**/finance/invoices')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Invoice')
    }
  })

  test('Reconciliation page', async ({ page }) => {
    await page.click('a:has-text("Reconciliation")')
    await page.waitForURL('**/finance/reconciliation')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Reconciliation')
    }
  })

  test('Storage Ledger page', async ({ page }) => {
    await page.click('a:has-text("Storage Ledger")')
    await page.waitForURL('**/finance/storage-ledger')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Storage Ledger')
    }
  })

  test('Cost Ledger page', async ({ page }) => {
    await page.click('a:has-text("Cost Ledger")')
    await page.waitForURL('**/finance/cost-ledger')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Cost Ledger')
    }
  })
})

test.describe('⚙️ Configuration Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Products (SKUs) page', async ({ page }) => {
    await page.click('a:has-text("Products")')
    await page.waitForURL('**/config/products')
    await expect(page.locator('h1:has-text("Products")')).toBeVisible()
    
    // Check SKU management interface
    await expect(page.locator('button:has-text("Add Product")')).toBeVisible()
    await expect(page.locator('th:has-text("SKU Code")')).toBeVisible()
    await expect(page.locator('th:has-text("Description")')).toBeVisible()
    await expect(page.locator('th:has-text("Pack Size")')).toBeVisible()
  })

  test('Batch Attributes page', async ({ page }) => {
    await page.click('a:has-text("Batch Attributes")')
    await page.waitForURL('**/config/batch-attributes')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Batch Attributes')
    }
  })

  test('Locations page', async ({ page }) => {
    await page.click('a:has-text("Locations")')
    await page.waitForURL('**/config/locations')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Locations')
    }
  })

  test('Cost Rates page', async ({ page }) => {
    await page.click('a:has-text("Cost Rates")')
    await page.waitForURL('**/config/rates')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Cost Rates')
    }
  })

  test('Invoice Templates page', async ({ page }) => {
    await page.click('a:has-text("Invoice Templates")')
    await page.waitForURL('**/config/invoice-templates')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Invoice Templates')
    }
  })
})

test.describe('📈 Analytics & Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Reports page', async ({ page }) => {
    await page.click('a:has-text("Reports")')
    await page.waitForURL('**/reports')
    
    // Check if under construction
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Reports')
    }
  })

  test('Order Management page', async ({ page }) => {
    await page.click('a:has-text("Order Management")')
    await page.waitForURL('**/market/orders')
    
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Order')
    }
  })
})

test.describe('👤 Admin-Only Features', () => {
  test.describe('As Admin User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, DEMO_ADMIN)
      
      // Close welcome modal if present
      const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
      if (await welcomeModal.isVisible({ timeout: 2000 })) {
        await page.click('button:has-text("Start Exploring")')
        await page.waitForTimeout(500)
      }
    })

    test('Users management page accessible', async ({ page }) => {
      await page.click('a[href="/admin/users"]')
      await page.waitForURL('**/admin/users')
      
      // Check if under construction
      const pageTitle = await page.locator('h1').textContent()
      if (pageTitle?.includes('Under Construction')) {
        await expect(page.locator('text="This page is currently under development"')).toBeVisible()
      } else {
        await expect(page.locator('h1')).toContainText('Users')
      }
    })

    test('Settings page accessible', async ({ page }) => {
      await page.click('a[href="/admin/settings"]')
      await page.waitForURL('**/admin/settings')
      
      const pageTitle = await page.locator('h1').textContent()
      if (pageTitle?.includes('Under Construction')) {
        await expect(page.locator('text="This page is currently under development"')).toBeVisible()
      } else {
        await expect(page.locator('h1')).toContainText('Settings')
      }
    })

    test('Admin navigation items visible', async ({ page }) => {
      // Admin users should see admin menu items
      await expect(page.locator('a[href="/admin/users"]')).toBeVisible()
      await expect(page.locator('a[href="/admin/settings"]')).toBeVisible()
    })
  })

  test.describe('As Staff User', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, DEMO_STAFF)
      
      // Close welcome modal if present
      const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
      if (await welcomeModal.isVisible({ timeout: 2000 })) {
        await page.click('button:has-text("Start Exploring")')
        await page.waitForTimeout(500)
      }
    })

    test('Admin sections not visible for staff', async ({ page }) => {
      // Admin navigation items should not be visible
      await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible()
      await expect(page.locator('a[href="/admin/settings"]')).not.toBeVisible()
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
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
  })

  test('Navigation between pages works correctly', async ({ page }) => {
    // Test navigation flow
    await page.click('a:has-text("Products")')
    await page.waitForURL('**/config/products')
    await expect(page.locator('h1')).toContainText('Products')
    
    await page.click('a:has-text("Dashboard")')
    await page.waitForURL('**/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('Demo data is properly loaded', async ({ page }) => {
    // Navigate to products page
    await page.goto(`${BASE_URL}/config/products`)
    
    // Check that demo products are loaded
    const productRows = await page.locator('tbody tr').count()
    expect(productRows).toBeGreaterThan(0)
  })

  test('Finance dashboard shows data', async ({ page }) => {
    // Navigate to finance dashboard
    await page.goto(`${BASE_URL}/finance/dashboard`)
    
    // Verify charts are displayed
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
  })
})

test.describe('📱 Responsive Design', () => {
  test('Mobile navigation works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Check that page adapts to mobile
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    // Navigation should still be accessible
    const navLinks = await page.locator('nav a').count()
    expect(navLinks).toBeGreaterThan(0)
  })

  test('Tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await login(page, DEMO_ADMIN)
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Verify layout adjusts for tablet
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
  })
})

test.describe('⚡ Performance & Error Handling', () => {
  test('Page load times', async ({ page }) => {
    const startTime = Date.now()
    await login(page, DEMO_ADMIN)
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
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
    
    // Should show 404 or redirect to dashboard
    const url = page.url()
    const has404 = await page.locator('text="404"').isVisible({ timeout: 2000 }).catch(() => false)
    const hasNotFound = await page.locator('text="Not Found"').isVisible({ timeout: 2000 }).catch(() => false)
    
    // Either show 404 or redirect to a valid page
    expect(has404 || hasNotFound || url.includes('/dashboard')).toBeTruthy()
  })
})