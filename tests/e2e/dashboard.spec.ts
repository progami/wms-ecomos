import { test, expect } from '@playwright/test'

test.describe('Dashboard Pages', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.describe('Staff Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
    })

    test('quick action cards are clickable', async ({ page }) => {
      // Test each quick action card
      const quickActions = [
        { text: 'Manage Inventory', url: '/operations/inventory' },
        { text: 'Receive Shipments', url: '/operations/receive' },
        { text: 'Ship Orders', url: '/operations/ship' },
        { text: 'Process Invoices', url: '/finance/invoices' },
        { text: 'Cost Rates', url: '/config/rates' },
        { text: 'Reconciliation', url: '/finance/reconciliation' },
        { text: 'Generate Reports', url: '/reports' }
      ]

      for (const action of quickActions) {
        const card = page.locator(`a[href="${action.url}"]`).first()
        if (await card.isVisible()) {
          await expect(card).toContainText(action.text)
          
          // Test navigation
          await card.click()
          await expect(page).toHaveURL(action.url)
          await page.goBack()
        }
      }
    })

    test('dashboard stats are displayed', async ({ page }) => {
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Verify key stats descriptions are visible
      await expect(page.getByText('Cartons across all warehouses')).toBeVisible()
      await expect(page.getByText('Current billing period')).toBeVisible()
      await expect(page.getByText('Products in stock')).toBeVisible()
      await expect(page.getByText('Awaiting reconciliation')).toBeVisible()
    })
  })

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we're logged in as admin
      await page.goto('/admin/dashboard')
    })

    test('time range selector works', async ({ page }) => {
      const timeRangeButton = page.getByRole('button', { name: /current month|last 30 days/i })
      if (await timeRangeButton.isVisible()) {
        await timeRangeButton.click()
        
        // Check dropdown options
        await expect(page.getByRole('menuitem', { name: 'Current Month' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Last 30 Days' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Last 90 Days' })).toBeVisible()
        await expect(page.getByRole('menuitem', { name: 'Year to Date' })).toBeVisible()
        
        // Select an option
        await page.getByRole('menuitem', { name: 'Last 30 Days' }).click()
        await expect(timeRangeButton).toContainText('Last 30 Days')
      }
    })

    test('auto-refresh toggle works', async ({ page }) => {
      const autoRefreshToggle = page.getByRole('button', { name: /auto.*refresh/i })
      if (await autoRefreshToggle.isVisible()) {
        // Get initial state
        const initialPressed = await autoRefreshToggle.getAttribute('aria-pressed')
        
        // Toggle
        await autoRefreshToggle.click()
        
        // Check state changed
        const newPressed = await autoRefreshToggle.getAttribute('aria-pressed')
        expect(newPressed).not.toBe(initialPressed)
      }
    })

    test('manual refresh button works', async ({ page }) => {
      const refreshButton = page.getByRole('button', { name: /refresh/i }).last()
      if (await refreshButton.isVisible()) {
        // Click refresh
        await refreshButton.click()
        
        // Button might show loading state
        await expect(refreshButton).toBeDisabled()
        
        // Wait for refresh to complete
        await expect(refreshButton).toBeEnabled({ timeout: 5000 })
      }
    })

    test('system action buttons trigger actions', async ({ page }) => {
      const actionButtons = [
        { name: 'Export All Data', expectDownload: true },
        { name: 'Import Data', expectToast: true },
        { name: 'Database Backup', expectToast: true },
        { name: 'Generate Reports', expectNavigation: '/admin/reports' },
        { name: 'System Health', expectToast: true },
        { name: 'Notifications', expectNavigation: '/admin/settings/notifications' }
      ]

      for (const action of actionButtons) {
        const button = page.getByRole('button', { name: action.name })
        if (await button.isVisible()) {
          if (action.expectDownload) {
            // Start waiting for download before clicking
            const downloadPromise = page.waitForEvent('download')
            await button.click()
            const download = await downloadPromise
            expect(download).toBeTruthy()
          } else if (action.expectNavigation) {
            await button.click()
            await expect(page).toHaveURL(action.expectNavigation)
            await page.goBack()
          } else if (action.expectToast) {
            await button.click()
            // Wait for toast notification
            await expect(page.locator('.toast, [role="alert"]')).toBeVisible()
          }
        }
      }
    })

    test('chart view toggle works', async ({ page }) => {
      const weeklyButton = page.getByRole('button', { name: 'Weekly' })
      const monthlyButton = page.getByRole('button', { name: 'Monthly' })
      
      if (await weeklyButton.isVisible() && await monthlyButton.isVisible()) {
        // Check initial state
        const weeklyClass = await weeklyButton.getAttribute('class')
        const monthlyClass = await monthlyButton.getAttribute('class')
        
        // One should be active
        expect(weeklyClass?.includes('active') || monthlyClass?.includes('active')).toBeTruthy()
        
        // Toggle to monthly
        await monthlyButton.click()
        await expect(monthlyButton).toHaveClass(/active|selected/)
        
        // Toggle to weekly
        await weeklyButton.click()
        await expect(weeklyButton).toHaveClass(/active|selected/)
      }
    })

    test('quick navigation cards work', async ({ page }) => {
      const navigationCards = [
        { text: 'Inventory Management', url: '/admin/inventory' },
        { text: 'Invoice Management', url: '/admin/invoices' },
        { text: 'Reports & Analytics', url: '/admin/reports' },
        { text: 'Warehouse Settings', url: '/admin/settings/warehouses' },
        { text: 'User Management', url: '/admin/users' },
        { text: 'System Settings', url: '/admin/settings' }
      ]

      for (const card of navigationCards) {
        const link = page.locator(`a[href="${card.url}"]`).first()
        if (await link.isVisible()) {
          await expect(link).toContainText(card.text)
          
          // Test hover state
          await link.hover()
          
          // Test navigation
          await link.click()
          await expect(page).toHaveURL(card.url)
          await page.goBack()
        }
      }
    })
  })
})