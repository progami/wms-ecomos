import { test, expect } from '@playwright/test'

test.describe('Admin Settings', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.describe('Settings Hub', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/settings')
    })

    test('settings navigation cards', async ({ page }) => {
      // Check all setting cards are visible
      await expect(page.getByRole('link', { name: /general settings/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /security settings/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /database settings/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /notification settings/i })).toBeVisible()
      
      // Test navigation
      await page.getByRole('link', { name: /general settings/i }).click()
      await expect(page).toHaveURL('/admin/settings/general')
      await page.goBack()
      
      await page.getByRole('link', { name: /security settings/i }).click()
      await expect(page).toHaveURL('/admin/settings/security')
    })
  })

  test.describe('General Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/settings/general')
    })

    test('general settings form', async ({ page }) => {
      // Check form fields
      await expect(page.locator('input[name="companyName"]')).toBeVisible()
      await expect(page.locator('select[name="timezone"]')).toBeVisible()
      await expect(page.locator('select[name="dateFormat"]')).toBeVisible()
      await expect(page.locator('select[name="currency"]')).toBeVisible()
      
      // Fill form
      const companyInput = page.locator('input[name="companyName"]')
      await companyInput.clear()
      await companyInput.fill('Test Company Inc.')
      
      // Select timezone
      await page.selectOption('select[name="timezone"]', 'America/New_York')
      
      // Select date format
      await page.selectOption('select[name="dateFormat"]', 'MM/DD/YYYY')
      
      // Select currency
      await page.selectOption('select[name="currency"]', 'USD')
      
      // Save settings
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Check success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/saved|updated/i)
    })
  })

  test.describe('Security Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/settings/security')
    })

    test('password policy configuration', async ({ page }) => {
      // Check form fields
      await expect(page.locator('input[name="minPasswordLength"]')).toBeVisible()
      await expect(page.locator('input[name="requireUppercase"]')).toBeVisible()
      await expect(page.locator('input[name="requireNumbers"]')).toBeVisible()
      await expect(page.locator('input[name="requireSymbols"]')).toBeVisible()
      await expect(page.locator('input[name="sessionTimeout"]')).toBeVisible()
      
      // Set minimum password length
      const minLengthInput = page.locator('input[name="minPasswordLength"]')
      await minLengthInput.clear()
      await minLengthInput.fill('12')
      
      // Check policy options
      await page.locator('input[name="requireUppercase"]').check()
      await page.locator('input[name="requireNumbers"]').check()
      await page.locator('input[name="requireSymbols"]').check()
      
      // Set session timeout
      const timeoutInput = page.locator('input[name="sessionTimeout"]')
      await timeoutInput.clear()
      await timeoutInput.fill('30')
      
      // Save settings
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/saved|updated/i)
    })

    test('validation for security settings', async ({ page }) => {
      // Try invalid minimum length
      const minLengthInput = page.locator('input[name="minPasswordLength"]')
      await minLengthInput.clear()
      await minLengthInput.fill('3') // Too short
      
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Should show validation error
      await expect(page.getByText(/minimum.*8/i)).toBeVisible()
      
      // Fix and retry
      await minLengthInput.clear()
      await minLengthInput.fill('8')
      
      // Invalid session timeout
      const timeoutInput = page.locator('input[name="sessionTimeout"]')
      await timeoutInput.clear()
      await timeoutInput.fill('0')
      
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Should show validation error
      await expect(page.getByText(/timeout.*greater/i)).toBeVisible()
    })
  })

  test.describe('Notification Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/settings/notifications')
    })

    test('email configuration', async ({ page }) => {
      // Check SMTP fields
      await expect(page.locator('input[name="smtpHost"]')).toBeVisible()
      await expect(page.locator('input[name="smtpPort"]')).toBeVisible()
      await expect(page.locator('input[name="smtpUser"]')).toBeVisible()
      await expect(page.locator('input[name="smtpPassword"]')).toBeVisible()
      
      // Fill SMTP configuration
      await page.fill('input[name="smtpHost"]', 'smtp.example.com')
      await page.fill('input[name="smtpPort"]', '587')
      await page.fill('input[name="smtpUser"]', 'notifications@example.com')
      await page.fill('input[name="smtpPassword"]', 'smtp-password')
      
      // Save settings
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/saved|updated/i)
    })

    test('send test email', async ({ page }) => {
      // First configure SMTP
      await page.fill('input[name="smtpHost"]', 'smtp.example.com')
      await page.fill('input[name="smtpPort"]', '587')
      await page.fill('input[name="smtpUser"]', 'test@example.com')
      await page.fill('input[name="smtpPassword"]', 'password')
      
      // Click test email button
      const testButton = page.getByRole('button', { name: 'Send Test Email' })
      await testButton.click()
      
      // Button should show loading state
      await expect(testButton).toBeDisabled()
      await expect(testButton).toContainText(/sending/i)
      
      // Wait for result
      await expect(testButton).toBeEnabled({ timeout: 10000 })
      
      // Should show result message
      await expect(page.locator('.toast, [role="alert"]')).toBeVisible()
    })
  })

  test.describe('Database Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/settings/database')
    })

    test('database backup', async ({ page }) => {
      // Check backup button
      const backupButton = page.getByRole('button', { name: /backup.*database/i })
      await expect(backupButton).toBeVisible()
      
      // Start backup
      await backupButton.click()
      
      // Should show progress
      await expect(backupButton).toBeDisabled()
      await expect(backupButton).toContainText(/backing up|processing/i)
      
      // Wait for completion
      await expect(backupButton).toBeEnabled({ timeout: 30000 })
      
      // Success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/backup.*complete/i)
    })

    test('database optimization', async ({ page }) => {
      const optimizeButton = page.getByRole('button', { name: /optimize/i })
      if (await optimizeButton.isVisible()) {
        await optimizeButton.click()
        
        // Confirm dialog might appear
        const confirmDialog = page.getByRole('dialog')
        if (await confirmDialog.isVisible()) {
          await confirmDialog.getByRole('button', { name: 'Confirm' }).click()
        }
        
        // Wait for optimization
        await expect(optimizeButton).toBeDisabled()
        await expect(optimizeButton).toBeEnabled({ timeout: 30000 })
        
        // Success message
        await expect(page.locator('.toast, [role="alert"]')).toContainText(/optimiz/i)
      }
    })
  })

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/users')
    })

    test('user list and search', async ({ page }) => {
      // Check page elements
      await expect(page.getByRole('heading', { name: /users/i })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()
      
      // Search functionality
      const searchInput = page.locator('input[placeholder*="Search users"]')
      await searchInput.fill('admin')
      await searchInput.press('Enter')
      
      // Check filtered results
      await page.waitForTimeout(500)
      const userRows = page.locator('table tbody tr')
      if (await userRows.count() > 0) {
        const firstRow = userRows.first()
        const text = await firstRow.textContent()
        expect(text?.toLowerCase()).toContain('admin')
      }
    })

    test('add user modal', async ({ page }) => {
      await page.getByRole('button', { name: 'Add User' }).click()
      
      // Modal should open
      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()
      
      // Check form fields
      await expect(modal.locator('input[name="fullName"]')).toBeVisible()
      await expect(modal.locator('input[name="email"]')).toBeVisible()
      await expect(modal.locator('input[name="username"]')).toBeVisible()
      await expect(modal.locator('select[name="role"]')).toBeVisible()
      await expect(modal.locator('input[name="password"]')).toBeVisible()
      
      // Fill form
      await modal.fill('input[name="fullName"]', 'Test User')
      await modal.fill('input[name="email"]', 'testuser@example.com')
      await modal.fill('input[name="username"]', 'testuser')
      await modal.selectOption('select[name="role"]', 'staff')
      await modal.fill('input[name="password"]', 'TestPassword123!')
      
      // Save user
      await modal.getByRole('button', { name: 'Save' }).click()
      
      // Modal should close
      await expect(modal).not.toBeVisible()
      
      // Success message
      await expect(page.locator('.toast, [role="alert"]')).toContainText(/created|added/i)
    })

    test('user actions', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first()
      
      if (await firstRow.isVisible()) {
        // Test edit button
        await firstRow.getByRole('button', { name: 'Edit' }).click()
        
        // Edit modal should open
        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible()
        
        // Close modal
        await modal.getByRole('button', { name: 'Cancel' }).click()
        
        // Test reset password
        const resetButton = firstRow.getByRole('button', { name: 'Reset Password' })
        if (await resetButton.isVisible()) {
          await resetButton.click()
          
          // Confirm dialog
          await page.getByRole('button', { name: 'Confirm' }).click()
          
          // Success message
          await expect(page.locator('.toast, [role="alert"]')).toContainText(/reset|password/i)
        }
        
        // Test toggle active status
        const toggleSwitch = firstRow.locator('button[role="switch"]')
        if (await toggleSwitch.isVisible()) {
          const initialState = await toggleSwitch.getAttribute('aria-checked')
          await toggleSwitch.click()
          
          // State should change
          await page.waitForTimeout(500)
          const newState = await toggleSwitch.getAttribute('aria-checked')
          expect(newState).not.toBe(initialState)
        }
      }
    })
  })
})