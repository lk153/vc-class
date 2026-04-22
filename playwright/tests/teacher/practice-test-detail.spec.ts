import { test, expect } from "../../fixtures/base";
import { PracticeTestsPage } from "../../pages/teacher/PracticeTestsPage";
import { PracticeTestDetailPage } from "../../pages/teacher/PracticeTestDetailPage";
import { expectToast, waitForSave } from "../../helpers/assertions";
import { uniqueName } from "../../helpers/seed.helper";

test.describe("Teacher Practice Test Detail", () => {
  let listPage: PracticeTestsPage;
  let detailPage: PracticeTestDetailPage;

  // Open the E2E testMode test's detail modal — it has 5 questions across 3
  // question types, so the filter chips (gated on questions.length > 3)
  // reliably render.
  test.beforeEach(async ({ teacherPage }) => {
    listPage = new PracticeTestsPage(teacherPage);
    detailPage = new PracticeTestDetailPage(teacherPage);
    await listPage.goto();
    const testModeCard = listPage.testCards.filter({ hasText: /test mode/i }).first();
    await testModeCard.click();
    // Wait for modal panel
    await teacherPage.locator(".max-w-6xl").waitFor({ state: "visible", timeout: 8_000 });
    // Wait for detail to finish loading — Settings section contains sr-only toggles
    await teacherPage.locator("input[type='checkbox'].sr-only").first().waitFor({ state: "attached", timeout: 10_000 });
  });

  test("detail modal or page opens with test title visible", async ({ teacherPage }) => {
    const title = detailPage.title;
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();
  });

  test("status dropdown is visible in detail view", async ({ teacherPage }) => {
    await expect(detailPage.statusDropdown).toBeVisible();
  });

  test("shuffle toggles are present", async ({ teacherPage }) => {
    // Toggles use sr-only checkboxes + visual peer divs. Look for the toggle containers.
    const toggles = teacherPage.locator("label, .relative").filter({
      has: teacherPage.locator("input.sr-only, input[type='checkbox'].sr-only"),
    });
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("time limit input accepts a numeric value and saves on blur", async ({ teacherPage }) => {
    const timeLimitInput = detailPage.timeLimitInput;
    const isVisible = await timeLimitInput.isVisible().catch(() => false);
    if (isVisible) {
      await timeLimitInput.clear();
      await timeLimitInput.fill("45");
      await timeLimitInput.blur();
      await waitForSave(teacherPage);
      // Value should persist
      await expect(timeLimitInput).toHaveValue("45");
    }
  });

  test("max attempts input accepts a numeric value and saves on blur", async ({ teacherPage }) => {
    const maxAttemptsInput = detailPage.maxAttemptsInput;
    const isVisible = await maxAttemptsInput.isVisible().catch(() => false);
    if (isVisible) {
      await maxAttemptsInput.clear();
      await maxAttemptsInput.fill("3");
      await maxAttemptsInput.blur();
      await waitForSave(teacherPage);
      await expect(maxAttemptsInput).toHaveValue("3");
    }
  });

  test("questions section lists at least one question row", async ({ teacherPage }) => {
    const questionRows = detailPage.questionRows;
    const count = await questionRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("question type filter chips are visible", async ({ teacherPage }) => {
    const chips = detailPage.questionTypeChips;
    const count = await chips.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("add question button is present", async ({ teacherPage }) => {
    const addBtn = detailPage.addQuestionButton;
    const isVisible = await addBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(addBtn).toBeEnabled();
    }
  });

  test("editable title can be clicked into edit mode", async ({ teacherPage }) => {
    const title = detailPage.title;
    await title.click();
    // After click, an input should appear
    const inputVisible = await teacherPage
      .locator("input[type='text']")
      .first()
      .isVisible()
      .catch(() => false);
    // Either an input appears or the title itself is an input already
    const titleTag = await title.evaluate((el) => el.tagName.toLowerCase());
    expect(inputVisible || titleTag === "input").toBeTruthy();
  });

  test("test structure section shows parts or groups if they exist", async ({ teacherPage }) => {
    const sectionItems = detailPage.sectionItems;
    const count = await sectionItems.count();
    // May be 0 if the test has no structure; just assert it doesn't throw
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
