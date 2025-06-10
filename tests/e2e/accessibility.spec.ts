import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('login page should not have accessibility violations', async ({ page }) => {
    await page.goto('/auth/login')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('dashboard should not have accessibility violations', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.fill('input#emailOrUsername', 'admin')
    await page.fill('input#password', 'SecureWarehouse2024!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/dashboard/)
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('all interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Tab through all interactive elements
    const interactiveElements = await page.$$('button, a, input, select, textarea, [tabindex]')
    
    for (const element of interactiveElements) {
      const isVisible = await element.isVisible()
      if (isVisible) {
        await element.focus()
        const isFocused = await element.evaluate(el => document.activeElement === el)
        expect(isFocused).toBe(true)
      }
    }
  })

  test('all images should have alt text', async ({ page }) => {
    await page.goto('/auth/login')
    
    const images = await page.$$('img')
    for (const img of images) {
      const altText = await img.getAttribute('alt')
      expect(altText).toBeTruthy()
    }
  })

  test('all form inputs should have labels', async ({ page }) => {
    await page.goto('/auth/login')
    
    const inputs = await page.$$('input, select, textarea')
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      if (id) {
        // Check for associated label
        const label = await page.$(`label[for="${id}"]`)
        if (!label) {
          // Check for aria-label
          const ariaLabel = await input.getAttribute('aria-label')
          expect(ariaLabel).toBeTruthy()
        }
      }
    }
  })

  test('color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/auth/login')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({
        checks: [
          {
            id: 'color-contrast',
            options: {
              contrastRatio: {
                normal: {
                  expected: 4.5
                },
                large: {
                  expected: 3
                }
              }
            }
          }
        ]
      })
      .analyze()
    
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(contrastViolations).toEqual([])
  })

  test('page should have proper heading structure', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check for h1
    const h1Elements = await page.$$('h1')
    expect(h1Elements.length).toBeGreaterThan(0)
    expect(h1Elements.length).toBeLessThanOrEqual(1) // Only one h1 per page
    
    // Check heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
      elements.map(el => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim()
      }))
    )
    
    // Verify no heading levels are skipped
    let previousLevel = 0
    for (const heading of headings) {
      expect(heading.level - previousLevel).toBeLessThanOrEqual(1)
      previousLevel = heading.level
    }
  })

  test('focus should be visible on interactive elements', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Tab to first interactive element
    await page.keyboard.press('Tab')
    
    // Check if focus is visible
    const focusedElement = await page.evaluateHandle(() => document.activeElement)
    const hasVisibleFocus = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return (
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        styles.border !== 'none'
      )
    })
    
    expect(hasVisibleFocus).toBe(true)
  })

  test('error messages should be accessible', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Check for aria-live regions or role="alert"
    const alerts = await page.$$('[role="alert"], [aria-live]')
    expect(alerts.length).toBeGreaterThan(0)
  })

  test('loading states should be announced', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Fill form
    await page.fill('input#emailOrUsername', 'admin')
    await page.fill('input#password', 'SecureWarehouse2024!')
    
    // Click submit and check for loading announcement
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Check for aria-busy or loading text
    const hasLoadingState = await submitButton.evaluate(button => {
      return (
        button.getAttribute('aria-busy') === 'true' ||
        button.hasAttribute('disabled') ||
        button.textContent?.toLowerCase().includes('loading')
      )
    })
    
    expect(hasLoadingState).toBe(true)
  })
})