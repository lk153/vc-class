import { test, expect } from "@playwright/test";
import { RegisterPage } from "../../pages/student/RegisterPage";
import { uniqueEmail, uniqueName } from "../../helpers/seed.helper";
import { expectPath } from "../../helpers/assertions";
import { E2E_STUDENT } from "../../workspace/identity";

test.describe("Register Page", () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test("should display registration form", async ({ page }) => {
    await expect(registerPage.nameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test("should register a new user successfully and auto-cleanup", async ({ page }) => {
    // CREATE: register with E2E-prefixed data (cleaned up by global teardown)
    const name = uniqueName("Student Playwright");
    const email = uniqueEmail("student-playwright");
    await registerPage.register({ name, email, password: "123123" });

    // VERIFY: should auto-login and redirect
    await page.waitForURL(/\/(topics|login)/, { timeout: 10_000 });
    // Note: user with @e2e.test email is auto-deleted by global teardown
  });

  test("should show error for duplicate email", async ({ page }) => {
    // READ-only: uses existing E2E fixture user, no data created
    await registerPage.register({
      name: "Duplicate User",
      email: E2E_STUDENT.email,
      password: "test",
    });
    await registerPage.errorMessage.first().waitFor({ state: "visible", timeout: 5_000 });
  });

  test("should show error for short password", async ({ page }) => {
    await registerPage.register({
      name: uniqueName("Student"),
      email: uniqueEmail("short"),
      password: "123",
    });
    await registerPage.errorMessage.first().waitFor({ state: "visible", timeout: 5_000 });
  });

  test("should navigate to login page", async ({ page }) => {
    await registerPage.loginLink.click();
    await expectPath(page, "/login");
  });
});
