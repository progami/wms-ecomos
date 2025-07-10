import { test, expect } from '@playwright/test';

test('simple test to verify CI works', async ({ page }) => {
  // Just check if we can reach the health endpoint
  const response = await page.request.get('/api/health');
  expect(response.status()).toBe(200);
});