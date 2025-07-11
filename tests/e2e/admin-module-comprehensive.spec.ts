import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:3000'
const ADMIN_CREDENTIALS = {
  username: 'test@example.com',
  password: 'test123'
}

// Helper functions
async function loginAsAdmin(page: Page) {
  // Use test auth mode - login with admin role
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('#emailOrUsername', 'admin@test.com')
  await page.fill('#password', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  
  // Close welcome modal if present
  const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
  if (await welcomeModal.isVisible({ timeout: 2000 })) {
    await page.click('button:has-text("Start Exploring")')
    await page.waitForTimeout(500)
  }
}

async function navigateToAdminSection(page: Page, section: string) {
  // Navigate directly to the admin section
  if (section === 'User Management') {
    await page.goto(`${BASE_URL}/admin/users`)
  } else if (section === 'Settings') {
    await page.goto(`${BASE_URL}/admin/settings`)
  } else if (section === 'Audit Logs') {
    await page.goto(`${BASE_URL}/admin/audit-logs`)
  } else if (section === 'Roles & Permissions') {
    await page.goto(`${BASE_URL}/admin/roles`)
  } else if (section === 'System Health') {
    await page.goto(`${BASE_URL}/admin/system-health`)
  } else if (section === 'Backup & Recovery') {
    await page.goto(`${BASE_URL}/admin/backup`)
  } else if (section === 'Notifications') {
    await page.goto(`${BASE_URL}/admin/notifications`)
  }
}

test.describe('Admin Module - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'User Management')
  })

  test('User management page displays correctly', async ({ page }) => {
    // Check if page is under construction
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
      await expect(page.locator('text="Coming Soon"')).toBeVisible()
    } else {
      // If implemented, check basic structure
      await expect(page.locator('h1')).toContainText('User')
    }
  })
})

test.describe('Admin Module - System Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Settings')
  })

  test('Settings page displays correctly', async ({ page }) => {
    // Check if page is under construction
    const pageTitle = await page.locator('h1').textContent()
    if (pageTitle?.includes('Under Construction')) {
      await expect(page.locator('text="This page is currently under development"')).toBeVisible()
      await expect(page.locator('text="Coming Soon"')).toBeVisible()
    } else {
      // If implemented, check basic structure
      await expect(page.locator('h1')).toContainText('Settings')
    }
  })
})

test.describe('Admin Module - Access Control', () => {
  test('Admin sections are only accessible to admin users', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Admin should be able to see admin navigation items
    // First check if admin section exists in the nav
    const adminSection = page.locator('text="ADMIN"').first()
    if (await adminSection.isVisible({ timeout: 2000 })) {
      await expect(page.locator('a[href="/admin/users"]')).toBeVisible()
      await expect(page.locator('a[href="/admin/settings"]')).toBeVisible()
    } else {
      // If admin section not visible, try navigating directly
      await page.goto(`${BASE_URL}/admin/users`)
      // Should be able to access without redirect
      await expect(page.url()).toContain('/admin/users')
    }
  })

  test('Non-admin users cannot access admin sections', async ({ page }) => {
    // Login as non-admin user in test mode
    await page.goto(`${BASE_URL}/auth/login`)
    await page.fill('#emailOrUsername', 'user@test.com')
    await page.fill('#password', 'user123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    
    // Close welcome modal if present
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
    if (await welcomeModal.isVisible({ timeout: 2000 })) {
      await page.click('button:has-text("Start Exploring")')
      await page.waitForTimeout(500)
    }
    
    // Staff should not see admin navigation items
    await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible()
    await expect(page.locator('a[href="/admin/settings"]')).not.toBeVisible()
    
    // Direct navigation should be blocked
    await page.goto(`${BASE_URL}/admin/users`)
    
    // Should either redirect or show unauthorized
    const url = page.url()
    const hasUnauthorized = await page.locator('text="Unauthorized"').isVisible({ timeout: 2000 }).catch(() => false)
    const hasAccessDenied = await page.locator('text="Access Denied"').isVisible({ timeout: 2000 }).catch(() => false)
    
    expect(
      url.includes('/unauthorized') || 
      url.includes('/login') || 
      hasUnauthorized || 
      hasAccessDenied ||
      !url.includes('/admin/users')
    ).toBeTruthy()
  })
})

test.describe('Admin Module - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Admin navigation links are functional', async ({ page }) => {
    // Check if admin navigation is visible
    const adminUsersLink = page.locator('a[href="/admin/users"]')
    const adminSettingsLink = page.locator('a[href="/admin/settings"]')
    
    if (await adminUsersLink.isVisible({ timeout: 2000 })) {
      // Test Users link
      await adminUsersLink.click()
      await page.waitForURL('**/admin/users')
      await expect(page.locator('h1')).toBeVisible()
      
      // Test Settings link
      await adminSettingsLink.click()
      await page.waitForURL('**/admin/settings')
      await expect(page.locator('h1')).toBeVisible()
    } else {
      // Navigate directly if links not visible
      await page.goto(`${BASE_URL}/admin/users`)
      await expect(page.locator('h1')).toBeVisible()
      
      await page.goto(`${BASE_URL}/admin/settings`)
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})

test.describe('Admin Module - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('Admin pages work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to admin section
    await page.goto(`${BASE_URL}/admin/users`)
    
    // Page should be responsive
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Admin pages work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Navigate to admin section
    await page.goto(`${BASE_URL}/admin/settings`)
    
    // Page should be responsive
    await expect(page.locator('h1')).toBeVisible()
  })
})
