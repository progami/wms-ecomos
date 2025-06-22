import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly demoLoginButton: Locator;
  readonly createAccountLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.signInButton = page.locator('button[type="submit"]:has-text("Sign in")');
    this.errorMessage = page.locator('.error-message, [role="alert"]');
    this.demoLoginButton = page.locator('button:has-text("Demo Login")');
    this.createAccountLink = page.locator('a:has-text("Create account")');
  }

  async goto() {
    await this.navigate('/auth/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async loginAsDemo() {
    if (await this.demoLoginButton.isVisible()) {
      await this.demoLoginButton.click();
    }
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}