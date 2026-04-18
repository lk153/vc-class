import { type Page, type Locator } from "@playwright/test";

export class TeacherResultDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly studentInfo: Locator;
  readonly scoreDisplay: Locator;
  readonly answerRows: Locator;
  readonly needsReviewFilter: Locator;
  readonly markAsGradedButton: Locator;
  readonly commentInput: Locator;
  readonly addCommentButton: Locator;
  readonly comments: Locator;

  // Per-question grading
  readonly overrideToggle: Locator;
  readonly scoreInput: Locator;
  readonly teacherCommentInput: Locator;
  readonly saveGradeButton: Locator;

  // Grade by Question
  readonly gradeByQuestionLink: Locator;
  readonly questionNav: Locator;
  readonly studentSubmissions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.studentInfo = page.locator("[data-testid='student-info'], text=@");
    this.scoreDisplay = page.locator("[data-testid='score'], text=/\\d+%/").first();
    this.answerRows = page.locator("[data-testid='answer-row'], tr").filter({
      has: page.locator("td"),
    });
    this.needsReviewFilter = page.getByRole("button", { name: /needs review|manual/i });
    this.markAsGradedButton = page.getByRole("button", { name: /mark.*graded/i });
    this.commentInput = page.locator("textarea").first();
    this.addCommentButton = page.getByRole("button", { name: /add comment|post/i });
    this.comments = page.locator("[data-testid='comment']").or(
      page.locator(".rounded-xl").filter({ hasText: /comment/i }),
    );

    // Per-question grading
    this.overrideToggle = page.locator("[data-testid='override'], input[type='checkbox']");
    this.scoreInput = page.locator("input[type='number']").filter({ hasText: /score/i });
    this.teacherCommentInput = page.locator("textarea[placeholder*='comment'], [data-testid='teacher-comment']");
    this.saveGradeButton = page.getByRole("button", { name: /save.*grade/i });

    // Grade by Question
    this.gradeByQuestionLink = page.getByRole("button", { name: /grade by question/i });
    this.questionNav = page.locator("[data-testid='question-nav']");
    this.studentSubmissions = page.locator("[data-testid='submission'], .border-b");
  }

  async goto(resultId: string) {
    await this.page.goto(`/teacher/student-results/${resultId}`);
  }

  async expandAnswer(questionNum: number) {
    await this.answerRows.filter({ hasText: new RegExp(`Q${questionNum}|#${questionNum}`) }).click();
  }

  async addComment(text: string) {
    await this.commentInput.fill(text);
    await this.addCommentButton.click();
  }
}
