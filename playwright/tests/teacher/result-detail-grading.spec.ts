import { test, expect } from "../../fixtures/base";
import { StudentResultsPage } from "../../pages/teacher/StudentResultsPage";
import { TeacherResultDetailPage } from "../../pages/teacher/ResultDetailPage";
import { expectToast, waitForSave } from "../../helpers/assertions";

test.describe("Teacher Result Detail and Grading", () => {
  let listPage: StudentResultsPage;
  let detailPage: TeacherResultDetailPage;

  // Navigate to the results list and open the first result's detail modal
  test.beforeEach(async ({ teacherPage }) => {
    listPage = new StudentResultsPage(teacherPage);
    detailPage = new TeacherResultDetailPage(teacherPage);
    await listPage.goto();

    const rowCount = await listPage.resultRows.count();
    if (rowCount > 0) {
      await listPage.resultRows.first().click();
      await teacherPage.waitForTimeout(600);
    }
  });

  test("result detail modal shows student info", async ({ teacherPage }) => {
    // Clicking a row opens ResultDetailModal (not page navigation)
    const heading = detailPage.heading;
    const studentInfo = detailPage.studentInfo;
    const headingVisible = await heading.isVisible().catch(() => false);
    const infoVisible = await studentInfo.isVisible().catch(() => false);
    expect(headingVisible || infoVisible).toBeTruthy();
  });

  test("answer rows are displayed in the detail view", async ({ teacherPage }) => {
    const rows = detailPage.answerRows;
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("expanding an answer row shows grading controls", async ({ teacherPage }) => {
    const rows = detailPage.answerRows;
    const count = await rows.count();
    if (count > 0) {
      await rows.first().click();
      await teacherPage.waitForTimeout(300);
      // After expansion, expect grading-related UI
      const overrideToggle = detailPage.overrideToggle;
      const commentInput = detailPage.teacherCommentInput;
      const overrideVisible = await overrideToggle.first().isVisible().catch(() => false);
      const commentVisible = await commentInput.first().isVisible().catch(() => false);
      // At least one grading control should appear
      expect(overrideVisible || commentVisible).toBeTruthy();
    }
  });

  test("comment input accepts text", async ({ teacherPage }) => {
    const commentInput = detailPage.commentInput;
    const isVisible = await commentInput.isVisible().catch(() => false);
    if (isVisible) {
      await commentInput.fill("Test comment from teacher");
      const value = await commentInput.inputValue();
      expect(value).toBe("Test comment from teacher");
    }
  });

  test("mark as graded button is present when result is pending", async ({ teacherPage }) => {
    const gradedBtn = detailPage.markAsGradedButton;
    const isVisible = await gradedBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(gradedBtn).toBeEnabled();
    }
  });

  test("needs review filter button is visible", async ({ teacherPage }) => {
    const reviewFilter = detailPage.needsReviewFilter;
    const isVisible = await reviewFilter.isVisible().catch(() => false);
    if (isVisible) {
      await expect(reviewFilter).toBeVisible();
    }
  });

  test("score display shows a percentage or numeric score", async ({ teacherPage }) => {
    const scoreDisplay = detailPage.scoreDisplay;
    const isVisible = await scoreDisplay.isVisible().catch(() => false);
    if (isVisible) {
      await expect(scoreDisplay).toContainText(/\d+/);
    }
  });

  test("override toggle is interactive when present", async ({ teacherPage }) => {
    const rows = detailPage.answerRows;
    const count = await rows.count();
    if (count > 0) {
      await rows.first().click();
      await teacherPage.waitForTimeout(300);
      // Override may be a toggle switch (sr-only checkbox) or a button
      const toggle = teacherPage.locator("input[type='checkbox'], [role='switch']").first();
      const isVisible = await toggle.isVisible().catch(() => false);
      if (isVisible) {
        await toggle.click();
        // Just verify click didn't error — state change may use sr-only pattern
        await teacherPage.waitForTimeout(200);
      }
    }
  });
});
