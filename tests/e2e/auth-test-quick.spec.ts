import { test, expect } from '@playwright/test';
import { login, loginAsDemo } from './utils/test-helpers';

test.describe('Quick Authentication Test', () => {
  test('Can login with seeded admin user', async ({ page }) => {
    await login(page, 'admin@warehouse.com', 'SecureWarehouse2024!');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('Can login with demo mode', async ({ page }) => {
    await loginAsDemo(page);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('Invalid login shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#emailOrUsername', 'invalid@test.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should see error message
    const errorText = page.locator('text=Invalid');
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });
});