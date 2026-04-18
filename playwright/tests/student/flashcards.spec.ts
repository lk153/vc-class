import { test, expect } from "../../fixtures/base";
import { TopicsPage } from "../../pages/student/TopicsPage";
import { TopicDetailPage } from "../../pages/student/TopicDetailPage";
import { FlashcardsPage } from "../../pages/student/FlashcardsPage";
import { expectPath } from "../../helpers/assertions";

/** Navigate to the flashcards page for the first enrolled topic */
async function goToFlashcards(studentPage: import("@playwright/test").Page) {
  const topics = new TopicsPage(studentPage);
  await topics.goto();
  await topics.topicCards.first().click();
  await studentPage.waitForURL(/\/topics\/[^/]+/, { timeout: 8_000 });

  const detail = new TopicDetailPage(studentPage);
  await detail.flashcardButton.click();
  await studentPage.waitForURL(/flashcard/, { timeout: 8_000 });

  return new FlashcardsPage(studentPage);
}

test.describe("Student – Flashcards", () => {
  test("flashcard deck loads with at least one card", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    await expect(fc.card).toBeVisible();
  });

  test("tapping a card flips it (3D transform changes)", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    // The card uses CSS 3D transform (rotateY). Clicking toggles flipped state.
    // Before tap: rotateY(0deg), after tap: rotateY(180deg)
    const transformBefore = await fc.card.evaluate(
      (el) => getComputedStyle(el).transform || el.style.transform,
    );
    await fc.tapCard();
    await studentPage.waitForTimeout(400); // flip animation
    const transformAfter = await fc.card.evaluate(
      (el) => getComputedStyle(el).transform || el.style.transform,
    );
    // The transform matrix should change after flip
    expect(transformAfter).not.toBe(transformBefore);
  });

  test("swiping right marks card as learned and advances deck", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    await expect(fc.card).toBeVisible();
    // Capture progress before swipe
    const progressBefore = await fc.progressText.textContent().catch(() => "");
    await fc.swipeRight();
    // After swipe, either progress updates or a new card is shown
    await studentPage.waitForTimeout(400); // animation settle
    const progressAfter = await fc.progressText.textContent().catch(() => "");
    // If there's only one card the completion state may appear instead
    const completionVisible = await fc.completionState.isVisible().catch(() => false);
    expect(completionVisible || progressAfter !== progressBefore).toBeTruthy();
  });

  test("swiping left marks card as not-learned and advances deck", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    await expect(fc.card).toBeVisible();
    const progressBefore = await fc.progressText.textContent().catch(() => "");
    await fc.swipeLeft();
    await studentPage.waitForTimeout(400);
    const progressAfter = await fc.progressText.textContent().catch(() => "");
    const completionVisible = await fc.completionState.isVisible().catch(() => false);
    expect(completionVisible || progressAfter !== progressBefore).toBeTruthy();
  });

  test("progress counter is visible and shows x / y format", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    await expect(fc.progressText).toBeVisible();
    const text = await fc.progressText.textContent();
    expect(text).toMatch(/\d+\s*(of|\/)\s*\d+/i);
  });

  test("swiping through multiple cards advances the progress counter", async ({ studentPage }) => {
    const fc = await goToFlashcards(studentPage);
    // Swipe a few cards and verify progress changes
    const progressBefore = await fc.progressText.textContent().catch(() => "0");
    for (let i = 0; i < 3; i++) {
      const cardVisible = await fc.card.isVisible().catch(() => false);
      if (!cardVisible) break;
      await fc.swipeRight();
      await studentPage.waitForTimeout(400);
    }
    const progressAfter = await fc.progressText.textContent().catch(() => "0");
    // Progress should have advanced (or completion should be visible if very few cards)
    const completionVisible = await fc.completionState.isVisible().catch(() => false);
    expect(completionVisible || progressAfter !== progressBefore).toBeTruthy();
  });
});
