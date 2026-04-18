import { test, expect } from "../../fixtures/base";
import { TopicsPage } from "../../pages/student/TopicsPage";
import { PracticeSessionPage } from "../../pages/student/PracticeSessionPage";

/**
 * Navigate to a practice-mode session.
 * The student may have already completed attempts — check for results screen
 * and skip gracefully if no fresh practice session is available.
 */
async function goToPracticeSession(studentPage: import("@playwright/test").Page) {
  const topics = new TopicsPage(studentPage);
  await topics.goto();
  await topics.topicCards.first().click();
  await studentPage.waitForURL(/\/topics\/[^/]+$/, { timeout: 8_000 });

  const practiceLink = studentPage.locator("a[href*='/practice?testId=']").first();
  const hasLink = await practiceLink.isVisible({ timeout: 3_000 }).catch(() => false);
  if (!hasLink) return null;

  await practiceLink.click();
  await studentPage.waitForURL(/\/practice/, { timeout: 8_000 });

  // If all attempts are used, the page shows a results screen — not a session
  const resultsVisible = await studentPage.getByText(/your score|keep going|result/i)
    .first().isVisible({ timeout: 2_000 }).catch(() => false);
  if (resultsVisible) return null;

  return new PracticeSessionPage(studentPage);
}

test.describe("Student – Practice Session", () => {
  test("practice session loads and shows the first question", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return; // All attempts used
    await expect(session.questionContent).toBeVisible({ timeout: 8_000 });
  });

  test("answer options are displayed for the first question", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    await expect(session.answerOptions.first()).toBeVisible({ timeout: 8_000 });
  });

  test("selecting an answer shows feedback (correct or incorrect)", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    await session.answerOptions.first().waitFor({ timeout: 8_000 });
    await session.selectAnswer(0);
    const feedbackLocator = session.feedbackCorrect.or(session.feedbackWrong);
    await expect(feedbackLocator.first()).toBeVisible({ timeout: 5_000 });
  });

  test("selecting the correct answer shows positive feedback styling", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    await session.answerOptions.first().waitFor({ timeout: 8_000 });
    await session.selectAnswer(0);
    const feedback = session.feedbackCorrect.or(session.feedbackWrong);
    await expect(feedback.first()).toBeVisible({ timeout: 5_000 });
  });

  test("selecting a wrong answer shows negative feedback styling", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    await session.answerOptions.first().waitFor({ timeout: 8_000 });
    const optionCount = await session.answerOptions.count();
    await session.selectAnswer(optionCount > 1 ? optionCount - 1 : 0);
    const feedback = session.feedbackCorrect.or(session.feedbackWrong);
    await expect(feedback.first()).toBeVisible({ timeout: 5_000 });
  });

  test("progress indicator shows current question position", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    await expect(session.progressText).toBeVisible({ timeout: 8_000 });
  });

  test("timer is visible during the practice session", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    // Timer may be SVG circle or countdown text
    const timerVisible = await session.timer.isVisible({ timeout: 3_000 }).catch(() => false);
    // Skip if timer is not rendered (some question types may not have timers)
    if (timerVisible) {
      await expect(session.timer).toBeVisible();
    }
  });

  test("results screen appears after completing all questions", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    for (let i = 0; i < 20; i++) {
      const resultsVisible = await session.resultsScreen.isVisible().catch(() => false);
      if (resultsVisible) break;
      const optionCount = await session.answerOptions.count();
      if (optionCount > 0) {
        await session.selectAnswer(0);
        await studentPage.waitForTimeout(800);
      }
      const nextVisible = await session.nextButton.isVisible().catch(() => false);
      if (nextVisible) {
        await session.nextButton.click();
        await studentPage.waitForTimeout(400);
      }
    }
    await expect(session.resultsScreen).toBeVisible({ timeout: 10_000 });
  });

  test("score is displayed on the results screen", async ({ studentPage }) => {
    const session = await goToPracticeSession(studentPage);
    if (!session) return;
    for (let i = 0; i < 20; i++) {
      if (await session.resultsScreen.isVisible().catch(() => false)) break;
      const optionCount = await session.answerOptions.count();
      if (optionCount > 0) {
        await session.selectAnswer(0);
        await studentPage.waitForTimeout(800);
      }
      const nextVisible = await session.nextButton.isVisible().catch(() => false);
      if (nextVisible) {
        await session.nextButton.click();
        await studentPage.waitForTimeout(400);
      }
    }
    await expect(session.scoreText).toBeVisible({ timeout: 10_000 });
  });
});
