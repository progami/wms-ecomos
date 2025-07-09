import { Page, expect } from '@playwright/test';

export async function login(page: Page, email = 'admin@warehouse.com', password = 'SecureWarehouse2024!') {
  await page.goto('/auth/login');
  
  // Wait for page to be ready
  await page.waitForLoadState('networkidle');
  
  // Fill credentials
  await page.fill('#emailOrUsername', email);
  await page.fill('#password', password);
  
  // Click submit and wait for either success or error
  await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/auth/callback/credentials') || 
      response.url().includes('/api/auth/signin'),
      { timeout: 10000 }
    ),
    page.click('button[type="submit"]')
  ]);
  
  // Wait a moment for any redirects
  await page.waitForTimeout(1000);
  
  // Check if we got an error
  const errorVisible = await page.locator('text=Invalid').isVisible();
  if (errorVisible) {
    throw new Error('Login failed - Invalid credentials');
  }
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

export async function waitForToast(page: Page, message: string) {
  const toast = page.locator(`text="${message}"`);
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    await input.fill(value);
  }
}

export async function selectOption(page: Page, name: string, value: string) {
  await page.selectOption(`select[name="${name}"]`, value);
}

export async function uploadFile(page: Page, selector: string, filePath: string) {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

export async function clickAndWaitForNavigation(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector)
  ]);
}

export async function takeScreenshotOnFailure(page: Page, testName: string) {
  const screenshotPath = `screenshots/${testName}-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

export async function loginAsDemo(page: Page) {
  // Go to landing page where the demo button is located
  await page.goto('/');
  
  // Look for the Try Demo button on the landing page
  const demoButton = page.locator('button:has-text("Try Demo")').first();
  
  if (await demoButton.isVisible()) {
    // Click the demo button and wait for it to process
    await demoButton.click();
    
    // Wait for either the dashboard URL or handle any intermediate steps
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Handle welcome modal if it appears
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"');
    if (await welcomeModal.isVisible({ timeout: 5000 })) {
      const startExploringButton = page.locator('button:has-text("Start Exploring")');
      if (await startExploringButton.isVisible()) {
        await startExploringButton.click();
        // Wait for modal to close
        await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
      }
    }
  } else {
    // Fallback: go to login page and use demo-admin credentials directly
    await page.goto('/auth/login');
    await page.fill('#emailOrUsername', 'demo-admin');
    await page.fill('#password', 'SecureWarehouse2024!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Handle welcome modal in fallback scenario too
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"');
    if (await welcomeModal.isVisible({ timeout: 5000 })) {
      const startExploringButton = page.locator('button:has-text("Start Exploring")');
      if (await startExploringButton.isVisible()) {
        await startExploringButton.click();
        await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
      }
    }
  }
}