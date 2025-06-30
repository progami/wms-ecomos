import { test, expect } from '@playwright/test'

test.describe('🔐 Authentication Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Landing page loads and displays correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Warehouse Management System/)
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Modern Warehouse')
    
    // Check key buttons are visible
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible()
    await expect(page.locator('a:has-text("Sign In")')).toBeVisible()
    
    // Take screenshot for visual regression
    await page.screenshot({ path: 'tests/screenshots/landing-page.png', fullPage: true })
  })

  test('Try Demo button creates demo environment', async ({ page }) => {
    // Click Try Demo button
    await page.click('button:has-text("Try Demo")')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Verify we're on dashboard
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check for demo user indicator
    await expect(page.locator('text=Demo Mode')).toBeVisible()
  })

  test('Sign In navigation works correctly', async ({ page }) => {
    // Click Sign In link
    await page.click('a:has-text("Sign In")')
    
    // Verify we're on login page
    await page.waitForURL('**/auth/login')
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    
    // Check form elements
    await expect(page.locator('#emailOrUsername')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Login form validation', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Test empty form submission
    await page.click('button[type="submit"]')
    
    // Check for validation messages
    await expect(page.locator('#emailOrUsername')).toHaveAttribute('required')
    await expect(page.locator('#password')).toHaveAttribute('required')
    
    // Test with only username
    await page.fill('#emailOrUsername', 'testuser')
    await page.click('button[type="submit"]')
    await expect(page.locator('#password')).toHaveAttribute('required')
    
    // Test with invalid credentials
    await page.fill('#emailOrUsername', 'invalid@test.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Wait for error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 })
  })

  test('Demo login flow', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Click Try Demo button on login page
    await page.click('button:has-text("Try Demo")')
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Verify demo user is logged in
    await expect(page.locator('text=Demo Admin')).toBeVisible()
    
    // Check navigation menu is visible
    await expect(page.locator('nav')).toBeVisible()
    
    // Verify key menu items
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('a:has-text("Inventory")')).toBeVisible()
    await expect(page.locator('a:has-text("Transactions")')).toBeVisible()
  })

  test('Logout functionality', async ({ page }) => {
    // First login with demo
    await page.goto('/auth/login')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Find and click user menu
    await page.click('button[aria-label="User menu"]')
    
    // Click logout
    await page.click('text=Sign out')
    
    // Verify redirect to login page
    await page.waitForURL('**/auth/login')
    await expect(page.locator('h2')).toContainText('Sign in to your account')
  })

  test('Protected route redirects to login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/dashboard')
    
    // Should redirect to login
    await page.waitForURL('**/auth/login')
    await expect(page.locator('h2')).toContainText('Sign in to your account')
  })

  test('Session persistence', async ({ page, context }) => {
    // Login with demo
    await page.goto('/auth/login')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Open new tab
    const newPage = await context.newPage()
    await newPage.goto('/dashboard')
    
    // Should still be logged in
    await expect(newPage.locator('h1')).toContainText('Dashboard')
    await expect(newPage.locator('text=Demo Admin')).toBeVisible()
    
    await newPage.close()
  })

  test('Mobile responsive login', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/auth/login')
    
    // Check mobile layout
    await expect(page.locator('h2')).toBeVisible()
    await expect(page.locator('#emailOrUsername')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    
    // Test touch interactions
    await page.tap('#emailOrUsername')
    await page.fill('#emailOrUsername', 'demo@test.com')
    
    await page.tap('#password')
    await page.fill('#password', 'password123')
    
    // Screenshot for mobile view
    await page.screenshot({ path: 'tests/screenshots/login-mobile.png' })
  })
})