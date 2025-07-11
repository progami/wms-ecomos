import { test, expect } from '@playwright/test'

test('Test auth mode check', async ({ page }) => {
  // Check if USE_TEST_AUTH is set
  console.log('USE_TEST_AUTH:', process.env.USE_TEST_AUTH)
  
  // Try to login with test credentials
  await page.goto('http://localhost:3000/auth/login')
  
  // Fill form
  await page.fill('#emailOrUsername', 'demo-admin')
  await page.fill('#password', 'SecureWarehouse2024!')
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('/api/auth')) {
      console.log('>>> Request:', request.method(), request.url())
    }
  })
  
  page.on('response', response => {
    if (response.url().includes('/api/auth')) {
      console.log('<<< Response:', response.status(), response.url())
    }
  })
  
  // Submit
  await page.click('button[type="submit"]')
  
  // Wait a bit to see what happens
  await page.waitForTimeout(3000)
  
  // Log current state
  const currentUrl = page.url()
  console.log('Current URL:', currentUrl)
  
  // Check if we're still on login page
  if (currentUrl.includes('login')) {
    // Look for error messages
    const errorText = await page.locator('body').textContent()
    console.log('Page content:', errorText)
  }
  
  // Don't assert anything - just log
})
