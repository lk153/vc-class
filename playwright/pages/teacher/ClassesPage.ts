import { type Page, type Locator } from "@playwright/test";

export class ClassesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly classCards: Locator;
  readonly emptyState: Locator;

  // Create form fields
  readonly nameInput: Locator;
  readonly languageSelect: Locator;
  readonly levelInput: Locator;
  readonly levelSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly maxStudentsInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.createButton = page.getByRole("link", { name: /create|new class/i });
    // Match class detail links but NOT the create link
    this.classCards = page.locator("a[href*='/teacher/classes/']:not([href*='create'])");
    this.emptyState = page.locator("text=/no classes|empty/i");

    // Create form (on /teacher/classes/create)
    this.nameInput = page.getByPlaceholder(/intermediate|class name|conversation/i);
    this.languageSelect = page.locator("select").first();
    this.levelInput = page.getByPlaceholder(/beginner|level|B1/i);
    // When language has presets (en/zh), level becomes the 2nd <select>
    this.levelSelect = page.locator("select").nth(1);
    this.startDateInput = page.getByLabel(/start/i);
    this.endDateInput = page.getByLabel(/end/i);
    this.maxStudentsInput = page.getByLabel(/max|capacity/i);
    this.submitButton = page.getByRole("button", { name: /create|save/i });
  }

  async goto() {
    await this.page.goto("/teacher/classes");
  }

  async gotoCreate() {
    await this.page.goto("/teacher/classes/create");
  }

  async clickClass(name: string) {
    await this.classCards.filter({ hasText: name }).click();
  }
}
