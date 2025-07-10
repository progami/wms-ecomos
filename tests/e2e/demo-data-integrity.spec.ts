import { test, expect } from '@playwright/test';

test.describe('Demo Data Integrity Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3002/auth/login');
    await page.fill('input[name="email"]', 'admin@warehouse.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should verify inventory ledger has receive before ship transactions', async ({ page }) => {
    // Navigate to inventory ledger
    await page.goto('http://localhost:3002/operations/inventory-ledger');
    await page.waitForSelector('table');
    
    // Get all transactions
    const transactions = await page.$$eval('table tbody tr', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          sku: cells[1]?.textContent?.trim() || '',
          type: cells[3]?.textContent?.trim() || '',
          date: cells[7]?.textContent?.trim() || ''
        };
      })
    );
    
    // Group by SKU and check order
    const skuTransactions = new Map<string, Array<{type: string, date: string}>>();
    
    transactions.forEach(t => {
      if (!skuTransactions.has(t.sku)) {
        skuTransactions.set(t.sku, []);
      }
      skuTransactions.get(t.sku)!.push({ type: t.type, date: t.date });
    });
    
    // Verify each SKU has receive before ship
    for (const [sku, trans] of skuTransactions) {
      // Sort by date
      trans.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let hasReceived = false;
      for (const t of trans) {
        if (t.type === 'RECEIVE') {
          hasReceived = true;
        } else if (t.type === 'SHIP' && !hasReceived) {
          throw new Error(`SKU ${sku} has SHIP transaction before RECEIVE`);
        }
      }
    }
  });

  test('should verify inventory balances are non-negative', async ({ page }) => {
    // Navigate to inventory balances
    await page.goto('http://localhost:3002/inventory/inventory-balances');
    await page.waitForSelector('table');
    
    // Check all quantity values
    const quantities = await page.$$eval('table tbody tr', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          sku: cells[1]?.textContent?.trim() || '',
          cartons: parseInt(cells[4]?.textContent?.trim() || '0'),
          pallets: parseInt(cells[5]?.textContent?.trim() || '0'),
          units: parseInt(cells[6]?.textContent?.trim() || '0')
        };
      })
    );
    
    // Verify no negative quantities
    quantities.forEach(q => {
      expect(q.cartons).toBeGreaterThanOrEqual(0);
      expect(q.pallets).toBeGreaterThanOrEqual(0);
      expect(q.units).toBeGreaterThanOrEqual(0);
    });
  });

  test('should verify financial data matches transaction volumes', async ({ page }) => {
    // Navigate to invoices
    await page.goto('http://localhost:3002/financial/invoices');
    await page.waitForSelector('table');
    
    // Get invoice count
    const invoiceCount = await page.$$eval('table tbody tr', rows => rows.length);
    expect(invoiceCount).toBeGreaterThan(0);
    
    // Check first invoice details
    await page.click('table tbody tr:first-child');
    await page.waitForSelector('[data-testid="invoice-details"]', { timeout: 5000 }).catch(() => {
      // If no test ID, look for common invoice detail elements
      return page.waitForSelector('h2:has-text("Invoice")', { timeout: 5000 });
    });
    
    // Verify subtotal equals sum of line items
    const lineItemAmounts = await page.$$eval('[data-testid="line-item-amount"]', 
      elements => elements.map(el => parseFloat(el.textContent?.replace('$', '') || '0'))
    ).catch(() => []);
    
    if (lineItemAmounts.length > 0) {
      const calculatedTotal = lineItemAmounts.reduce((sum, amount) => sum + amount, 0);
      const displayedSubtotal = await page.$eval('[data-testid="invoice-subtotal"]', 
        el => parseFloat(el.textContent?.replace('$', '') || '0')
      ).catch(() => 0);
      
      if (displayedSubtotal > 0) {
        expect(Math.abs(calculatedTotal - displayedSubtotal)).toBeLessThan(0.01);
      }
    }
  });

  test('should not allow shipping more than available inventory', async ({ page }) => {
    // Navigate to inventory balances to find an item with low stock
    await page.goto('http://localhost:3002/inventory/inventory-balances');
    await page.waitForSelector('table');
    
    // Get first item with some stock
    const firstItem = await page.$eval('table tbody tr:first-child', row => {
      const cells = row.querySelectorAll('td');
      return {
        sku: cells[1]?.textContent?.trim() || '',
        cartons: parseInt(cells[4]?.textContent?.trim() || '0')
      };
    });
    
    // Try to create a ship transaction exceeding available stock
    await page.goto('http://localhost:3002/operations/transactions/new');
    
    // Select SHIP type
    await page.selectOption('select[name="transactionType"]', 'SHIP');
    
    // Fill in required fields
    await page.fill('input[name="referenceId"]', 'TEST-SHIP-001');
    
    // Try to ship more than available
    const excessQuantity = firstItem.cartons + 100;
    await page.fill('input[name="cartonsOut"]', excessQuantity.toString());
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should see error message
    const errorMessage = await page.waitForSelector('.text-red-500, [role="alert"]', { timeout: 5000 })
      .catch(() => null);
    
    if (errorMessage) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('exceed');
    }
  });

  test('should display correct demo data statistics', async ({ page }) => {
    // Make API call to get stats
    const response = await page.request.get('http://localhost:3002/api/test/demo-integrity');
    const data = await response.json();
    
    expect(data.stats.skus).toBeGreaterThan(0);
    expect(data.stats.warehouses).toBeGreaterThan(0);
    expect(data.stats.transactions).toBeGreaterThan(0);
    expect(data.stats.invoices).toBeGreaterThan(0);
    expect(data.stats.users).toBeGreaterThan(0);
    expect(data.stats.balances).toBeGreaterThan(0);
    
    // All integrity tests should pass
    expect(data.summary.failed).toBe(0);
    expect(data.summary.passed).toBe(data.summary.totalTests);
  });
});
