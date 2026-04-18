import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/student/LoginPage";
import { expectPath } from "../../helpers/assertions";

test.describe("Login Page", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display login form", async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test("should login as teacher and redirect to /teacher", async ({ page }) => {
    await loginPage.login("nga@teacher.com", "123123");
    await expectPath(page, "/teacher");
  });

  test("should login as student and redirect to /topics", async ({ page }) => {
    await loginPage.login("sang@stu.com", "123123");
    await expectPath(page, "/topics");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await loginPage.login("nga@teacher.com", "wrongpassword");
    await loginPage.expectError();
  });

  test("should show error for non-existent email", async ({ page }) => {
    await loginPage.login("nonexistent@test.com", "wrongpassword");
    await loginPage.expectError();
  });

  test("should not submit with empty fields", async ({ page }) => {
    await loginPage.submitButton.click();
    // Should stay on login page
    await expectPath(page, "/login");
  });

  test("should navigate to register page", async ({ page }) => {
    await loginPage.registerLink.click();
    await expectPath(page, "/register");
  });
});
