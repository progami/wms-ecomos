import { test, expect } from '@playwright/test';
import { uploadFile } from './utils/test-helpers';
import path from 'path';


// Helper to ensure demo is set up before login
async function ensureDemoSetup(page: any) {
  // Check if demo is already set up
  const response = await page.request.get('http://localhost:3000/api/demo/status');
  const status = await response.json();
  
  if (!status.isDemoMode) {
    // Setup demo if not already done
    await page.request.post('http://localhost:3000/api/demo/setup');
    // Wait for demo setup to complete
    await page.waitForTimeout(2000);
  }
}

// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  await ensureDemoSetup(page);
  
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

test.describe('Import/Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication or login
    // await login(page);
  });

  test('should import SKU data from Excel', async ({ page }) => {
    await page.goto('/operations/import-attributes');
    
    // Select import type
    await page.selectOption('select[name="importType"]', 'sku');
    
    // Upload file
    const filePath = path.join(__dirname, 'fixtures', 'sample-skus.xlsx');
    await uploadFile(page, 'input[type="file"]', filePath);
    
    // Preview data
    await page.click('button:has-text("Preview")');
    
    // Verify preview table
    await expect(page.locator('table[data-testid="preview-table"]')).toBeVisible();
    
    // Import data
    await page.click('button:has-text("Import")');
    
    // Wait for success message
    await expect(page.locator('text="Import completed successfully"')).toBeVisible();
  });

  test('should download import template', async ({ page }) => {
    await page.goto('/operations/import-attributes');
    
    // Download template
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download Template")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('template');
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/);
  });

  test('should export inventory data', async ({ page }) => {
    await page.goto('/operations/inventory');
    
    // Click export button
    await page.click('button:has-text("Export")');
    
    // Select format
    await page.click('button:has-text("Excel")');
    
    // Configure export options
    await page.check('input[name="includeZeroQuantity"]');
    await page.selectOption('select[name="warehouseFilter"]', 'all');
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('inventory');
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('should validate import file format', async ({ page }) => {
    await page.goto('/operations/import-attributes');
    
    // Try to upload invalid file
    const filePath = path.join(__dirname, 'fixtures', 'invalid-file.txt');
    await uploadFile(page, 'input[type="file"]', filePath);
    
    // Should show error
    await expect(page.locator('text="Invalid file format"')).toBeVisible();
  });

  test('should show import validation errors', async ({ page }) => {
    await page.goto('/operations/import-attributes');
    
    // Select import type
    await page.selectOption('select[name="importType"]', 'warehouse');
    
    // Upload file with validation errors
    const filePath = path.join(__dirname, 'fixtures', 'warehouses-with-errors.xlsx');
    await uploadFile(page, 'input[type="file"]', filePath);
    
    // Preview data
    await page.click('button:has-text("Preview")');
    
    // Should show validation errors
    await expect(page.locator('text="Validation errors found"')).toBeVisible();
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
  });

  test('should export transaction history', async ({ page }) => {
    await page.goto('/operations/transactions');
    
    // Set date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Transactions")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('transactions');
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/);
  });
});
}
