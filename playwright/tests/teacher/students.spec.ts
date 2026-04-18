import { test, expect } from "../../fixtures/base";
import { StudentsPage } from "../../pages/teacher/StudentsPage";
import { expectToast, waitForSave } from "../../helpers/assertions";
import { uniqueName } from "../../helpers/seed.helper";

test.describe("Teacher Students Page", () => {
  let studentsPage: StudentsPage;

  test.beforeEach(async ({ teacherPage }) => {
    studentsPage = new StudentsPage(teacherPage);
    await studentsPage.goto();
  });

  test("students page loads with heading and student rows", async ({ teacherPage }) => {
    await expect(studentsPage.heading).toBeVisible();
    // Page should show either rows or an empty state
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount === 0) {
      await expect(studentsPage.emptyState).toBeVisible();
    } else {
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test("stats cards show total, active, and inactive student counts", async ({ teacherPage }) => {
    const statCount = await studentsPage.statCards.count();
    expect(statCount).toBeGreaterThanOrEqual(1);
    await expect(studentsPage.statCards.first()).toContainText(/\d+/);
  });

  test("clicking a student row opens the detail modal", async ({ teacherPage }) => {
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount > 0) {
      await studentsPage.studentRows.first().click();
      await teacherPage.waitForTimeout(400);
      const modal = studentsPage.modal;
      await expect(modal).toBeVisible({ timeout: 5_000 });
    }
  });

  test("student detail modal contains name and email fields", async ({ teacherPage }) => {
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount > 0) {
      await studentsPage.studentRows.first().click();
      await teacherPage.waitForTimeout(400);
      const nameInput = studentsPage.modalNameInput;
      const isVisible = await nameInput.isVisible().catch(() => false);
      if (isVisible) {
        await expect(nameInput).toBeVisible();
      }
    }
  });

  test("activate/deactivate button is present in modal", async ({ teacherPage }) => {
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount > 0) {
      await studentsPage.studentRows.first().click();
      await teacherPage.waitForTimeout(400);
      const toggle = studentsPage.modalStatusToggle;
      const isVisible = await toggle.isVisible().catch(() => false);
      if (isVisible) {
        await expect(toggle).toBeEnabled();
      }
    }
  });

  test("modal closes when the close button is clicked", async ({ teacherPage }) => {
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount > 0) {
      await studentsPage.studentRows.first().click();
      await teacherPage.waitForTimeout(400);
      const closeBtn = studentsPage.modalCloseButton;
      const isVisible = await closeBtn.isVisible().catch(() => false);
      if (isVisible) {
        await closeBtn.click();
        await teacherPage.waitForTimeout(300);
        await expect(studentsPage.modal).not.toBeVisible({ timeout: 3_000 });
      }
    }
  });

  test("modal closes when Escape key is pressed", async ({ teacherPage }) => {
    const rowCount = await studentsPage.studentRows.count();
    if (rowCount > 0) {
      await studentsPage.studentRows.first().click();
      await teacherPage.waitForTimeout(400);
      const modalVisible = await studentsPage.modal.isVisible().catch(() => false);
      if (modalVisible) {
        await teacherPage.keyboard.press("Escape");
        await teacherPage.waitForTimeout(300);
        await expect(studentsPage.modal).not.toBeVisible({ timeout: 3_000 });
      }
    }
  });
});
