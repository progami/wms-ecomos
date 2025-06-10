import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  // Don't use auth state for login tests
  test.use({ storageState: { cookies: [], origins: [] } })
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('login page elements are visible', async ({ page }) => {
    // Check form elements
    await expect(page.locator('input#emailOrUsername')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    // Check labels
    await expect(page.getByText('Email or Username')).toBeVisible()
    await expect(page.getByText('Password')).toBeVisible()
  })

  test('login with valid credentials', async ({ page }) => {
    // Fill login form - using admin username
    await page.fill('input#emailOrUsername', 'admin')
    await page.fill('input#password', 'SecureWarehouse2024!')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for navigation or error
    const response = await Promise.race([
      page.waitForURL((url) => url.pathname !== '/auth/login', { timeout: 5000 }).then(() => 'navigated'),
      page.getByText('Invalid credentials').waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error')
    ]).catch(() => 'timeout')
    
    // Assert successful login
    if (response === 'error') {
      throw new Error('Login failed with "Invalid credentials" error')
    } else if (response === 'timeout') {
      throw new Error('Login timeout - neither navigation nor error occurred')
    }
    
    // Verify we're on admin dashboard
    await expect(page).toHaveURL(/\/(admin\/)?dashboard/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('input#emailOrUsername', 'invalid@example.com')
    await page.fill('input#password', 'wrongpassword')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for error message to appear
    await page.waitForTimeout(1000)
    
    // Check for error message - looking for the toast notification
    const errorVisible = await page.getByText('Invalid email/username or password').isVisible().catch(() => false)
    
    if (!errorVisible) {
      // Check if the error is shown in a different way
      const pageText = await page.textContent('body')
      expect(pageText).toContain('Invalid')
    } else {
      expect(errorVisible).toBe(true)
    }
  })

  test('login form validation', async ({ page }) => {
    // Clear the form fields to ensure they're empty
    await page.fill('input#emailOrUsername', '')
    await page.fill('input#password', '')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Since the form has required attributes, the browser won't submit
    // Check that we're still on the login page
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/auth/login')
    
    // Verify required attributes are present
    await expect(page.locator('input#emailOrUsername')).toHaveAttribute('required', '')
    await expect(page.locator('input#password')).toHaveAttribute('required', '')
  })

  test('password field is masked', async ({ page }) => {
    const passwordInput = page.locator('input#password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('login button shows loading state', async ({ page }) => {
    // Fill form with correct credentials
    await page.fill('input#emailOrUsername', 'admin')
    await page.fill('input#password', 'SecureWarehouse2024!')
    
    // Click and check for loading state
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Button should show loading indicator or be disabled
    await expect(submitButton).toBeDisabled()
  })
})