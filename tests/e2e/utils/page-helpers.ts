import { Page } from '@playwright/test'

/**
 * Wait for the page to be fully loaded and interactive
 */
export async function waitForPageReady(page: Page) {
  // Wait for DOM to be loaded first
  await page.waitForLoadState('domcontentloaded')
  
  // Try to wait for network idle, but don't fail if it times out
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  } catch {
    // Network might still be active, continue anyway
  }
  
  // Wait for any loading indicators to disappear
  const loadingIndicators = [
    '.loading',
    '[data-loading="true"]',
    '.spinner',
    '.skeleton'
  ]
  
  for (const selector of loadingIndicators) {
    const loader = page.locator(selector)
    if (await loader.count() > 0) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
        // Ignore if not found
      })
    }
  }
  
  // Give the page a moment to stabilize
  await page.waitForTimeout(500)
}

/**
 * Close any modals that might be open
 */
export async function closeModals(page: Page) {
  // Close welcome modal if present
  const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
  if (await welcomeModal.isVisible({ timeout: 1000 })) {
    const closeButton = page.locator('button:has-text("Start Exploring"), button:has-text("Close")')
    if (await closeButton.isVisible()) {
      await closeButton.click()
      await page.waitForTimeout(500)
    }
  }
  
  // Close any other modals
  const genericCloseButtons = page.locator('button[aria-label="Close"], button:has-text("×")')
  const count = await genericCloseButtons.count()
  for (let i = 0; i < count; i++) {
    const button = genericCloseButtons.nth(i)
    if (await button.isVisible()) {
      await button.click({ force: true })
      await page.waitForTimeout(200)
    }
  }
}

/**
 * Wait for navigation elements to be ready
 */
export async function waitForNavigation(page: Page) {
  // Wait for main navigation to be visible
  const nav = page.locator('nav, [role="navigation"], .sidebar').first()
  await nav.waitFor({ state: 'visible', timeout: 10000 })
  
  // Ensure navigation links are loaded
  const navLinks = nav.locator('a')
  await navLinks.first().waitFor({ state: 'visible', timeout: 5000 })
}