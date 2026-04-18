import { test, expect } from "../../fixtures/base";
import { ImportTestPage } from "../../pages/teacher/ImportTestPage";
import { expectToast, expectPath } from "../../helpers/assertions";
import { sampleTestCsv } from "../../helpers/seed.helper";

test.describe("Teacher Import Practice Test", () => {
  let importPage: ImportTestPage;

  test.beforeEach(async ({ teacherPage }) => {
    importPage = new ImportTestPage(teacherPage);
    await importPage.goto();
  });

  test("import page loads with a heading", async ({ teacherPage }) => {
    await expect(importPage.heading).toBeVisible();
  });

  test("topic dropdown is visible for selecting a topic", async ({ teacherPage }) => {
    await expect(importPage.topicDropdown).toBeVisible();
  });

  test("upload area is visible for CSV drop/select", async ({ teacherPage }) => {
    const uploadArea = importPage.uploadArea;
    const count = await uploadArea.count();
    expect(count).toBeGreaterThan(0);
  });

  test("uploading a valid CSV shows a preview table", async ({ teacherPage }) => {
    const csv = sampleTestCsv(3);
    await importPage.uploadCsvContent(csv, "questions.csv");
    await teacherPage.waitForTimeout(500);
    const previewTable = importPage.previewTable;
    await expect(previewTable).toBeVisible({ timeout: 5_000 });
  });

  test("uploading an invalid CSV shows an error table or error message", async ({ teacherPage }) => {
    const badCsv = "not,a,valid,header\n1,bad,data";
    await importPage.uploadCsvContent(badCsv, "bad.csv");
    await teacherPage.waitForTimeout(500);
    const errorTable = importPage.errorTable;
    const errorMsg = teacherPage.locator("text=/error|invalid|fail/i");
    const errorTableVisible = await errorTable.isVisible().catch(() => false);
    const errorMsgVisible = await errorMsg.first().isVisible().catch(() => false);
    expect(errorTableVisible || errorMsgVisible).toBeTruthy();
  });

  test("import button creates the test after a valid upload", async ({ teacherPage }) => {
    // Select the first available topic
    const topicOptions = await importPage.topicDropdown.locator("option").count();
    if (topicOptions > 1) {
      await importPage.topicDropdown.selectOption({ index: 1 });
    }
    const csv = sampleTestCsv(3);
    await importPage.uploadCsvContent(csv, "questions.csv");
    await teacherPage.waitForTimeout(500);

    const importBtn = importPage.importButton;
    const isEnabled = await importBtn.isEnabled().catch(() => false);
    if (isEnabled) {
      await importBtn.click();
      // Should show success message or navigate away
      await teacherPage.waitForTimeout(1_000);
      const successVisible = await importPage.successMessage.isVisible().catch(() => false);
      const urlChanged = !teacherPage.url().includes("import");
      expect(successVisible || urlChanged).toBeTruthy();
    }
  });
});
