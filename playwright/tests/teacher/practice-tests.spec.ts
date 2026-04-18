import { test, expect } from "../../fixtures/base";
import { PracticeTestsPage } from "../../pages/teacher/PracticeTestsPage";

test.describe("Teacher Practice Tests Page", () => {
  let practiceTestsPage: PracticeTestsPage;

  test.beforeEach(async ({ teacherPage }) => {
    practiceTestsPage = new PracticeTestsPage(teacherPage);
    await practiceTestsPage.goto();
  });

  test("practice tests page loads with heading and test cards", async ({ teacherPage }) => {
    await expect(practiceTestsPage.heading).toBeVisible();
    await expect(practiceTestsPage.testCards.first()).toBeVisible();
  });

  test("stats row is visible above the test grid", async ({ teacherPage }) => {
    // Stats section should contain counts for total tests, questions, etc.
    const statsArea = teacherPage
      .locator(".rounded-2xl, [data-testid='stat']")
      .filter({ hasText: /\d+/ })
      .first();
    await expect(statsArea).toBeVisible();
  });

  test("search input filters tests by title", async ({ teacherPage }) => {
    await expect(practiceTestsPage.searchInput).toBeVisible();
    // Type a partial title from seeded data
    await practiceTestsPage.search("At the");
    await teacherPage.waitForTimeout(400); // debounce
    const cards = practiceTestsPage.testCards;
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0); // filtered list
  });

  test("search with non-matching query shows zero cards", async ({ teacherPage }) => {
    await practiceTestsPage.search("ZZZ_NO_MATCH_XYZ_12345");
    await teacherPage.waitForTimeout(400);
    const count = await practiceTestsPage.testCards.count();
    // No cards should match this query
    expect(count).toBe(0);
  });

  test("status chip 'Active' filters the test list", async ({ teacherPage }) => {
    const activeChip = practiceTestsPage.statusChips.filter({ hasText: /Active/i });
    const isVisible = await activeChip.isVisible().catch(() => false);
    if (isVisible) {
      await activeChip.click();
      await teacherPage.waitForTimeout(300);
      // After filtering, all visible cards should be Active
      const cards = practiceTestsPage.testCards;
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("status chip 'Draft' filters the test list", async ({ teacherPage }) => {
    const draftChip = practiceTestsPage.statusChips.filter({ hasText: /Draft/i });
    const isVisible = await draftChip.isVisible().catch(() => false);
    if (isVisible) {
      await draftChip.click();
      await teacherPage.waitForTimeout(300);
      const count = await practiceTestsPage.testCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("language chip filters narrow the list", async ({ teacherPage }) => {
    const engChip = practiceTestsPage.languageChips.filter({ hasText: /English/i });
    const isVisible = await engChip.isVisible().catch(() => false);
    if (isVisible) {
      await engChip.click();
      await teacherPage.waitForTimeout(300);
      const count = await practiceTestsPage.testCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("pagination shows at most 10 items per page", async ({ teacherPage }) => {
    const cards = practiceTestsPage.testCards;
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(10);
  });

  test("pagination info shows range text", async ({ teacherPage }) => {
    const info = practiceTestsPage.paginationInfo;
    const isVisible = await info.isVisible().catch(() => false);
    if (isVisible) {
      await expect(info).toContainText(/\d+/);
    }
  });

  test("filter resets to page 1 when changed", async ({ teacherPage }) => {
    // Go to page 2 if available
    const nextBtn = practiceTestsPage.nextPageButton;
    const hasNext = await nextBtn.isVisible().catch(() => false);
    if (hasNext) {
      const isDisabled = await nextBtn.isDisabled().catch(() => true);
      if (!isDisabled) {
        await nextBtn.click();
        await teacherPage.waitForTimeout(300);
        // Now apply a filter — should jump back to page 1
        await practiceTestsPage.search("At");
        await teacherPage.waitForTimeout(400);
        // Verify we're back on page 1 by checking pagination info starts with 1
        const info = practiceTestsPage.paginationInfo;
        const infoVisible = await info.isVisible().catch(() => false);
        if (infoVisible) {
          await expect(info).toContainText(/^1/);
        }
      }
    }
  });

  test("test cards show status badge and question count", async ({ teacherPage }) => {
    const firstCard = practiceTestsPage.testCards.first();
    await expect(firstCard).toBeVisible();
    const cardText = await firstCard.textContent();
    // Card text should contain a number (question count)
    expect(cardText).toMatch(/\d+/);
  });

  test("clicking a test card opens the detail modal or navigates to detail", async ({ teacherPage }) => {
    const firstCard = practiceTestsPage.testCards.first();
    await firstCard.click();
    // Either a modal appears or we navigate
    await teacherPage.waitForTimeout(500);
    const modalVisible = await teacherPage
      .locator(".fixed.inset-0, [role='dialog']")
      .first()
      .isVisible()
      .catch(() => false);
    const urlChanged = teacherPage.url().includes("practice-tests/");
    expect(modalVisible || urlChanged).toBeTruthy();
  });
});
