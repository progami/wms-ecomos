import { test, expect } from '@playwright/test';

test.describe('Test Authentication Verification', () => {
  test('Test auth mode is enabled and working', async ({ page }) => {
    // This test specifically verifies that USE_TEST_AUTH=true is working correctly
    
    // 1. Try to login with test credentials
    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    
    // Fill in ANY credentials (test auth should accept anything)
    await page.fill('input[name="emailOrUsername"]', 'test@example.com');
    await page.fill('input[name="password"]', 'test123');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation - should redirect away from login
    await page.waitForURL((url) => !url.toString().includes('login'), {
      timeout: 10000,
      waitUntil: 'networkidle'
    });
    
    // Verify we're now on a protected page (dashboard or home)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).toMatch(/\/(dashboard|$)/);
    
    // 2. Verify we can access protected routes
    const protectedRoutes = [
      '/dashboard',
      '/operations/inventory',
      '/finance/invoices'
    ];
    
    for (const route of protectedRoutes) {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(400);
      
      // Should not redirect to login
      expect(page.url()).not.toContain('login');
    }
    
    // 3. Verify the session is working
    // Try to access the API directly
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/auth/session');
      return {
        status: res.status,
        data: await res.json()
      };
    });
    
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.user).toBeDefined();
    expect(apiResponse.data.user.email).toBe('test@example.com');
    
    console.log('✅ Test authentication is working correctly!');
  });
});