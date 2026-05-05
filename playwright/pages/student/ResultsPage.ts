import { type Page, type Locator } from "@playwright/test";

export class ResultsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly resultRows: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.resultRows = page.locator("a[href*='/results/'], tr, [data-testid='result-row']");
    this.emptyState = page.locator("text=/no (test )?results( yet)?|empty|haven't taken/i");
  }

  async goto() {
    await this.page.goto("/results");
  }

  async clickResult(testTitle: string) {
    await this.resultRows.filter({ hasText: testTitle }).first().click();
  }

  resultRow(testTitle: string) {
    return this.resultRows.filter({ hasText: testTitle }).first();
  }
}
