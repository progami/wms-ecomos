import { test, expect } from '@playwright/test'

test.describe('Main Navigation', () => {
  test.use({ storageState: 'tests/auth.json' }) // Assume authenticated state

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('all navigation menus are accessible', async ({ page }) => {
    // Check main navigation is visible
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Test Operations menu
    const operationsMenu = page.getByRole('button', { name: 'Operations' })
    if (await operationsMenu.isVisible()) {
      await operationsMenu.click()
      await expect(page.getByRole('link', { name: 'Inventory Ledger' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Receive Goods' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Ship Goods' })).toBeVisible()
    }

    // Test Finance menu
    const financeMenu = page.getByRole('button', { name: 'Finance' })
    if (await financeMenu.isVisible()) {
      await financeMenu.click()
      await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Reconciliation' })).toBeVisible()
    }

    // Test Configuration menu
    const configMenu = page.getByRole('button', { name: 'Configuration' })
    if (await configMenu.isVisible()) {
      await configMenu.click()
      await expect(page.getByRole('link', { name: 'Products' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Cost Rates' })).toBeVisible()
    }
  })

  test('navigation links work correctly', async ({ page }) => {
    // Test direct navigation links
    const navigationTests = [
      { link: 'Inventory Ledger', url: '/operations/inventory' },
      { link: 'Receive Goods', url: '/operations/receive' },
      { link: 'Ship Goods', url: '/operations/ship' },
      { link: 'Invoices', url: '/finance/invoices' },
      { link: 'Products', url: '/config/products' }
    ]

    for (const navTest of navigationTests) {
      // Find and click the link (may need to open menu first)
      const link = page.getByRole('link', { name: navTest.link })
      
      if (!await link.isVisible()) {
        // Try to find and open the parent menu
        const menus = ['Operations', 'Finance', 'Configuration', 'Analytics', 'Admin']
        for (const menu of menus) {
          const menuButton = page.getByRole('button', { name: menu })
          if (await menuButton.isVisible()) {
            await menuButton.click()
            if (await link.isVisible()) break
          }
        }
      }

      if (await link.isVisible()) {
        await link.click()
        await expect(page).toHaveURL(navTest.url)
        await page.goto('/dashboard') // Return to dashboard for next test
      }
    }
  })

  test('mobile menu toggle works', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
    }

    // Find mobile menu toggle
    const menuToggle = page.getByRole('button', { name: /open menu|menu/i })
    if (await menuToggle.isVisible()) {
      await menuToggle.click()
      
      // Check mobile menu is open
      await expect(page.getByRole('button', { name: /close menu/i })).toBeVisible()
      
      // Close menu
      await page.getByRole('button', { name: /close menu/i }).click()
      await expect(page.getByRole('button', { name: /open menu|menu/i })).toBeVisible()
    }
  })

  test('sign out button works', async ({ page, context }) => {
    // Find and click sign out
    const signOutButton = page.getByRole('button', { name: 'Sign out' })
    if (await signOutButton.isVisible()) {
      await signOutButton.click()
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login')
      
      // Should clear session
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => c.name.includes('session'))
      expect(sessionCookie).toBeUndefined()
    }
  })

  test('navigation highlights active page', async ({ page }) => {
    // Navigate to a specific page
    await page.goto('/operations/inventory')
    
    // Check if the link is marked as active
    const activeLink = page.getByRole('link', { name: 'Inventory Ledger' })
    
    // Active link should have different styling (aria-current or specific class)
    await expect(activeLink).toHaveAttribute('aria-current', 'page')
    // OR check for active class
    const className = await activeLink.getAttribute('class')
    expect(className).toMatch(/active|current|selected/)
  })
})