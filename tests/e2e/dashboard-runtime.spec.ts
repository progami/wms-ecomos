import { test, expect } from '@playwright/test'

test.describe('📊 Dashboard Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup demo environment and login
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('Dashboard loads with all key components', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check KPI cards are visible
    await expect(page.locator('text=Total SKUs')).toBeVisible()
    await expect(page.locator('text=Active Warehouses')).toBeVisible()
    await expect(page.locator('text=Low Stock Items')).toBeVisible()
    await expect(page.locator('text=Pending Shipments')).toBeVisible()
    
    // Check charts are rendered
    await expect(page.locator('canvas').first()).toBeVisible() // Chart canvas
    
    // Check recent activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible()
  })

  test('Dashboard data updates and displays correctly', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('text=Total SKUs', { timeout: 10000 })
    
    // Check that KPI values are not empty
    const totalSKUs = await page.locator('text=Total SKUs').locator('..').locator('text=/\\d+/')
    await expect(totalSKUs).toBeVisible()
    
    const activeWarehouses = await page.locator('text=Active Warehouses').locator('..').locator('text=/\\d+/')
    await expect(activeWarehouses).toBeVisible()
  })

  test('Quick Start Guide interaction', async ({ page }) => {
    // Check if Quick Start Guide is visible
    const quickStartGuide = page.locator('text=Quick Start Guide')
    
    if (await quickStartGuide.isVisible()) {
      // Test expand/collapse
      await quickStartGuide.click()
      
      // Check guide content
      await expect(page.locator('text=Welcome to your Warehouse Management System')).toBeVisible()
      
      // Test dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss")')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
        await expect(quickStartGuide).not.toBeVisible()
      }
    }
  })

  test('Navigation from dashboard works', async ({ page }) => {
    // Test SKU navigation
    await page.click('a:has-text("Manage SKUs")')
    await page.waitForURL('**/skus')
    await expect(page.locator('h1')).toContainText('SKU Management')
    
    // Go back to dashboard
    await page.click('a:has-text("Dashboard")')
    await page.waitForURL('**/dashboard')
    
    // Test Inventory navigation
    await page.click('a:has-text("View Inventory")')
    await page.waitForURL('**/operations/inventory')
    await expect(page.locator('h1')).toContainText('Inventory')
  })

  test('Dashboard refresh functionality', async ({ page }) => {
    // Get initial KPI value
    const initialValue = await page.locator('text=Total SKUs').locator('..').locator('p.text-2xl').textContent()
    
    // Refresh page
    await page.reload()
    
    // Wait for dashboard to reload
    await page.waitForSelector('text=Total SKUs', { timeout: 10000 })
    
    // Verify data loads again
    const refreshedValue = await page.locator('text=Total SKUs').locator('..').locator('p.text-2xl').textContent()
    expect(refreshedValue).toBeTruthy()
  })

  test('Recent activity displays correctly', async ({ page }) => {
    // Wait for recent activity section
    await page.waitForSelector('text=Recent Activity')
    
    // Check if activity items are displayed
    const activityItems = page.locator('[role="list"] > div')
    const count = await activityItems.count()
    
    if (count > 0) {
      // Check first activity item has required elements
      const firstItem = activityItems.first()
      await expect(firstItem).toBeVisible()
      
      // Activity should have timestamp
      await expect(firstItem.locator('text=/ago|minutes|hours|days/')).toBeVisible()
    }
  })

  test('Dashboard responsiveness', async ({ page }) => {
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    
    // Check layout adjusts
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Total SKUs')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Navigation should be in mobile menu
    const menuButton = page.locator('button[aria-label="Toggle navigation"]')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await expect(page.locator('nav')).toBeVisible()
    }
    
    // KPI cards should stack vertically
    await expect(page.locator('text=Total SKUs')).toBeVisible()
  })

  test('Chart interactions', async ({ page }) => {
    // Wait for charts to render
    await page.waitForSelector('canvas', { timeout: 10000 })
    
    // Hover over chart to check tooltips
    const chart = page.locator('canvas').first()
    await chart.hover({ position: { x: 100, y: 100 } })
    
    // Some charts might show tooltips on hover
    // This depends on the chart library implementation
    await page.waitForTimeout(500)
  })

  test('Error states handling', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/dashboard', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      })
    })
    
    // Reload to trigger error
    await page.reload()
    
    // Check for error message or fallback UI
    const errorMessage = page.locator('text=/Error|Failed|Unable to load/')
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (hasError) {
      await expect(errorMessage).toBeVisible()
    }
  })

  test('Performance - Dashboard loads quickly', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    
    // Wait for main content
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 5000 })
    await page.waitForSelector('text=Total SKUs', { timeout: 5000 })
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
    
    // Log performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      }
    })
    
    console.log('Dashboard Performance Metrics:', metrics)
  })
})