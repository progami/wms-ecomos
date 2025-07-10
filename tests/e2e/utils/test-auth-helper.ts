import { Page } from '@playwright/test';

/**
 * Helper to authenticate in test mode
 * When USE_TEST_AUTH=true, this will bypass normal auth and use test credentials
 */
export async function loginInTestMode(page: Page) {
  // In test mode, we can login with any credentials
  await page.goto('/auth/login');
  
  // Fill in test credentials
  await page.fill('input[name="emailOrUsername"]', 'test@example.com');
  await page.fill('input[name="password"]', 'test123');
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL((url) => !url.toString().includes('login'), {
    timeout: 10000,
    waitUntil: 'networkidle'
  });
}

/**
 * Helper to check if we're authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Try to access a protected route
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  
  // If we're redirected to login, we're not authenticated
  const currentUrl = page.url();
  return !currentUrl.includes('login');
}