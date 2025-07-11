import { Page, Locator } from '@playwright/test'

/**
 * Retry an action with exponential backoff
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options

  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
      
      if (onRetry) {
        onRetry(attempt, lastError)
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Wait for page to be stable (no network activity, no animations)
 */
export async function waitForPageStable(page: Page, options: {
  timeout?: number
  waitForNetwork?: boolean
} = {}) {
  const { timeout = 30000, waitForNetwork = true } = options
  
  // Wait for basic load
  await page.waitForLoadState('domcontentloaded', { timeout })
  
  // Optionally wait for network to be idle
  if (waitForNetwork) {
    try {
      await page.waitForLoadState('networkidle', { timeout: timeout / 3 })
    } catch {
      // Network might still be active, continue
    }
  }
  
  // Wait for no animations
  await page.waitForFunction(() => {
    const animations = document.getAnimations()
    return animations.length === 0 || animations.every(a => a.playState !== 'running')
  }, { timeout: 5000 }).catch(() => {
    // Animations might still be running, continue
  })
  
  // Small stability delay
  await page.waitForTimeout(500)
}

/**
 * Navigate to a URL with retry logic
 */
export async function navigateTo(page: Page, url: string, options: {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
  timeout?: number
  retries?: number
} = {}) {
  const { waitUntil = 'domcontentloaded', timeout = 30000, retries = 2 } = options
  
  return retryAction(
    async () => {
      const response = await page.goto(url, { waitUntil, timeout })
      if (!response || !response.ok()) {
        throw new Error(`Navigation to ${url} failed with status ${response?.status()}`)
      }
      return response
    },
    { maxRetries: retries }
  )
}

/**
 * Click and wait for navigation with retry
 */
export async function clickAndNavigate(
  page: Page,
  selector: string,
  options: {
    timeout?: number
    waitForURL?: string | RegExp
  } = {}
) {
  const { timeout = 30000, waitForURL } = options
  
  await retryAction(async () => {
    // Find and click element
    const element = page.locator(selector).first()
    await element.waitFor({ state: 'visible', timeout: timeout / 3 })
    
    // Click and wait for navigation
    const navigationPromise = waitForURL
      ? page.waitForURL(waitForURL, { timeout })
      : page.waitForNavigation({ timeout })
    
    await element.click()
    await navigationPromise
  })
}

/**
 * Wait for any of multiple selectors to appear
 */
export async function waitForAnySelector(
  page: Page,
  selectors: string[],
  options: { timeout?: number } = {}
): Promise<string> {
  const { timeout = 30000 } = options
  
  return page.waitForFunction(
    (sels) => {
      for (const selector of sels) {
        if (document.querySelector(selector)) {
          return selector
        }
      }
      return null
    },
    selectors,
    { timeout }
  ).then(handle => handle.jsonValue() as Promise<string>)
}