import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly demoDataIndicator: Locator;
  readonly statsCards: Locator;
  readonly totalProductsCard: Locator;
  readonly totalWarehousesCard: Locator;
  readonly lowStockItemsCard: Locator;
  readonly pendingTransactionsCard: Locator;
  readonly recentActivitySection: Locator;
  readonly inventoryOverviewChart: Locator;
  readonly warehouseUtilizationChart: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1:has-text("Dashboard")');
    this.demoDataIndicator = page.locator('text="Demo Data", text="Using Demo Data"');
    this.statsCards = page.locator('[data-testid="stats-card"]');
    this.totalProductsCard = page.locator('[data-testid="total-products-card"]');
    this.totalWarehousesCard = page.locator('[data-testid="total-warehouses-card"]');
    this.lowStockItemsCard = page.locator('[data-testid="low-stock-items-card"]');
    this.pendingTransactionsCard = page.locator('[data-testid="pending-transactions-card"]');
    this.recentActivitySection = page.locator('[data-testid="recent-activity"]');
    this.inventoryOverviewChart = page.locator('[data-testid="inventory-overview-chart"]');
    this.warehouseUtilizationChart = page.locator('[data-testid="warehouse-utilization-chart"]');
  }

  async goto() {
    await this.navigate('/dashboard');
  }

  async isDemoDataEnabled(): Promise<boolean> {
    return await this.demoDataIndicator.isVisible();
  }

  async getStatsValue(cardTestId: string): Promise<string> {
    const card = this.page.locator(`[data-testid="${cardTestId}"]`);
    const value = await card.locator('.stats-value, .text-2xl, .text-3xl').textContent();
    return value?.trim() || '';
  }

  async getTotalProducts(): Promise<string> {
    return await this.getStatsValue('total-products-card');
  }

  async getTotalWarehouses(): Promise<string> {
    return await this.getStatsValue('total-warehouses-card');
  }

  async getLowStockItems(): Promise<string> {
    return await this.getStatsValue('low-stock-items-card');
  }

  async getPendingTransactions(): Promise<string> {
    return await this.getStatsValue('pending-transactions-card');
  }

  async hasRecentActivity(): Promise<boolean> {
    const activityItems = this.recentActivitySection.locator('.activity-item, tr');
    const count = await activityItems.count();
    return count > 0;
  }

  async areChartsVisible(): Promise<boolean> {
    const inventoryChartVisible = await this.inventoryOverviewChart.isVisible();
    const warehouseChartVisible = await this.warehouseUtilizationChart.isVisible();
    return inventoryChartVisible || warehouseChartVisible;
  }
}