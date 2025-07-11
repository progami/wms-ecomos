import { test, expect } from '@playwright/test'

test.describe('🔐 Authentication Runtime Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/')
  })

  test('Landing page loads and displays correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/WMS/)
    
    // The landing page should redirect to /auth/login
    await page.waitForURL('**/auth/login', { timeout: 5000 })
    
    // Check login page elements
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    await expect(page.locator('#emailOrUsername')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    
    // Take screenshot for visual regression
    await page.screenshot({ path: 'tests/screenshots/landing-page.png', fullPage: true })
  })

  test.skip('Try Demo button creates demo environment', async ({ page }) => {
    // SKIPPED: Landing page redirects to login, no "Try Demo" button in current implementation
    // Demo setup is handled via API in test mode
  })

  test('Sign In navigation works correctly', async ({ page }) => {
    // Landing page automatically redirects to login
    await page.waitForURL('**/auth/login', { timeout: 5000 })
    
    // Verify we're on login page
    await expect(page.locator('h2')).toContainText('Sign in to your account')
    
    // Check form elements
    await expect(page.locator('#emailOrUsername')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Login form validation', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login')
    
    // Test empty form submission
    await page.click('button[type="submit"]')
    
    // Check for validation messages - HTML5 validation
    const emailInput = page.locator('#emailOrUsername')
    const passwordInput = page.locator('#password')
    
    await expect(emailInput).toHaveAttribute('required')
    await expect(passwordInput).toHaveAttribute('required')
    
    // Test with only username
    await page.fill('#emailOrUsername', 'testuser')
    await page.click('button[type="submit"]')
    
    // Password should still be required
    const passwordRequired = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(passwordRequired).toBeTruthy()
    
    // In test auth mode, any credentials work
    await page.fill('#emailOrUsername', 'test@example.com')
    await page.fill('#password', 'test123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 })
  })

  test.skip('Demo login flow', async ({ page }) => {
    // SKIPPED: "Try Demo" button doesn't exist on landing page
    // Demo setup is handled via API in test mode
  })

  test('Logout functionality', async ({ page }) => {
    // First login using test auth
    await page.goto('/auth/login')
    await page.fill('input[name="emailOrUsername"]', 'test@example.com')
    await page.fill('input[name="password"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    
    // Wait for page to stabilize
    await page.waitForTimeout(1000)
    
    // Find and click sign out button
    await page.locator('button:has-text("Sign out")').click({ timeout: 5000 })
    
    // Verify redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 10000 })
    await expect(page.locator('h2')).toContainText('Sign in to your account')
  })

  test('Protected route redirects to login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/dashboard')
    
    // Should redirect to login (with callback URL)
    await page.waitForURL((url) => url.pathname.includes('/auth/login'), { timeout: 5000 })
    await expect(page.locator('h2')).toContainText('Sign in to your account')
  })

  test('Session persistence', async ({ page, context }) => {
    // Login with test auth first
    await page.goto('/auth/login')
    await page.fill('input[name="emailOrUsername"]', 'test@example.com')
    await page.fill('input[name="password"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    
    // Wait for page to stabilize
    await page.waitForTimeout(1000)
    
    // Open new tab
    const newPage = await context.newPage()
    await newPage.goto('/dashboard')
    
    // Should still be logged in
    await expect(newPage.locator('h1')).toContainText('Dashboard')
    
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
    
    // Test touch interactions - use click instead of tap for now
    await page.click('#emailOrUsername')
    await page.fill('#emailOrUsername', 'demo@test.com')
    
    await page.click('#password')
    await page.fill('#password', 'password123')
    
    // Screenshot for mobile view
    await page.screenshot({ path: 'tests/screenshots/login-mobile.png' })
  })
})
