import { test, expect } from '@playwright/test';

test('simple test to verify CI works', async ({ page }) => {
  // Just check if we can reach the health endpoint
  const response = await page.request.get('http://localhost:3000/api/health');
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data).toHaveProperty('status');
  expect(data.status).toBe('ok');
});
