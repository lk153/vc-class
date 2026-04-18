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
    this.recentResultsTable = page.locator("table, [data-testid='results-table']").first();
    this.resultRows = page.locator("tr, [data-testid='result-row']").filter({
      has: page.locator("td, [data-testid='score']"),
    });
  }

  async goto() {
    await this.page.goto("/teacher");
  }
}
