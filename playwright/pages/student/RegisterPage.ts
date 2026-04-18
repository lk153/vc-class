import { type Page, type Locator } from "@playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly languageSelect: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel(/name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.languageSelect = page.getByLabel(/language/i);
    this.submitButton = page.getByRole("button", { name: /register|sign up|create/i });
    this.loginLink = page.getByRole("link", { name: /login|sign in/i });
    this.errorMessage = page.locator("[role='alert'], .text-red, .text-\\[\\#7b0020\\]");
  }

  async goto() {
    await this.page.goto("/register");
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }
}
