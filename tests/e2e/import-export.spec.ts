import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import and Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'SecureWarehouse2024!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');
  });

  test.describe('Inventory Import', () => {
    test('should import inventory from Excel file', async ({ page }) => {
      // Navigate to inventory page
      await page.goto('/operations/inventory');
      
      // Click import button
      await page.click('button:has-text("Import")');
      
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, '../fixtures/test-inventory-import.xlsx');
      await fileInput.setInputFiles(testFile);
      
      // Wait for file analysis
      await page.waitForSelector('text=File analyzed successfully');
      
      // Verify field mappings are detected
      await expect(page.locator('text=Warehouse')).toBeVisible();
      await expect(page.locator('text=SKU Code')).toBeVisible();
      await expect(page.locator('text=Batch/Lot')).toBeVisible();
      
      // Start import
      await page.click('button:has-text("Start Import")');
      
      // Wait for import completion
      await page.waitForSelector('text=Import completed');
      
      // Verify success message
      await expect(page.locator('text=imported successfully')).toBeVisible();
      
      // Verify data appears in inventory list
      await page.goto('/operations/inventory');
      await expect(page.locator('text=TEST-SKU-001')).toBeVisible();
    });

    test('should validate import data before processing', async ({ page }) => {
      await page.goto('/operations/inventory');
      await page.click('button:has-text("Import")');
      
      // Upload file with invalid data
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, '../fixtures/invalid-inventory-import.xlsx');
      await fileInput.setInputFiles(testFile);
      
      // Verify validation errors are shown
      await expect(page.locator('text=Validation errors found')).toBeVisible();
      await expect(page.locator('text=Invalid warehouse code')).toBeVisible();
      await expect(page.locator('text=SKU not found')).toBeVisible();
      
      // Import button should be disabled
      await expect(page.locator('button:has-text("Start Import")')).toBeDisabled();
    });

    test('should allow field mapping customization', async ({ page }) => {
      await page.goto('/operations/inventory');
      await page.click('button:has-text("Import")');
      
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, '../fixtures/custom-columns-import.xlsx');
      await fileInput.setInputFiles(testFile);
      
      // Change field mappings
      await page.selectOption('select[name="warehouseMapping"]', 'Facility Code');
      await page.selectOption('select[name="skuMapping"]', 'Product Code');
      
      // Verify preview updates
      await expect(page.locator('table >> text=Facility Code')).toBeVisible();
      await expect(page.locator('table >> text=Product Code')).toBeVisible();
    });
  });

  test.describe('Inventory Export', () => {
    test('should export inventory ledger to Excel', async ({ page }) => {
      // Navigate to inventory ledger
      await page.goto('/operations/inventory');
      
      // Switch to ledger tab
      await page.click('text=Inventory Ledger');
      
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await page.click('button:has-text("Export")');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify filename
      expect(download.suggestedFilename()).toMatch(/inventory_ledger.*\.xlsx/);
      
      // Save and verify file exists
      const savePath = path.join(__dirname, '../downloads', download.suggestedFilename());
      await download.saveAs(savePath);
    });

    test('should export filtered data', async ({ page }) => {
      await page.goto('/operations/inventory');
      await page.click('text=Inventory Ledger');
      
      // Apply filters
      await page.fill('input[placeholder="Search SKU..."]', 'TEST');
      await page.selectOption('select[name="warehouse"]', 'warehouse-1');
      await page.fill('input[type="date"][name="dateFrom"]', '2024-01-01');
      await page.fill('input[type="date"][name="dateTo"]', '2024-12-31');
      
      // Export filtered data
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export")');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('inventory_ledger');
    });

    test('should export current balances', async ({ page }) => {
      await page.goto('/operations/inventory');
      
      // Stay on current balances tab
      await expect(page.locator('text=Current Balances')).toBeVisible();
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export")');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/inventory_balance.*\.xlsx/);
    });
  });

  test.describe('Bulk Operations Import', () => {
    test('should import transactions in bulk', async ({ page }) => {
      await page.goto('/operations/transactions');
      await page.click('button:has-text("Import")');
      
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, '../fixtures/bulk-transactions.xlsx');
      await fileInput.setInputFiles(testFile);
      
      // Verify preview shows multiple rows
      await expect(page.locator('text=100 rows detected')).toBeVisible();
      
      // Start import
      await page.click('button:has-text("Start Import")');
      
      // Monitor progress
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('text=100 transactions imported', { timeout: 30000 });
    });

    test('should handle import errors gracefully', async ({ page }) => {
      await page.goto('/operations/transactions');
      await page.click('button:has-text("Import")');
      
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, '../fixtures/mixed-valid-invalid.xlsx');
      await fileInput.setInputFiles(testFile);
      
      await page.click('button:has-text("Start Import")');
      
      // Should show partial success
      await expect(page.locator('text=Import completed with errors')).toBeVisible();
      await expect(page.locator('text=Successfully imported: 8')).toBeVisible();
      await expect(page.locator('text=Failed: 2')).toBeVisible();
      
      // Should allow downloading error report
      await expect(page.locator('button:has-text("Download Error Report")')).toBeVisible();
    });
  });

  test.describe('Template Downloads', () => {
    test('should download import templates', async ({ page }) => {
      await page.goto('/operations/inventory');
      await page.click('button:has-text("Import")');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('a:has-text("Download Template")');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toBe('inventory_import_template.xlsx');
    });
  });

  test.describe('Export Configurations', () => {
    test('should remember export preferences', async ({ page }) => {
      await page.goto('/operations/inventory');
      
      // Open export dialog
      await page.click('button:has-text("Export")');
      await page.click('button:has-text("Configure Export")');
      
      // Select columns to export
      await page.uncheck('input[name="includeCreatedAt"]');
      await page.uncheck('input[name="includeUpdatedAt"]');
      await page.check('input[name="includeWarehouseName"]');
      
      // Save configuration
      await page.click('button:has-text("Save Configuration")');
      
      // Export with saved config
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export with Saved Config")');
      await downloadPromise;
      
      // Verify config persists on reload
      await page.reload();
      await page.click('button:has-text("Export")');
      await page.click('button:has-text("Configure Export")');
      
      await expect(page.locator('input[name="includeCreatedAt"]')).not.toBeChecked();
      await expect(page.locator('input[name="includeUpdatedAt"]')).not.toBeChecked();
      await expect(page.locator('input[name="includeWarehouseName"]')).toBeChecked();
    });
  });
});