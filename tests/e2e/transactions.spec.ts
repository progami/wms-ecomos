import { test, expect } from '@playwright/test';
import { TransactionPage } from './pages/TransactionPage';

test.describe('Transaction Management', () => {
  let transactionPage: TransactionPage;

  test.beforeEach(async ({ page }) => {
    transactionPage = new TransactionPage(page);
    // Mock authentication or login
    // await login(page);
  });

  test('should create inbound transaction', async () => {
    await transactionPage.gotoReceive();
    
    const initialCount = await transactionPage.getTransactionCount();
    
    // Create new inbound transaction
    await transactionPage.createInboundTransaction({
      warehouse: 'Main Warehouse',
      sku: 'SKU001',
      quantity: '50',
      referenceId: 'PO-TEST-002'
    });
    
    // Verify transaction was created
    const newCount = await transactionPage.getTransactionCount();
    expect(newCount).toBe(initialCount + 1);
    
    // Verify latest transaction details
    const latestTransaction = await transactionPage.getLatestTransaction();
    await expect(latestTransaction).toContainText('INBOUND');
    await expect(latestTransaction).toContainText('50');
  });

  test('should create outbound transaction', async () => {
    await transactionPage.gotoShip();
    
    const initialCount = await transactionPage.getTransactionCount();
    
    // Create new outbound transaction
    await transactionPage.createOutboundTransaction({
      warehouse: 'Main Warehouse',
      sku: 'SKU001',
      quantity: '25',
      referenceId: 'SO-TEST-001'
    });
    
    // Verify transaction was created
    const newCount = await transactionPage.getTransactionCount();
    expect(newCount).toBe(initialCount + 1);
    
    // Verify latest transaction details
    const latestTransaction = await transactionPage.getLatestTransaction();
    await expect(latestTransaction).toContainText('OUTBOUND');
    await expect(latestTransaction).toContainText('25');
  });

  test('should validate transaction form', async () => {
    await transactionPage.gotoReceive();
    await transactionPage.newTransactionButton.click();
    
    // Try to submit empty form
    await transactionPage.submitButton.click();
    
    // Check for validation errors
    await expect(transactionPage.page.locator('text="Required"')).toBeVisible();
  });

  test('should view transaction details', async ({ page }) => {
    await transactionPage.gotoReceive();
    
    // Assuming there's at least one transaction
    const transactionCount = await transactionPage.getTransactionCount();
    if (transactionCount > 0) {
      // Click on first transaction
      const firstTransaction = await transactionPage.getLatestTransaction();
      const transactionNumber = await firstTransaction.locator('td').first().textContent();
      
      if (transactionNumber) {
        await transactionPage.viewTransactionDetails(transactionNumber);
        
        // Verify we're on details page
        await expect(page).toHaveURL(/\/operations\/transactions\/\d+/);
        await expect(page.locator('h1')).toContainText('Transaction Details');
      }
    }
  });

  test('should handle insufficient inventory for outbound', async () => {
    await transactionPage.gotoShip();
    await transactionPage.newTransactionButton.click();
    
    // Try to ship more than available
    await transactionPage.warehouseSelect.selectOption({ label: 'Main Warehouse' });
    await transactionPage.skuInput.fill('SKU001');
    await transactionPage.quantityInput.fill('999999'); // Unrealistic quantity
    
    await transactionPage.submitButton.click();
    
    // Should show error
    await expect(transactionPage.page.locator('text="Insufficient inventory"')).toBeVisible();
  });
});
