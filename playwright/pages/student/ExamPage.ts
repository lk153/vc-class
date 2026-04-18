import { type Page, type Locator } from "@playwright/test";

export class ExamPage {
  readonly page: Page;

  // Entry Gate — buttons use translated text:
  //   "Start Exam" (new session), "Continue Exam" (resume DOING), "Retake" (new attempt)
  readonly startButton: Locator;
  readonly resumeButton: Locator;
  readonly retakeButton: Locator;
  readonly gateStatus: Locator;
  readonly scoreDisplay: Locator;

  // Exam Shell
  readonly header: Locator;
  readonly timer: Locator;
  readonly saveStatus: Locator;
  readonly questionPaletteToggle: Locator;

  // Navigation — ExamFooter buttons
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly reviewButton: Locator;

  // Questions — QuestionRenderer renders MCQ as <button> with nested <span>A</span> label
  readonly questionContent: Locator;
  readonly answerOptions: Locator;
  readonly flagButton: Locator;
  readonly textInput: Locator;

  // Review — ExamReview component
  readonly reviewSummary: Locator;
  readonly confirmCheckbox: Locator;
  readonly submitButton: Locator;

  // Result
  readonly confetti: Locator;

  constructor(page: Page) {
    this.page = page;

    // Entry Gate
    this.startButton = page.getByRole("button", { name: /start exam/i });
    this.resumeButton = page.getByRole("button", { name: /continue exam/i });
    this.retakeButton = page.getByRole("button", { name: /retake/i });
    this.gateStatus = page.locator("text=/graded|grading|in progress|submitted/i").first();
    this.scoreDisplay = page.locator("text=/\\d+\\s*%/").first();

    // Exam Shell
    this.header = page.locator("header, [data-testid='exam-header']").first();
    this.timer = page.locator("text=/\\d+:\\d+/");
    this.saveStatus = page.locator("text=/saved|saving/i");
    this.questionPaletteToggle = page.getByRole("button").filter({
      has: page.locator("text=grid_view"),
    });

    // Navigation
    this.nextButton = page.getByRole("button", { name: /next/i });
    this.prevButton = page.getByRole("button", { name: /prev/i });
    this.reviewButton = page.getByRole("button", { name: /review/i });

    // Questions — MCQ buttons contain a label span (A/B/C/D) + option text
    this.questionContent = page.locator("h3, p").filter({
      hasText: /\w{3,}/,  // At least 3 chars to filter out icons
    }).first();
    this.answerOptions = page.locator("button.w-full.text-left");
    this.flagButton = page.getByRole("button", { name: /flag|bookmark/i });
    this.textInput = page.locator("input[type='text'], textarea").first();

    // Review
    this.reviewSummary = page.getByText(/review|summary/i).first();
    this.confirmCheckbox = page.locator("input[type='checkbox']");
    this.submitButton = page.getByRole("button", { name: /submit/i });

    // Result
    this.confetti = page.locator("[data-testid='confetti'], .confetti, canvas");
  }

  async goto(topicId: string, testId: string) {
    await this.page.goto(`/topics/${topicId}/practice?testId=${testId}`);
  }

  async selectAnswer(index: number) {
    await this.answerOptions.nth(index).click();
  }

  async typeAnswer(text: string) {
    await this.textInput.fill(text);
  }

  async flagCurrentQuestion() {
    await this.flagButton.click();
  }

  async goNext() {
    await this.nextButton.click();
  }

  async goPrev() {
    await this.prevButton.click();
  }

  async goToReview() {
    await this.reviewButton.click();
  }

  async confirmAndSubmit() {
    await this.confirmCheckbox.check();
    await this.submitButton.click();
  }

  async startExam() {
    await this.startButton.click();
  }

  async resumeExam() {
    await this.resumeButton.click();
  }
}
