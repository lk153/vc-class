import { type Page, type Locator } from "@playwright/test";

export class ResultDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly scoreDisplay: Locator;
  readonly difficultyBreakdown: Locator;
  readonly questionTypeBreakdown: Locator;
  readonly timeDistribution: Locator;
  readonly attemptHistory: Locator;
  readonly answerRows: Locator;
  readonly teacherComments: Locator;
  readonly confetti: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.scoreDisplay = page.getByText(/\d+\s*%/).first();
    this.difficultyBreakdown = page.getByText(/difficulty|easy|medium|hard/i).first();
    this.questionTypeBreakdown = page.getByText(/question type|multiple choice/i).first();
    this.timeDistribution = page.getByText(/time|duration/i).first();
    this.attemptHistory = page.getByText(/attempt/i).first();
    this.answerRows = page.locator("tr").filter({
      has: page.locator("td"),
    });
    this.teacherComments = page.getByText(/comment|feedback/i).first();
    this.confetti = page.locator("canvas, [data-testid='confetti']");
    // Use the specific "arrow_back My Results" link to avoid strict mode
    this.backButton = page.locator("a[href='/results']").first();
  }

  async goto(resultId: string) {
    await this.page.goto(`/results/${resultId}`);
  }
}
