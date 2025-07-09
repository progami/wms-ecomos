import { test, expect } from '@playwright/test';

test('Detailed auth debug', async ({ page }) => {
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('/api/auth')) {
      console.log('>>>', request.method(), request.url());
      console.log('>>> Headers:', request.headers());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/auth')) {
      console.log('<<<', response.status(), response.url());
    }
  });
  
  // Go to login page
  await page.goto('http://localhost:3000/auth/login');
  await page.waitForLoadState('networkidle');
  
  // Fill form
  await page.fill('#emailOrUsername', 'admin@warehouse.com');
  await page.fill('#password', 'SecureWarehouse2024!');
  
  // Intercept the auth response
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/callback/credentials')
  );
  
  // Click submit
  await page.click('button[type="submit"]');
  
  // Wait for response
  try {
    const response = await responsePromise;
    console.log('\nAuth Response:');
    console.log('Status:', response.status());
    console.log('Headers:', response.headers());
    const body = await response.text();
    console.log('Body:', body);
  } catch (error) {
    console.error('No auth response received');
  }
  
  // Wait a bit
  await page.waitForTimeout(2000);
  
  // Check for toast messages
  const toasts = await page.locator('[role="alert"]').allTextContents();
  if (toasts.length > 0) {
    console.log('\nToast messages:', toasts);
  }
  
  // Check current URL
  console.log('\nFinal URL:', page.url());
});