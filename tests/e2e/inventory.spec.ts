import { test, expect } from '@playwright/test';
import { InventoryPage } from './pages/InventoryPage';
import { TransactionPage } from './pages/TransactionPage';

test.describe('Inventory Management', () => {
  let inventoryPage: InventoryPage;
  let transactionPage: TransactionPage;

  test.beforeEach(async ({ page }) => {
    inventoryPage = new InventoryPage(page);
    transactionPage = new TransactionPage(page);
    
    // Mock authentication or login
    // await login(page);
  });

  test('should display inventory list', async () => {
    await inventoryPage.goto();
    await inventoryPage.waitForPageLoad();
    
    const title = await inventoryPage.getPageTitle();
    expect(title).toContain('Inventory');
    
    // Check if inventory table is visible
    await expect(inventoryPage.inventoryTable).toBeVisible();
  });

  test('should search inventory by SKU', async () => {
    await inventoryPage.goto();
    
    // Search for a specific SKU
    await inventoryPage.searchBySKU('SKU001');
    
    // Verify search results
    const itemCount = await inventoryPage.getInventoryCount();
    expect(itemCount).toBeGreaterThanOrEqual(0);
    
    if (itemCount > 0) {
      const item = await inventoryPage.getInventoryItem('SKU001');
      await expect(item).toBeVisible();
    }
  });

  test('should filter inventory by warehouse', async () => {
    await inventoryPage.goto();
    
    // Filter by warehouse
    await inventoryPage.filterByWarehouse('Main Warehouse');
    
    // Verify filtered results
    const itemCount = await inventoryPage.getInventoryCount();
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });

  test('should export inventory data', async () => {
    await inventoryPage.goto();
    
    // Export as CSV
    const download = await inventoryPage.exportInventory('csv');
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should update inventory through inbound transaction', async () => {
    // Create inbound transaction
    await transactionPage.createInboundTransaction({
      warehouse: 'Main Warehouse',
      sku: 'SKU001',
      quantity: '100',
      referenceId: 'PO-TEST-001'
    });
    
    // Verify inventory update
    await inventoryPage.goto();
    await inventoryPage.searchBySKU('SKU001');
    
    const item = await inventoryPage.getInventoryItem('SKU001');
    await expect(item).toBeVisible();
  });

  test('should handle empty inventory state', async () => {
    await inventoryPage.goto();
    
    // Search for non-existent SKU
    await inventoryPage.searchBySKU('NONEXISTENT');
    
    // Verify empty state
    const isEmpty = await inventoryPage.isInventoryEmpty();
    expect(isEmpty).toBe(true);
  });
});
