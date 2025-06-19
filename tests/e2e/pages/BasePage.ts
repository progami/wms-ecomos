import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly navMenu: Locator;
  readonly userMenu: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navMenu = page.locator('nav[role="navigation"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.signOutButton = page.locator('text="Sign out"');
  }

  async navigate(path: string) {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async clickNavLink(linkText: string) {
    await this.navMenu.locator(`text="${linkText}"`).click();
  }

  async signOut() {
    await this.userMenu.click();
    await this.signOutButton.click();
  }

  async waitForToast(message: string) {
    await this.page.locator(`text="${message}"`).waitFor({ state: 'visible' });
  }

  async dismissToast() {
    const closeButton = this.page.locator('[data-testid="toast-close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}