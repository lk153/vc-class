import { type Page, type Locator } from "@playwright/test";

export class TeacherTopicsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly topicCards: Locator;
  readonly languageFilter: Locator;
  readonly emptyState: Locator;

  // Create form
  readonly titleInput: Locator;
  readonly languageSelect: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.topicCards = page.locator("a[href*='/teacher/topics/'], [data-testid='topic-card']");
    this.languageFilter = page.getByRole("button").filter({ hasText: /English|Vietnamese|All/i });
    this.emptyState = page.locator("text=/no topics|empty/i");

    // Create form
    this.titleInput = page.getByPlaceholder(/topic.*title|enter.*title/i);
    this.languageSelect = page.locator("select").first();
    this.descriptionInput = page.getByPlaceholder(/description/i);
    // The submit button inside the create form (type="submit"), not the add placeholder
    this.createButton = page.locator("button[type='submit']");
  }

  async goto() {
    await this.page.goto("/teacher/topics");
  }

  async createTopic(title: string, language?: string, description?: string) {
    await this.titleInput.fill(title);
    if (language) await this.languageSelect.selectOption({ label: language });
    if (description) await this.descriptionInput.fill(description);
    await this.createButton.click();
  }

  async clickTopic(title: string) {
    await this.topicCards.filter({ hasText: title }).click();
  }
}
