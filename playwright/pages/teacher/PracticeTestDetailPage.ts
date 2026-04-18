import { type Page, type Locator } from "@playwright/test";

export class PracticeTestDetailPage {
  readonly page: Page;

  // Modal
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;

  // Settings
  readonly statusDropdown: Locator;
  readonly modeToggle: Locator;
  readonly shuffleAnswersToggle: Locator;
  readonly shuffleQuestionsToggle: Locator;
  readonly timeLimitInput: Locator;
  readonly maxAttemptsInput: Locator;
  readonly instantReviewToggle: Locator;

  // Questions
  readonly questionSearch: Locator;
  readonly questionTypeChips: Locator;
  readonly questionRows: Locator;
  readonly addQuestionButton: Locator;
  readonly bulkSelectAll: Locator;
  readonly bulkDeleteButton: Locator;
  readonly questionPagination: Locator;

  // Test Structure
  readonly addPartButton: Locator;
  readonly sectionItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator(".fixed.inset-0").filter({ has: page.locator(".rounded-2xl") });
    this.closeButton = page.getByRole("button", { name: /close|×/i });
    this.title = page.locator("[data-testid='editable-title'], h2").first();

    // Settings
    this.statusDropdown = page.locator("[data-testid='status-dropdown']").or(
      page.locator("button").filter({ hasText: /Active|Draft|Inactive/ }).first(),
    );
    this.modeToggle = page.locator("button, [data-testid='mode']").filter({ hasText: /practice|test/i }).first();
    this.shuffleAnswersToggle = page.locator("input[type='checkbox']").nth(0);
    this.shuffleQuestionsToggle = page.locator("input[type='checkbox']").nth(1);
    this.timeLimitInput = page.locator("input[type='number']").first();
    this.maxAttemptsInput = page.locator("input[type='number']").nth(1);
    this.instantReviewToggle = page.locator("input[type='checkbox']").nth(2);

    // Questions
    this.questionSearch = page.getByPlaceholder(/search.*question/i);
    this.questionTypeChips = page.getByRole("button").filter({ hasText: /MC|T\/F|Fill|Reorder|Bank/i });
    // Question row = QuestionEditor root: .group.cursor-pointer wrapping a questionType badge
    this.questionRows = page.locator(".group.cursor-pointer").filter({
      hasText: /MULTIPLE_CHOICE|TRUE_FALSE|GAP_FILL|REORDER_WORDS|WORD_BANK/,
    });
    this.addQuestionButton = page.getByRole("button", { name: /add question/i });
    this.bulkSelectAll = page.locator("input[type='checkbox']").first();
    this.bulkDeleteButton = page.getByRole("button", { name: /delete.*selected/i });
    this.questionPagination = page.locator("text=/\\d+–\\d+/i");

    // Test Structure
    this.addPartButton = page.getByRole("button", { name: /add part|add section/i });
    this.sectionItems = page.locator("[data-testid='section-item']").or(
      page.locator(".flex.items-center").filter({ hasText: /Part|Group|Exercise/i }),
    );
  }

  async editTitle(newTitle: string) {
    await this.title.click();
    const input = this.page.locator("input[type='text']").first();
    await input.clear();
    await input.fill(newTitle);
    await input.press("Enter");
  }

  async setTimeLimit(minutes: number) {
    await this.timeLimitInput.clear();
    await this.timeLimitInput.fill(String(minutes));
    await this.timeLimitInput.blur();
  }

  async setMaxAttempts(attempts: number) {
    await this.maxAttemptsInput.clear();
    await this.maxAttemptsInput.fill(String(attempts));
    await this.maxAttemptsInput.blur();
  }

  async clickQuestion(number: number) {
    await this.questionRows.filter({ hasText: new RegExp(`Q${number}|#${number}`) }).click();
  }
}
