import { test, expect } from '@playwright/test';

test('simple test to verify CI works', async ({ page }) => {
  // Just check if we can reach the health endpoint
  // In CI, we use a simpler health-ci endpoint
  const healthEndpoint = process.env.CI ? '/api/health-ci' : '/api/health';
  const response = await page.request.get(healthEndpoint);
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data).toHaveProperty('status');
});
