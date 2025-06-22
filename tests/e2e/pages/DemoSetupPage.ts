import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DemoSetupPage extends BasePage {
  readonly tryDemoButton: Locator;
  readonly setupDemoButton: Locator;
  readonly companyNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly skipSetupButton: Locator;
  readonly demoDataToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.tryDemoButton = page.locator('button:has-text("Try Demo"), a:has-text("Try Demo")');
    this.setupDemoButton = page.locator('button:has-text("Setup Demo Account")');
    this.companyNameInput = page.locator('input[name="companyName"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.roleSelect = page.locator('select[name="role"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.skipSetupButton = page.locator('button:has-text("Skip")');
    this.demoDataToggle = page.locator('input[type="checkbox"][name="useDemoData"], label:has-text("Use Demo Data")');
  }

  async goto() {
    await this.navigate('/');
  }

  async clickTryDemo() {
    await this.tryDemoButton.click();
  }

  async setupDemoAccount(data: {
    companyName: string;
    email: string;
    password: string;
    role: 'admin' | 'staff';
  }) {
    await this.companyNameInput.fill(data.companyName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.roleSelect.selectOption(data.role);
    await this.submitButton.click();
  }

  async isDemoUser(): Promise<boolean> {
    // Check if the demo data toggle is visible and checked
    if (await this.demoDataToggle.isVisible()) {
      return await this.demoDataToggle.isChecked();
    }
    return false;
  }

  async toggleDemoData(enable: boolean) {
    const isChecked = await this.demoDataToggle.isChecked();
    if (isChecked !== enable) {
      await this.demoDataToggle.click();
    }
  }
}