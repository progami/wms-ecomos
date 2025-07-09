import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('📊 Dashboard Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup demo environment and login
    await page.goto(BASE_URL)
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('Dashboard loads with all key components', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check Market section is visible
    await expect(page.locator('h2:has-text("Market")')).toBeVisible()
    
    // Check charts are rendered
    await expect(page.locator('text="Inventory Levels Trend"')).toBeVisible()
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
    
    // Check quick action buttons
    await expect(page.locator('button:has-text("Create Shipment")')).toBeVisible()
    await expect(page.locator('button:has-text("Manage Inventory")')).toBeVisible()
  })

  test('Dashboard data updates and displays correctly', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Wait for charts to load
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 })
    
    // Check that charts have rendered
    const charts = page.locator('.recharts-responsive-container')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })

  test('Welcome modal interaction', async ({ page }) => {
    // Reload page to see welcome modal again
    await page.reload()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Check if welcome modal is visible
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    
    if (await welcomeModal.isVisible({ timeout: 5000 })) {
      // Check modal content
      await expect(page.locator('text="Demo Data Loaded"')).toBeVisible()
      await expect(page.locator('text="Full inventory management system"')).toBeVisible()
      
      // Test close button
      await page.click('button:has-text("Start Exploring")')
      await expect(welcomeModal).not.toBeVisible()
    }
  })

  test('Navigation from dashboard works', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Test Manage Inventory button
    await page.click('button:has-text("Manage Inventory")')
    await page.waitForURL('**/operations/inventory')
    
    // Go back to dashboard
    await page.click('a[href="/admin/dashboard"]')
    await page.waitForURL('**/dashboard')
    
    // Test Create Shipment button
    await page.click('button:has-text("Create Shipment")')
    await page.waitForURL('**/operations/ship')
  })

  test('Dashboard refresh functionality', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Wait for initial load
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 })
    
    // Refresh page
    await page.reload()
    
    // Close welcome modal again if it appears
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Verify dashboard loads again
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible()
  })

  test('Chart interactions work correctly', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Wait for charts to render
    await page.waitForSelector('.recharts-responsive-container', { timeout: 10000 })
    
    // Check if inventory trend chart is displayed
    await expect(page.locator('text="Inventory Levels Trend"')).toBeVisible()
    
    // Check date range selector
    const dateRangeButton = page.locator('button:has-text("Year to Date")')
    await expect(dateRangeButton).toBeVisible()
  })

  test('Dashboard responsiveness', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    
    // Check layout adjusts
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h2:has-text("Market")')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Check mobile layout
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    
    // Action buttons should still be visible
    await expect(page.locator('button:has-text("Create Shipment")')).toBeVisible()
  })

  test('Dashboard sections are properly structured', async ({ page }) => {
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Check breadcrumb navigation
    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('svg.lucide-home')).toBeVisible()
    
    // Check main dashboard structure
    await expect(page.locator('text="Welcome back, Demo Administrator"')).toBeVisible()
    
    // Check Market section structure
    const marketSection = page.locator('div:has(h2:has-text("Market"))')
    await expect(marketSection).toBeVisible()
    await expect(marketSection.locator('text="Order planning, shipments, and marketplace integrations"')).toBeVisible()
  })

  test('Error states handling', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      })
    })
    
    // Reload to trigger error
    await page.reload()
    
    // Close welcome modal if it still appears
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Dashboard should still render with basic structure
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
  })

  test('Performance - Dashboard loads quickly', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`)
    
    // Wait for main content
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 5000 })
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
    }
    
    // Wait for charts to load
    await page.waitForSelector('.recharts-responsive-container', { timeout: 5000 })
    
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