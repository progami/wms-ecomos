import { test, expect } from '@playwright/test';
import { format, subDays, addDays } from 'date-fns';

test.describe('Invoice Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'SecureWarehouse2024!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard');
  });

  test.describe('Invoice Creation', () => {
    test('should create invoice from calculated costs', async ({ page }) => {
      // Navigate to invoices
      await page.goto('/finance/invoices');
      
      // Click create new invoice
      await page.click('button:has-text("New Invoice")');
      await page.waitForURL('**/finance/invoices/new');
      
      // Fill invoice details
      const invoiceNumber = `INV-${Date.now()}`;
      await page.fill('input[name="invoiceNumber"]', invoiceNumber);
      
      // Select warehouse
      await page.click('button[role="combobox"]:has-text("Select warehouse")');
      await page.click('div[role="option"]:has-text("Warehouse A")');
      
      // Set billing period (16th to 15th)
      const billingStart = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 16), 'yyyy-MM-dd');
      const billingEnd = format(new Date(new Date().getFullYear(), new Date().getMonth(), 15), 'yyyy-MM-dd');
      
      await page.fill('input[name="billingPeriodStart"]', billingStart);
      await page.fill('input[name="billingPeriodEnd"]', billingEnd);
      
      // Set invoice date and due date
      const invoiceDate = format(new Date(), 'yyyy-MM-dd');
      const dueDate = format(addDays(new Date(), 15), 'yyyy-MM-dd');
      
      await page.fill('input[name="invoiceDate"]', invoiceDate);
      await page.fill('input[name="dueDate"]', dueDate);
      
      // Click calculate costs button
      await page.click('button:has-text("Calculate Costs")');
      
      // Wait for cost calculation
      await page.waitForSelector('text=Costs calculated successfully');
      
      // Verify cost line items appear
      await expect(page.locator('text=Weekly Pallet Storage')).toBeVisible();
      await expect(page.locator('text=Inbound Carton Handling')).toBeVisible();
      
      // Verify total amount is calculated
      const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();
      expect(totalAmount).toMatch(/\$[\d,]+\.\d{2}/);
      
      // Save invoice
      await page.click('button:has-text("Create Invoice")');
      
      // Wait for success and redirect
      await page.waitForURL('**/finance/invoices');
      await expect(page.locator(`text=${invoiceNumber}`)).toBeVisible();
    });

    test('should validate invoice number uniqueness', async ({ page }) => {
      await page.goto('/finance/invoices/new');
      
      // Try to create invoice with existing number
      await page.fill('input[name="invoiceNumber"]', 'INV-2024-001');
      await page.click('button[role="combobox"]:has-text("Select warehouse")');
      await page.click('div[role="option"]:first-child');
      
      await page.fill('input[name="billingPeriodStart"]', '2024-01-16');
      await page.fill('input[name="billingPeriodEnd"]', '2024-02-15');
      await page.fill('input[name="invoiceDate"]', '2024-02-16');
      
      await page.click('button:has-text("Calculate Costs")');
      await page.waitForSelector('[data-testid="total-amount"]');
      
      await page.click('button:has-text("Create Invoice")');
      
      // Should show error
      await expect(page.locator('text=Invoice number already exists')).toBeVisible();
    });

    test('should handle manual line item adjustments', async ({ page }) => {
      await page.goto('/finance/invoices/new');
      
      const invoiceNumber = `INV-${Date.now()}`;
      await page.fill('input[name="invoiceNumber"]', invoiceNumber);
      
      await page.click('button[role="combobox"]:has-text("Select warehouse")');
      await page.click('div[role="option"]:first-child');
      
      await page.fill('input[name="billingPeriodStart"]', '2024-01-16');
      await page.fill('input[name="billingPeriodEnd"]', '2024-02-15');
      await page.fill('input[name="invoiceDate"]', '2024-02-16');
      
      // Add manual line item
      await page.click('button:has-text("Add Line Item")');
      
      await page.selectOption('select[name="lineItems.0.costCategory"]', 'Accessorial');
      await page.fill('input[name="lineItems.0.costName"]', 'Special Handling Fee');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitRate"]', '250');
      
      // Verify amount is calculated
      await expect(page.locator('input[name="lineItems.0.amount"]')).toHaveValue('250.00');
      
      // Calculate other costs
      await page.click('button:has-text("Calculate Costs")');
      
      // Verify manual item is preserved
      await expect(page.locator('text=Special Handling Fee')).toBeVisible();
      
      await page.click('button:has-text("Create Invoice")');
      await page.waitForURL('**/finance/invoices');
    });
  });

  test.describe('Invoice Management', () => {
    test('should update invoice status', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Click on first invoice
      await page.click('table tbody tr:first-child');
      
      // Wait for invoice detail page
      await page.waitForSelector('text=Invoice Details');
      
      // Change status to paid
      await page.click('button:has-text("Mark as Paid")');
      
      // Confirm action
      await page.click('button:has-text("Confirm")');
      
      // Verify status updated
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Paid');
      
      // Verify audit log entry
      await expect(page.locator('text=Status changed to paid')).toBeVisible();
    });

    test('should handle invoice reconciliation', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Filter for pending invoices
      await page.click('button:has-text("Status")');
      await page.click('label:has-text("Pending")');
      await page.click('button:has-text("Apply")');
      
      // Click on first pending invoice
      await page.click('table tbody tr:first-child');
      
      // Start reconciliation
      await page.click('button:has-text("Reconcile")');
      
      // Fill reconciliation details
      await page.fill('textarea[name="reconciliationNotes"]', 'Verified all line items against transactions');
      
      // Upload supporting document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./fixtures/reconciliation-doc.pdf');
      
      // Mark specific line items as verified
      await page.check('input[name="lineItem-0-verified"]');
      await page.check('input[name="lineItem-1-verified"]');
      
      // Complete reconciliation
      await page.click('button:has-text("Complete Reconciliation")');
      
      // Verify status changed
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Reconciled');
    });

    test('should dispute invoice with reason', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Click on invoice
      await page.click('table tbody tr:first-child');
      
      // Click dispute button
      await page.click('button:has-text("Dispute")');
      
      // Fill dispute form
      await page.selectOption('select[name="disputeReason"]', 'incorrect-quantity');
      await page.fill('textarea[name="disputeDetails"]', 'Carton count does not match our records. Should be 150, not 200.');
      
      // Attach evidence
      const fileInput = page.locator('input[type="file"][name="disputeEvidence"]');
      await fileInput.setInputFiles('./fixtures/dispute-evidence.xlsx');
      
      // Submit dispute
      await page.click('button:has-text("Submit Dispute")');
      
      // Verify status and dispute info
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Disputed');
      await expect(page.locator('text=Dispute Reason: Incorrect Quantity')).toBeVisible();
    });
  });

  test.describe('Invoice Search and Filters', () => {
    test('should search invoices by number', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Search by invoice number
      await page.fill('input[placeholder="Search invoices..."]', 'INV-2024');
      await page.press('input[placeholder="Search invoices..."]', 'Enter');
      
      // Verify filtered results
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(await rows.count());
      
      // All visible invoices should contain search term
      const invoiceNumbers = await rows.locator('td:first-child').allTextContents();
      invoiceNumbers.forEach(num => {
        expect(num).toContain('INV-2024');
      });
    });

    test('should filter by multiple criteria', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Open filter panel
      await page.click('button:has-text("Filters")');
      
      // Set date range
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      await page.fill('input[name="startDate"]', startDate);
      await page.fill('input[name="endDate"]', endDate);
      
      // Select warehouse
      await page.click('div[data-testid="warehouse-filter"]');
      await page.click('label:has-text("Warehouse A")');
      
      // Select status
      await page.click('div[data-testid="status-filter"]');
      await page.click('label:has-text("Pending")');
      await page.click('label:has-text("Reconciled")');
      
      // Apply filters
      await page.click('button:has-text("Apply Filters")');
      
      // Verify URL params updated
      await expect(page).toHaveURL(/status=pending,reconciled/);
      await expect(page).toHaveURL(/startDate=/);
      
      // Verify results are filtered
      const statusBadges = page.locator('[data-testid="status-badge"]');
      const statuses = await statusBadges.allTextContents();
      statuses.forEach(status => {
        expect(['Pending', 'Reconciled']).toContain(status);
      });
    });

    test('should export filtered invoices', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Apply some filters
      await page.click('button:has-text("Filters")');
      await page.click('div[data-testid="status-filter"]');
      await page.click('label:has-text("Paid")');
      await page.click('button:has-text("Apply Filters")');
      
      // Export filtered results
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export")');
      await page.click('button:has-text("Export Filtered Results")');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/invoices_export.*\.xlsx/);
    });
  });

  test.describe('Invoice Permissions', () => {
    test('viewer role should not see action buttons', async ({ page }) => {
      // Logout and login as viewer
      await page.goto('/');
      await page.click('button[aria-label="User menu"]');
      await page.click('text=Sign out');
      
      await page.fill('input[type="text"]', 'viewer');
      await page.fill('input[type="password"]', 'ViewOnly2024!');
      await page.click('button:has-text("Sign in")');
      
      // Navigate to invoices
      await page.goto('/finance/invoices');
      
      // Should not see create button
      await expect(page.locator('button:has-text("New Invoice")')).not.toBeVisible();
      
      // Click on invoice
      await page.click('table tbody tr:first-child');
      
      // Should not see action buttons
      await expect(page.locator('button:has-text("Mark as Paid")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Reconcile")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Dispute")')).not.toBeVisible();
      
      // Should see view-only elements
      await expect(page.locator('text=Invoice Details')).toBeVisible();
      await expect(page.locator('[data-testid="invoice-status"]')).toBeVisible();
    });
  });

  test.describe('Invoice Email Notifications', () => {
    test('should send invoice by email', async ({ page }) => {
      await page.goto('/finance/invoices');
      
      // Click on invoice
      await page.click('table tbody tr:first-child');
      
      // Click send email button
      await page.click('button:has-text("Send Invoice")');
      
      // Fill email details
      await page.fill('input[name="recipientEmail"]', 'customer@example.com');
      await page.fill('input[name="ccEmails"]', 'accounting@company.com, manager@company.com');
      await page.fill('textarea[name="emailMessage"]', 'Please find attached the invoice for the billing period.');
      
      // Send email
      await page.click('button:has-text("Send Email")');
      
      // Verify success message
      await expect(page.locator('text=Invoice sent successfully')).toBeVisible();
      
      // Verify email log entry
      await expect(page.locator('text=Email sent to customer@example.com')).toBeVisible();
    });
  });
});