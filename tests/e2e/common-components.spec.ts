import { test, expect } from '@playwright/test'

test.describe('Common UI Components', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.describe('Confirm Dialog', () => {
    test('confirm dialog interactions', async ({ page }) => {
      // Navigate to a page with delete functionality
      await page.goto('/config/products')
      
      const firstRow = page.locator('table tbody tr').first()
      if (await firstRow.isVisible()) {
        // Trigger confirm dialog
        await firstRow.getByRole('button', { name: 'Delete' }).click()
        
        // Dialog should be visible
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        
        // Check dialog content
        await expect(dialog).toContainText(/are you sure|confirm/i)
        await expect(dialog.getByRole('button', { name: 'Confirm' })).toBeVisible()
        await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
        
        // Test close button (X)
        const closeButton = dialog.getByRole('button', { name: 'Close' })
        if (await closeButton.isVisible()) {
          await closeButton.click()
          await expect(dialog).not.toBeVisible()
          
          // Re-open dialog
          await firstRow.getByRole('button', { name: 'Delete' }).click()
        }
        
        // Test cancel button
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).not.toBeVisible()
        
        // Re-open and test confirm
        await firstRow.getByRole('button', { name: 'Delete' }).click()
        await dialog.getByRole('button', { name: 'Confirm' }).click()
        
        // Dialog should close and action should complete
        await expect(dialog).not.toBeVisible()
        await expect(page.locator('.toast, [role="alert"]')).toBeVisible()
      }
    })

    test('escape key closes dialog', async ({ page }) => {
      await page.goto('/config/products')
      
      const firstRow = page.locator('table tbody tr').first()
      if (await firstRow.isVisible()) {
        await firstRow.getByRole('button', { name: 'Delete' }).click()
        
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        
        // Press escape
        await page.keyboard.press('Escape')
        
        // Dialog should close
        await expect(dialog).not.toBeVisible()
      }
    })
  })

  test.describe('Toast Notifications', () => {
    test('toast appears and can be dismissed', async ({ page }) => {
      await page.goto('/config/products/new')
      
      // Fill minimal form
      await page.fill('input[name="skuCode"]', 'TOAST-TEST')
      await page.fill('input[name="description"]', 'Toast Test')
      await page.fill('input[name="unitsPerCarton"]', '12')
      
      // Submit to trigger success toast
      await page.getByRole('button', { name: 'Save' }).click()
      
      // Toast should appear
      const toast = page.locator('.toast, [role="alert"]').first()
      await expect(toast).toBeVisible()
      
      // Check for close button
      const closeButton = toast.locator('button[aria-label="Close notification"]')
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(toast).not.toBeVisible()
      } else {
        // Wait for auto-dismiss
        await expect(toast).not.toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Pagination', () => {
    test('pagination controls work correctly', async ({ page }) => {
      await page.goto('/finance/invoices')
      
      const pagination = page.locator('.pagination, [role="navigation"]')
      if (await pagination.isVisible()) {
        const prevButton = pagination.getByRole('button', { name: /previous/i })
        const nextButton = pagination.getByRole('button', { name: /next/i })
        
        // Initially on first page
        await expect(prevButton).toBeDisabled()
        
        // If next is enabled, test navigation
        if (await nextButton.isEnabled()) {
          // Go to next page
          await nextButton.click()
          await page.waitForTimeout(500)
          
          // Previous should now be enabled
          await expect(prevButton).toBeEnabled()
          
          // Check page indicator updated
          const pageIndicator = pagination.locator('.page-indicator, [aria-current="page"]')
          if (await pageIndicator.isVisible()) {
            await expect(pageIndicator).toContainText('2')
          }
          
          // Go back to first page
          await prevButton.click()
          await page.waitForTimeout(500)
          
          // Previous should be disabled again
          await expect(prevButton).toBeDisabled()
        }
      }
    })

    test('direct page navigation', async ({ page }) => {
      await page.goto('/finance/invoices')
      
      const pagination = page.locator('.pagination, [role="navigation"]')
      if (await pagination.isVisible()) {
        // Look for page number buttons
        const page2Button = pagination.getByRole('button', { name: '2' })
        if (await page2Button.isVisible()) {
          await page2Button.click()
          await page.waitForTimeout(500)
          
          // Should be on page 2
          await expect(page2Button).toHaveAttribute('aria-current', 'page')
          
          // Try page 3
          const page3Button = pagination.getByRole('button', { name: '3' })
          if (await page3Button.isVisible()) {
            await page3Button.click()
            await page.waitForTimeout(500)
            await expect(page3Button).toHaveAttribute('aria-current', 'page')
          }
        }
      }
    })
  })

  test.describe('Table Interactions', () => {
    test('sortable columns', async ({ page }) => {
      await page.goto('/operations/inventory')
      
      // Find sortable column header
      const dateHeader = page.getByRole('columnheader', { name: /date/i }).first()
      if (await dateHeader.isVisible()) {
        // Check for sort indicator
        const sortIndicator = dateHeader.locator('[aria-sort]')
        const initialSort = await sortIndicator.getAttribute('aria-sort')
        
        // Click to sort
        await dateHeader.click()
        await page.waitForTimeout(500)
        
        // Sort should change
        const newSort = await sortIndicator.getAttribute('aria-sort')
        expect(newSort).not.toBe(initialSort)
        
        // Click again to reverse sort
        await dateHeader.click()
        await page.waitForTimeout(500)
        
        const finalSort = await sortIndicator.getAttribute('aria-sort')
        expect(finalSort).not.toBe(newSort)
      }
    })

    test('row selection checkboxes', async ({ page }) => {
      await page.goto('/admin/users')
      
      const table = page.locator('table')
      if (await table.isVisible()) {
        // Check for select all checkbox
        const selectAll = table.locator('thead input[type="checkbox"][aria-label*="Select all"]')
        if (await selectAll.isVisible()) {
          // Select all
          await selectAll.check()
          
          // All row checkboxes should be checked
          const rowCheckboxes = table.locator('tbody input[type="checkbox"]')
          const count = await rowCheckboxes.count()
          for (let i = 0; i < count; i++) {
            await expect(rowCheckboxes.nth(i)).toBeChecked()
          }
          
          // Unselect all
          await selectAll.uncheck()
          
          // All should be unchecked
          for (let i = 0; i < count; i++) {
            await expect(rowCheckboxes.nth(i)).not.toBeChecked()
          }
          
          // Select individual rows
          if (count > 0) {
            await rowCheckboxes.first().check()
            await expect(rowCheckboxes.first()).toBeChecked()
            
            // Select all should be indeterminate or unchecked
            const selectAllChecked = await selectAll.isChecked()
            const selectAllIndeterminate = await selectAll.evaluate(el => el.indeterminate)
            expect(selectAllChecked || selectAllIndeterminate).toBeTruthy()
          }
        }
      }
    })
  })

  test.describe('Empty States', () => {
    test('empty state displays correctly', async ({ page }) => {
      await page.goto('/operations/inventory')
      
      // Apply filter that returns no results
      const searchInput = page.locator('input[placeholder*="Search"]')
      await searchInput.fill('NONEXISTENT_SKU_12345')
      await searchInput.press('Enter')
      await page.waitForTimeout(500)
      
      // Check empty state
      const emptyState = page.locator('[data-testid="empty-state"], .empty-state')
      await expect(emptyState).toBeVisible()
      
      // Should have icon, title, and description
      await expect(emptyState.locator('svg')).toBeVisible()
      await expect(emptyState).toContainText(/no.*found/i)
      await expect(emptyState).toContainText(/try.*adjusting.*search/i)
      
      // Clear search to show results again
      await searchInput.clear()
      await searchInput.press('Enter')
      await page.waitForTimeout(500)
      
      // Empty state should be gone
      await expect(emptyState).not.toBeVisible()
    })
  })

  test.describe('Loading States', () => {
    test('loading spinner appears during data fetch', async ({ page }) => {
      // Slow down network to see loading states
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 1000)
      })
      
      await page.goto('/operations/inventory')
      
      // Check for loading spinner
      const spinner = page.locator('.animate-spin, [role="progressbar"], .loading-spinner')
      await expect(spinner).toBeVisible()
      
      // Wait for content
      await expect(spinner).not.toBeVisible({ timeout: 10000 })
      
      // Content should be loaded
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Tooltips', () => {
    test('tooltips appear on hover', async ({ page }) => {
      await page.goto('/operations/inventory')
      
      // Find element with tooltip
      const infoIcon = page.locator('.lucide-info, [aria-label*="info"]').first()
      if (await infoIcon.isVisible()) {
        // Hover to show tooltip
        await infoIcon.hover()
        
        // Tooltip should appear
        const tooltip = page.locator('[role="tooltip"], .tooltip')
        await expect(tooltip).toBeVisible()
        
        // Move mouse away
        await page.mouse.move(0, 0)
        
        // Tooltip should disappear
        await expect(tooltip).not.toBeVisible()
      }
    })
  })

  test.describe('Tab Navigation', () => {
    test('tab key navigation works', async ({ page }) => {
      await page.goto('/operations/receive')
      
      // Focus first input
      const firstInput = page.locator('input').first()
      await firstInput.focus()
      
      // Tab to next input
      await page.keyboard.press('Tab')
      
      // Check focus moved
      const activeElement = page.locator(':focus')
      const tagName = await activeElement.evaluate(el => el.tagName.toLowerCase())
      expect(['input', 'select', 'textarea', 'button']).toContain(tagName)
      
      // Tab through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
      }
      
      // Shift+Tab to go back
      await page.keyboard.press('Shift+Tab')
      
      // Should still be on a focusable element
      const newActiveElement = page.locator(':focus')
      const newTagName = await newActiveElement.evaluate(el => el.tagName.toLowerCase())
      expect(['input', 'select', 'textarea', 'button', 'a']).toContain(newTagName)
    })
  })
})