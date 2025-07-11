import { test, expect } from '@playwright/test'

// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  // Always try to setup demo first (it will check internally if already exists)
  await page.request.post('http://localhost:3000/api/demo/setup');
  
  // Wait for demo setup to complete
  await page.waitForTimeout(2000);
  
  // Navigate to login page
  await page.goto('http://localhost:3000/auth/login');
  
  // Login with demo credentials
  await page.fill('#emailOrUsername', 'demo-admin');
  await page.fill('#password', 'SecureWarehouse2024!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Handle welcome modal if present
  const welcomeModal = page.locator('dialog:has-text("Welcome to WMS Demo!")');
  if (await welcomeModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    const startBtn = page.locator('button:has-text("Start Exploring")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }
}

test.describe('UI Exploration', () => {
  test('Explore receive goods page', async ({ page }) => {
    await setupDemoAndLogin(page);
    
    // List all links on the page
    const links = await page.locator('a').allTextContents();
    console.log('Available links:', links);
    
    // Try to find receive goods link
    const receiveLink = page.locator('a:has-text("Receive"), a:has-text("receive"), a:has-text("Receiving")').first();
    if (await receiveLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found receive link:', await receiveLink.textContent());
      await receiveLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try navigation menu
      await page.goto('http://localhost:3000/operations/receive');
    }
    
    // Log page content
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Find all form elements
    const selects = await page.locator('select').count();
    const inputs = await page.locator('input').count();
    const buttons = await page.locator('button').allTextContents();
    
    console.log('Form elements found:');
    console.log('- Selects:', selects);
    console.log('- Inputs:', inputs);
    console.log('- Buttons:', buttons);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/receive-goods-page.png', fullPage: true });
  });
  
  test('Explore navigation structure', async ({ page }) => {
    await setupDemoAndLogin(page);
    
    // Find main navigation
    const navLinks = await page.locator('nav a, aside a').allTextContents();
    console.log('Navigation links:', navLinks);
    
    // Check for operations submenu
    const operationsLink = page.locator('a:has-text("Operations")').first();
    if (await operationsLink.isVisible()) {
      await operationsLink.click();
      await page.waitForTimeout(500);
      
      // Check submenu items
      const submenuLinks = await page.locator('a').allTextContents();
      console.log('Submenu links after clicking Operations:', submenuLinks);
    }
  });
});