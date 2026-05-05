import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statCards: Locator;
  readonly totalStudentsStat: Locator;
  readonly activeStudentsStat: Locator;
  readonly totalTopicsStat: Locator;
  readonly recentResultsTable: Locator;
  readonly resultRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.statCards = page.locator(".rounded-2xl, [data-testid='stat-card']").filter({
      has: page.locator("p, span"),
    });
    this.totalStudentsStat = this.statCards.filter({ hasText: /student/i }).first();
    this.activeStudentsStat = this.statCards.filter({ hasText: /active/i }).first();
    this.totalTopicsStat = this.statCards.filter({ hasText: /topic/i }).first();
    // "Recent Results" is a card list (Link cards), not a <table>. Match the
    // section by its heading wrapper, and rows by the per-result <Link>.
    this.recentResultsTable = page.locator("div").filter({
      has: page.getByRole("heading", { name: /recent results/i }),
    }).last();
    this.resultRows = page.locator("a[href*='/teacher/student-results/'], [data-testid='result-row']");
  }

  async goto() {
    await this.page.goto("/teacher");
  }
}
