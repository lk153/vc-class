import { type Page, type Locator } from "@playwright/test";

export class PracticeSessionPage {
  readonly page: Page;
  readonly questionContent: Locator;
  readonly answerOptions: Locator;
  readonly textInput: Locator;
  readonly feedbackCorrect: Locator;
  readonly feedbackWrong: Locator;
  readonly nextButton: Locator;
  readonly timer: Locator;
  readonly progressText: Locator;
  readonly resultsScreen: Locator;
  readonly scoreText: Locator;
  readonly retryButton: Locator;
  readonly reviewTopicButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // PracticeSession renders question content as text in the main area
    this.questionContent = page.locator("h2, h3, p").filter({ hasText: /\w{3,}/ }).first();
    // Answer options are buttons with option text (same pattern as exam MCQ)
    this.answerOptions = page.locator("button.w-full.text-left")
      .or(page.locator("button").filter({ has: page.locator("span.rounded-full") }));
    this.textInput = page.locator("input[type='text']").first();
    this.feedbackCorrect = page.locator(".text-\\[\\#1b6b51\\]")
      .or(page.getByText(/correct/i));
    this.feedbackWrong = page.locator(".text-\\[\\#7b0020\\]")
      .or(page.getByText(/incorrect|wrong/i));
    this.nextButton = page.getByRole("button", { name: /next|continue/i });
    this.timer = page.locator("svg circle, .circular-timer").first();
    this.progressText = page.getByText(/\d+\s*(of|\/)\s*\d+/i).first();
    this.resultsScreen = page.getByText(/result|score|complete/i).first();
    this.scoreText = page.getByText(/\d+\s*%/).first();
    this.retryButton = page.getByRole("button", { name: /retry|again/i });
    this.reviewTopicButton = page.getByRole("link", { name: /review|topic/i });
  }

  async selectAnswer(index: number) {
    await this.answerOptions.nth(index).click();
  }

  async typeAnswer(text: string) {
    await this.textInput.fill(text);
  }
}
