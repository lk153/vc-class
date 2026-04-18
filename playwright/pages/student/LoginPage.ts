import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole("button", { name: /login|sign in/i });
    this.errorMessage = page.locator("[role='alert'], .text-red, .text-\\[\\#7b0020\\]");
    this.registerLink = page.getByRole("link", { name: /register|sign up/i });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for post-submit settle: either redirected off /login, or an error
    // surfaced (Sonner toast or inline error). Dev-mode bcrypt + NextAuth can
    // exceed the default 5s expect timeout under parallel load.
    await Promise.race([
      this.page
        .waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 })
        .catch(() => {}),
      this.page
        .locator("[data-sonner-toast], [role='alert']")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => {}),
    ]);
  }

  async expectError(text?: string | RegExp) {
    if (text) {
      await this.errorMessage.filter({ hasText: text }).waitFor({ state: "visible" });
    } else {
      await this.errorMessage.first().waitFor({ state: "visible" });
    }
  }
}
