import { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  // Navigate to login page
  await page.goto('/auth/login', { waitUntil: 'networkidle' })
  
  // In test mode (USE_TEST_AUTH=true), any credentials work
  // Use consistent test credentials
  await page.fill('#emailOrUsername', 'test@example.com')
  await page.fill('#password', 'test123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for either dashboard or home page (which redirects to dashboard)
  try {
    await page.waitForURL((url) => {
      const urlStr = url.toString()
      return urlStr.includes('/dashboard') || (urlStr.endsWith('/') && !urlStr.includes('/auth/login'))
    }, { timeout: 30000 })
  } catch (error) {
    // If no redirect happened, we might still be on login with an error
    const errorMessage = await page.locator('text=Invalid').isVisible().catch(() => false)
    if (errorMessage) {
      throw new Error('Login failed: Invalid credentials')
    }
    throw error
  }
  
  // If we're on home page, it should redirect to dashboard
  if (page.url().endsWith('/') && !page.url().includes('/dashboard')) {
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  }
}

export async function loginWithQuickFill(page: Page, userType: 'Admin' | 'Finance' | 'Operations') {
  // Navigate to login page
  await page.goto('/auth/login', { waitUntil: 'networkidle' })
  
  // Click the quick fill button
  const button = page.locator(`button:has-text("${userType}")`).first()
  if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
    await button.click()
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 30000 })
  } else {
    throw new Error(`Quick fill button for ${userType} not found`)
  }
}

export async function setupDemoAndLogin(page: Page) {
  // In test mode, we don't need demo setup - just login directly
  if (process.env.USE_TEST_AUTH === 'true') {
    await loginAsAdmin(page)
    return
  }
  
  // Original demo setup code for non-test environments
  // Navigate to home page
  await page.goto('/', { waitUntil: 'networkidle' })
  
  // Click Try Demo button
  const tryDemoButton = page.locator('button:has-text("Try Demo")')
  if (await tryDemoButton.isVisible()) {
    await tryDemoButton.click()
    
    // Wait for demo setup and navigation
    try {
      await page.waitForURL((url) => {
        const urlStr = url.toString()
        return urlStr.includes('/dashboard') || (urlStr.endsWith('/') && !urlStr.includes('/auth/login'))
      }, { timeout: 30000 })
    } catch (error) {
      // Check if there was an error during demo setup
      const errorToast = await page.locator('text=Failed to set up demo').isVisible().catch(() => false)
      if (errorToast) {
        throw new Error('Demo setup failed')
      }
      throw error
    }
    
    // If we're on home page, wait for redirect to dashboard
    if (page.url().endsWith('/') && !page.url().includes('/dashboard')) {
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    }
  } else {
    throw new Error('Try Demo button not found')
  }
}

export async function logout(page: Page) {
  // Click on user menu
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Account"), button:has-text("admin")')
  if (await userMenu.isVisible()) {
    await userMenu.click()
    
    // Click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")')
    await logoutButton.click()
    
    // Wait for redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 10000 })
  }
}