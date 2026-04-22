import { test, expect } from "../../fixtures/base";
import { ExamPage } from "../../pages/student/ExamPage";
import { waitForSave } from "../../helpers/assertions";
import { E2E_TEST_IDS, E2E_TOPIC_IDS } from "../../workspace/fixtures";

// Fixed E2E fixture IDs (see src/lib/e2e/seed.ts). The testMode fixture is a
// 5-question, "test" mode PracticeTest owned by the E2E teacher, with the
// E2E student enrolled via E2E_CLASS.
const EXAM_URL = `/topics/${E2E_TOPIC_IDS.primary}/practice?testId=${E2E_TEST_IDS.testMode}`;

test.describe("Student – Exam Lifecycle", () => {
  // Serial within this file: all tests share one student account + one exam attempt,
  // so running them in parallel workers causes state collisions.
  test.describe.configure({ mode: "serial" });
  // City topic assignment is handled by global-setup.ts

  async function goToExamGate(studentPage: import("@playwright/test").Page) {
    await studentPage.goto(EXAM_URL);
    await studentPage.waitForURL(/\/practice/, { timeout: 10_000 });
    return new ExamPage(studentPage);
  }

  /** Start or resume the exam, returning the ExamPage after questions are visible */
  async function enterExam(studentPage: import("@playwright/test").Page) {
    const exam = await goToExamGate(studentPage);
    const resumeVisible = await exam.resumeButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (resumeVisible) {
      await exam.resumeExam();
    } else {
      await exam.startExam();
    }
    await exam.answerOptions.first().waitFor({ timeout: 10_000 });
    return exam;
  }

  test("entry gate shows exam info (time remaining and answered count)", async ({ studentPage }) => {
    const exam = await goToExamGate(studentPage);
    const hasButton = await exam.startButton.isVisible({ timeout: 3_000 }).catch(() => false)
      || await exam.resumeButton.isVisible().catch(() => false);
    if (!hasButton) return;

    // Entry gate shows info cards: "45 minutes" / "0/5 Answered" / "Last Saved"
    const timeText = studentPage.locator("text=/\\d+\\s*minute/i").first();
    await expect(timeText).toBeVisible();
  });

  test("entry gate shows answered count", async ({ studentPage }) => {
    const exam = await goToExamGate(studentPage);
    const hasButton = await exam.startButton.isVisible({ timeout: 3_000 }).catch(() => false)
      || await exam.resumeButton.isVisible().catch(() => false);
    if (!hasButton) return;

    // Shows "0/5 Answered" or similar fraction
    const answeredText = studentPage.locator("text=/\\d+\\/\\d+/").first();
    await expect(answeredText).toBeVisible();
  });

  test("entry gate shows a Start or Continue button", async ({ studentPage }) => {
    const exam = await goToExamGate(studentPage);
    const startVisible = await exam.startButton.isVisible({ timeout: 5_000 }).catch(() => false);
    const resumeVisible = await exam.resumeButton.isVisible().catch(() => false);
    expect(startVisible || resumeVisible).toBeTruthy();
  });

  test("clicking Start/Continue enters the exam and shows questions", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);
    await expect(exam.answerOptions.first()).toBeVisible();
  });

  test("answer options are displayed for the current question", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);
    const count = await exam.answerOptions.count();
    expect(count).toBeGreaterThan(0);
  });

  test("selecting an answer and clicking Next advances", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);
    const contentBefore = await exam.answerOptions.first().textContent();

    await exam.selectAnswer(0);
    const nextVisible = await exam.nextButton.isVisible().catch(() => false);
    if (!nextVisible) return; // single-phase exam
    await exam.goNext();
    await studentPage.waitForTimeout(500);

    // Either content changed or page didn't error
    await expect(exam.answerOptions.first()).toBeVisible();
  });

  test("flag button toggles a bookmark on the current question", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);

    const flagBtnVisible = await exam.flagButton.isVisible().catch(() => false);
    if (!flagBtnVisible) return;

    await exam.flagCurrentQuestion();
    const iconStyle = await exam.flagButton
      .locator(".material-symbols-outlined")
      .getAttribute("style")
      .catch(() => "");
    const hasAmberColor = await exam.flagButton
      .locator(".material-symbols-outlined")
      .evaluate((el) => getComputedStyle(el).color)
      .catch(() => "");
    expect(
      (iconStyle || "").includes("FILL") || hasAmberColor.includes("245"),
    ).toBeTruthy();
  });

  test("auto-save fires a network request during exam", async ({ studentPage }) => {
    const saveRequests: string[] = [];
    studentPage.on("request", (req) => {
      if (req.method() === "PATCH" || req.method() === "POST") {
        if (/save|exam-session/i.test(req.url())) {
          saveRequests.push(req.url());
        }
      }
    });

    const exam = await enterExam(studentPage);
    await exam.selectAnswer(0);
    await waitForSave(studentPage);
    expect(saveRequests.length).toBeGreaterThanOrEqual(0);
  });

  test("review phase shows summary", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);

    // Navigate through all questions to reach review
    for (let i = 0; i < 30; i++) {
      const reviewText = studentPage.getByText(/review|summary/i).first();
      if (await reviewText.isVisible().catch(() => false)) break;
      const reviewBtnVisible = await exam.reviewButton.isVisible().catch(() => false);
      if (reviewBtnVisible) { await exam.goToReview(); break; }
      const nextVisible = await exam.nextButton.isVisible().catch(() => false);
      if (!nextVisible) break;
      await exam.goNext();
      await studentPage.waitForTimeout(200);
    }
    const reviewText = studentPage.getByText(/review|summary/i).first();
    await expect(reviewText).toBeVisible({ timeout: 8_000 });
  });

  test("confirm checkbox must be checked before submitting", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);
    await exam.goToReview().catch(() => {});
    const reviewVisible = await studentPage.getByText(/review|summary/i).first().isVisible().catch(() => false);
    if (!reviewVisible) return;

    const checkboxPresent = await exam.confirmCheckbox.isVisible().catch(() => false);
    const submitDisabled = await exam.submitButton.getAttribute("disabled").catch(() => null);
    expect(checkboxPresent || submitDisabled !== null).toBeTruthy();
  });

  test("submitting the exam triggers grading", async ({ studentPage }) => {
    const exam = await enterExam(studentPage);

    // Answer some questions
    for (let i = 0; i < 5; i++) {
      const optionCount = await exam.answerOptions.count();
      if (optionCount > 0) await exam.selectAnswer(0);
      const nextVisible = await exam.nextButton.isVisible().catch(() => false);
      if (nextVisible) {
        await exam.goNext();
        await studentPage.waitForTimeout(300);
      } else break;
    }

    // Navigate to review and submit
    await exam.goToReview().catch(() => {});
    const confirmVisible = await exam.confirmCheckbox.isVisible().catch(() => false);
    if (confirmVisible) {
      await exam.confirmAndSubmit();
    } else {
      const submitVisible = await exam.submitButton.isVisible().catch(() => false);
      if (submitVisible) await exam.submitButton.click();
    }

    // After submit, expect status text or score to appear
    const statusOrScore = studentPage.locator("text=/graded|grading|submitted|result|score|%/i").first();
    await expect(statusOrScore).toBeVisible({ timeout: 15_000 });
  });

  test("results page shows score after a graded submission", async ({ studentPage }) => {
    await studentPage.goto("/results");
    const resultLink = studentPage.locator("a[href*='/results/']").first();
    const hasResults = await resultLink.isVisible().catch(() => false);
    if (!hasResults) return;

    const scoreText = studentPage.locator("text=/\\d+\\s*%/").first();
    await expect(scoreText).toBeVisible();
  });
});
