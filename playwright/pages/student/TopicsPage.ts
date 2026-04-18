import { type Page, type Locator } from "@playwright/test";

export class TopicsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly languageFilters: Locator;
  readonly topicCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.languageFilters = page.locator("[data-testid='lang-filter'], button").filter({ hasText: /English|Vietnamese|All/i });
    this.topicCards = page.locator("[data-testid='topic-card'], a[href*='/topics/']").filter({ has: page.locator("h2, h3") });
    this.emptyState = page.locator("text=/no topics|empty/i");
  }

  async goto() {
    await this.page.goto("/topics");
  }

  async clickTopic(title: string) {
    await this.topicCards.filter({ hasText: title }).click();
  }

  async filterByLanguage(lang: string) {
    await this.languageFilters.filter({ hasText: new RegExp(lang, "i") }).click();
  }

  topicCard(title: string) {
    return this.topicCards.filter({ hasText: title });
  }
}
