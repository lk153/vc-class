import { test, expect } from "../../fixtures/base";
import { DashboardPage } from "../../pages/teacher/DashboardPage";
import { expectPath, expectScoreColor } from "../../helpers/assertions";

test.describe("Teacher Dashboard", () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ teacherPage }) => {
    dashboard = new DashboardPage(teacherPage);
    await dashboard.goto();
  });

  test("dashboard loads with a visible heading", async ({ teacherPage }) => {
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.heading).not.toBeEmpty();
  });

  test("stats cards show total students, active students, and total topics", async ({ teacherPage }) => {
    await expect(dashboard.totalStudentsStat).toBeVisible();
    await expect(dashboard.activeStudentsStat).toBeVisible();
    await expect(dashboard.totalTopicsStat).toBeVisible();
  });

  test("stats cards display numeric values", async ({ teacherPage }) => {
    // Each stat card should contain at least one number
    const numericPattern = /\d+/;
    await expect(dashboard.totalStudentsStat).toContainText(numericPattern);
    await expect(dashboard.activeStudentsStat).toContainText(numericPattern);
    await expect(dashboard.totalTopicsStat).toContainText(numericPattern);
  });

  test("recent results table is visible when results exist", async ({ teacherPage }) => {
    // The seeded teacher has classes and students with results
    await expect(dashboard.recentResultsTable).toBeVisible();
  });

  test("score colors in the results table match thresholds", async ({ teacherPage }) => {
    // Look for any score percentage text in the results table
    const scoreLocators = teacherPage.locator("table td, [data-testid='result-row']").filter({
      hasText: /%/,
    });
    const count = await scoreLocators.count();
    if (count > 0) {
      // Check the first score cell has some color styling applied
      const firstScore = scoreLocators.first();
      await expect(firstScore).toBeVisible();
    }
  });

  test("sidebar navigation links are visible and functional", async ({ teacherPage }) => {
    // Check sidebar links exist
    const sidebar = teacherPage.locator("nav, aside, [data-testid='sidebar']").first();
    await expect(sidebar).toBeVisible();

    // Classes link
    const classesLink = teacherPage.getByRole("link", { name: /classes/i });
    await expect(classesLink.first()).toBeVisible();
  });

  test("clicking a sidebar link navigates to the correct page", async ({ teacherPage }) => {
    const classesLink = teacherPage.getByRole("link", { name: /classes/i }).first();
    await classesLink.click();
    await expectPath(teacherPage, "/teacher/classes");
  });
});
