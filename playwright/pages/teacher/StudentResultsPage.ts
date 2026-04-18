import { type Page, type Locator } from "@playwright/test";

export class StudentResultsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly resultRows: Locator;
  readonly pagination: Locator;
  readonly bulkDeleteButton: Locator;
  readonly selectAllCheckbox: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.statusFilter = page.getByRole("button").filter({ hasText: /all|graded|grading|submitted/i });
    this.dateFromInput = page.getByLabel(/from|start date/i);
    this.dateToInput = page.getByLabel(/to|end date/i);
    this.resultRows = page.locator("tr, [data-testid='result-row']").filter({
      has: page.locator("td, [data-testid='score']"),
    });
    this.pagination = page.locator("[data-testid='pagination'], nav");
    this.bulkDeleteButton = page.getByRole("button", { name: /delete/i });
    this.selectAllCheckbox = page.locator("th input[type='checkbox'], [data-testid='select-all']");
    this.emptyState = page.locator("text=/no results|empty/i");
  }

  async goto() {
    await this.page.goto("/teacher/student-results");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async clickResult(studentName: string) {
    await this.resultRows.filter({ hasText: studentName }).first().click();
  }
}
