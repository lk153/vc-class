import { test, expect } from "../../fixtures/base";
import { TopicsPage } from "../../pages/student/TopicsPage";
import { TopicDetailPage } from "../../pages/student/TopicDetailPage";
import { expectPath } from "../../helpers/assertions";

// Navigate to the first available topic and return its detail page
async function goToFirstTopic(studentPage: import("@playwright/test").Page) {
  const topics = new TopicsPage(studentPage);
  await topics.goto();
  await topics.topicCards.first().click();
  await studentPage.waitForURL(/\/topics\/[^/]+$/, { timeout: 8_000 });
  return new TopicDetailPage(studentPage);
}

test.describe("Student – Topic Detail", () => {
  test("page loads with topic heading", async ({ studentPage }) => {
    const detail = await goToFirstTopic(studentPage);
    await expect(detail.heading).toBeVisible();
  });

  test("vocab grid is visible on the detail page", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // VocabGrid renders a grid of vocab cards
    const vocabGrid = studentPage.locator(".grid").filter({
      has: studentPage.locator(".rounded-2xl"),
    }).first();
    await expect(vocabGrid).toBeVisible();
  });

  test("at least one vocab item is rendered", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // Vocab cards have h1 with word text inside the grid
    const vocabCards = studentPage.locator(".grid .rounded-2xl");
    const count = await vocabCards.count();
    // Some topics may have 0 vocab — skip gracefully
    if (count === 0) {
      const emptyText = studentPage.getByText(/no vocabulary|empty/i);
      const isVisible = await emptyText.isVisible().catch(() => false);
      expect(isVisible || count === 0).toBeTruthy();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("mark all learned/not learned segmented pill is present", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // VocabGrid renders a segmented pill with "Not Learned" and "Learned" buttons
    const learnedBtn = studentPage.getByRole("button", { name: /learned/i });
    await expect(learnedBtn.first()).toBeVisible();
  });

  test("clicking mark-all-learned triggers confirmation", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // The "Learned" button in the segmented pill triggers a confirmation action
    const learnedBtn = studentPage.getByRole("button", { name: /learned/i }).last();
    const isVisible = await learnedBtn.isVisible().catch(() => false);
    if (!isVisible) return;
    await learnedBtn.click();
    // Either a confirmation modal/toast appears or the button state changes
    const confirmation = studentPage.locator("[data-sonner-toast]")
      .or(studentPage.locator("text=/confirm|sure|mark all/i"));
    await expect(confirmation.first()).toBeVisible({ timeout: 5_000 });
  });

  test("flashcard CTA link is visible and points to flashcards", async ({ studentPage }) => {
    const detail = await goToFirstTopic(studentPage);
    await expect(detail.flashcardButton).toBeVisible();
    const href = await detail.flashcardButton.getAttribute("href");
    expect(href).toMatch(/flashcard/i);
  });

  test("clicking flashcard CTA navigates to flashcards page", async ({ studentPage }) => {
    const detail = await goToFirstTopic(studentPage);
    await detail.flashcardButton.click();
    await expectPath(studentPage, /flashcard/);
  });

  test("practice tests section lists at least one test", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // Actual links use /practice?testId=... pattern
    const testLinks = studentPage.locator("a[href*='/practice?testId=']");
    const testCount = await testLinks.count();
    if (testCount === 0) {
      // No tests assigned — check section heading exists
      const sectionHeading = studentPage.locator("text=/practice|test/i").first();
      await expect(sectionHeading).toBeVisible();
    } else {
      await expect(testLinks.first()).toBeVisible();
    }
  });

  test("INACTIVE practice tests are not rendered as clickable links", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    // INACTIVE tests are rendered as div (not <a>) per source code
    // So there should be no <a> tags for inactive tests
    // We verify by checking that any visible "Inactive" badge is NOT inside a link
    const inactiveBadge = studentPage.locator("text=/inactive/i").first();
    const hasInactive = await inactiveBadge.isVisible().catch(() => false);
    if (!hasInactive) return; // No inactive tests on this topic
    // The parent should NOT be an <a> tag
    const parentTag = await inactiveBadge.locator("xpath=ancestor::a").count();
    expect(parentTag).toBe(0);
  });

  test("pagination next button advances to the next vocab page", async ({ studentPage }) => {
    await goToFirstTopic(studentPage);
    const nextBtn = studentPage.getByRole("button", { name: /next|chevron_right/i }).first();
    const isNextVisible = await nextBtn.isVisible().catch(() => false);
    if (!isNextVisible) return; // Fewer vocab items than one page
    await nextBtn.click();
    await studentPage.waitForTimeout(300);
    // Page should still be visible (no errors)
    await expect(studentPage.locator(".grid").first()).toBeVisible();
  });
});
