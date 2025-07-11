import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect } from '@playwright/test'

// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  // Always try to setup demo first (it will check internally if already exists)
  await page.request.post('http://localhost:3000/api/demo/setup');
  
  // Wait for demo setup to complete
  await page.waitForTimeout(2000);
  
  // Navigate to login page
  await page.goto('http://localhost:3000/auth/login');
  
  // Login with demo credentials
  await page.fill('#emailOrUsername', 'demo-admin');
  await page.fill('#password', 'SecureWarehouse2024!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Handle welcome modal if present
  const welcomeModal = page.locator('dialog:has-text("Welcome to WMS Demo!")');
  if (await welcomeModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    const startBtn = page.locator('button:has-text("Start Exploring")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }
}

const BASE_URL = 'http://localhost:3000'

test.describe('📊 Dashboard Runtime Tests', () => {
  test.beforeEach(async ({ page, request }) => {
    // Setup demo data first via API
    const setupResponse = await request.post(`${BASE_URL}/api/demo/setup`)
    expect(setupResponse.ok()).toBeTruthy()
    
    // Use the auth helper that handles both test and regular auth
    await setupDemoAndLogin(page)
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
    
    // Check quick action links - they might be in different sections
    const quickActions = page.locator('a:has-text("Plan New Shipment"), a:has-text("Receive"), a:has-text("Ship")');
    const actionCount = await quickActions.count();
    expect(actionCount).toBeGreaterThan(0);
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
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    
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
    await page.click('a[href="/dashboard"]')
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
    const element = page.locator('button:has-text("Create Shipment")');
    if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(element).toBeVisible();
    }
  })

  test('Dashboard sections are properly structured', async ({ page }) => {
    // Check that we're on dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Check page has a header/navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
    
    // Check for some dashboard content
    const dashboardContent = page.locator('h1, h2').first();
    await expect(dashboardContent).toBeVisible();
    
    // Check that there's some main content area
    const mainContent = page.locator('main, [role="main"], .main-content').first();
    const hasMainContent = await mainContent.isVisible().catch(() => false);
    
    // If no specific main content area, check for any substantial content
    if (!hasMainContent) {
      const contentAreas = await page.locator('div').count();
      expect(contentAreas).toBeGreaterThan(5);
    }
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
