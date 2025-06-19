import { Page, expect } from '@playwright/test';

export async function login(page: Page, email = 'test@example.com', password = 'password123') {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
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