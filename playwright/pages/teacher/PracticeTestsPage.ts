import { type Page, type Locator } from "@playwright/test";

export class PracticeTestsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly importButton: Locator;
  readonly searchInput: Locator;
  readonly statusChips: Locator;
  readonly languageChips: Locator;
  readonly testCards: Locator;
  readonly statCards: Locator;
  readonly pagination: Locator;
  readonly pageButtons: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly paginationInfo: Locator;
  readonly emptyState: Locator;
  readonly clearFiltersButton: Locator;
  readonly filterCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.importButton = page.getByRole("link", { name: /import/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.statusChips = page.getByRole("button").filter({ hasText: /All|Active|Draft|Inactive/i });
    this.languageChips = page.getByRole("button").filter({ hasText: /English|Vietnamese/i });
    this.testCards = page.locator(".group.relative.rounded-2xl, [data-testid='test-card']");
    this.statCards = page.locator(".rounded-2xl.shadow").filter({ has: page.locator("text=/total|question|topic/i") });
    this.pagination = page.locator(".flex.items-center.justify-center.gap-1\\.5");
    this.pageButtons = this.pagination.locator("button:not([disabled])");
    this.prevPageButton = page.locator("button").filter({ has: page.locator("text=chevron_left") });
    this.nextPageButton = page.locator("button").filter({ has: page.locator("text=chevron_right") });
    this.paginationInfo = page.locator("text=/\\d+–\\d+\\s+of\\s+\\d+/");
    this.emptyState = page.locator("text=/no tests/i");
    this.clearFiltersButton = page.getByRole("button", { name: /clear/i });
    this.filterCount = page.locator("text=/\\d+\\s+of\\s+\\d+\\s+tests/");
  }

  async goto() {
    await this.page.goto("/teacher/practice-tests");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByStatus(status: "All" | "Active" | "Draft" | "Inactive") {
    await this.statusChips.filter({ hasText: status }).click();
  }

  async clickTest(title: string) {
    await this.testCards.filter({ hasText: title }).click();
  }

  async goToPage(pageNum: number) {
    await this.pagination.getByRole("button", { name: String(pageNum), exact: true }).click();
  }

  async deleteTest(title: string) {
    const card = this.testCards.filter({ hasText: title });
    await card.hover();
    await card.locator("button").filter({ has: this.page.locator("text=delete") }).click();
  }

  testCard(title: string) {
    return this.testCards.filter({ hasText: title });
  }
}
