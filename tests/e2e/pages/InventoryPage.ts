import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly inventoryTable: Locator;
  readonly warehouseSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.filterButton = page.locator('button:has-text("Filter")');
    this.exportButton = page.locator('button:has-text("Export")');
    this.inventoryTable = page.locator('table[data-testid="inventory-table"]');
    this.warehouseSelect = page.locator('select[name="warehouseId"]');
  }

  async goto() {
    await this.navigate('/operations/inventory');
  }

  async searchBySKU(sku: string) {
    await this.searchInput.fill(sku);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500); // Wait for search to complete
  }

  async filterByWarehouse(warehouseName: string) {
    await this.warehouseSelect.selectOption({ label: warehouseName });
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  async getInventoryCount(): Promise<number> {
    const rows = this.inventoryTable.locator('tbody tr');
    return await rows.count();
  }

  async getInventoryItem(sku: string) {
    return this.inventoryTable.locator(`tr:has-text("${sku}")`);
  }

  async exportInventory(format: 'csv' | 'xlsx' = 'csv') {
    await this.exportButton.click();
    const formatButton = this.page.locator(`button:has-text("${format.toUpperCase()}")`);
    await formatButton.click();
    
    // Wait for download
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('button:has-text("Download")').click();
    const download = await downloadPromise;
    
    return download;
  }

  async isInventoryEmpty(): Promise<boolean> {
    const emptyMessage = this.page.locator('text="No inventory items found"');
    return await emptyMessage.isVisible();
  }
}