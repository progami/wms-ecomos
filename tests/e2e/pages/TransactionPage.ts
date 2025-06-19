import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TransactionPage extends BasePage {
  readonly newTransactionButton: Locator;
  readonly transactionTypeSelect: Locator;
  readonly warehouseSelect: Locator;
  readonly skuInput: Locator;
  readonly quantityInput: Locator;
  readonly submitButton: Locator;
  readonly transactionTable: Locator;

  constructor(page: Page) {
    super(page);
    this.newTransactionButton = page.locator('button:has-text("New Transaction")');
    this.transactionTypeSelect = page.locator('select[name="type"]');
    this.warehouseSelect = page.locator('select[name="warehouseId"]');
    this.skuInput = page.locator('input[name="sku"]');
    this.quantityInput = page.locator('input[name="quantity"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.transactionTable = page.locator('table[data-testid="transaction-table"]');
  }

  async gotoReceive() {
    await this.navigate('/operations/receive');
  }

  async gotoShip() {
    await this.navigate('/operations/ship');
  }

  async createInboundTransaction(data: {
    warehouse: string;
    sku: string;
    quantity: string;
    referenceId?: string;
  }) {
    await this.gotoReceive();
    await this.newTransactionButton.click();
    
    await this.warehouseSelect.selectOption({ label: data.warehouse });
    await this.skuInput.fill(data.sku);
    await this.quantityInput.fill(data.quantity);
    
    if (data.referenceId) {
      await this.page.fill('input[name="referenceId"]', data.referenceId);
    }
    
    await this.submitButton.click();
    await this.waitForToast('Transaction created successfully');
  }

  async createOutboundTransaction(data: {
    warehouse: string;
    sku: string;
    quantity: string;
    referenceId?: string;
  }) {
    await this.gotoShip();
    await this.newTransactionButton.click();
    
    await this.warehouseSelect.selectOption({ label: data.warehouse });
    await this.skuInput.fill(data.sku);
    await this.quantityInput.fill(data.quantity);
    
    if (data.referenceId) {
      await this.page.fill('input[name="referenceId"]', data.referenceId);
    }
    
    await this.submitButton.click();
    await this.waitForToast('Transaction created successfully');
  }

  async getTransactionCount(): Promise<number> {
    const rows = this.transactionTable.locator('tbody tr');
    return await rows.count();
  }

  async getLatestTransaction() {
    return this.transactionTable.locator('tbody tr').first();
  }

  async viewTransactionDetails(transactionNumber: string) {
    const row = this.transactionTable.locator(`tr:has-text("${transactionNumber}")`);
    await row.locator('a').click();
  }
}