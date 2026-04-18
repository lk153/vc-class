import { type Page, type Locator } from "@playwright/test";

export class TopicDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly vocabGrid: Locator;
  readonly vocabItems: Locator;
  readonly flashcardButton: Locator;
  readonly practiceTests: Locator;
  readonly progressRing: Locator;
  readonly segmentedControl: Locator;
  readonly markAllLearnedButton: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.vocabGrid = page.locator("[data-testid='vocab-grid']").or(page.locator("table, .grid").first());
    this.vocabItems = page.locator("tr, [data-testid='vocab-item']");
    this.flashcardButton = page.getByRole("link", { name: /flashcard/i });
    this.practiceTests = page.locator("a[href*='/practice'], div").filter({ hasText: /practice|test/i });
    this.progressRing = page.locator("svg circle, [data-testid='progress']");
    this.segmentedControl = page.locator("button").filter({ hasText: /All|Learned|Not Learned/i });
    this.markAllLearnedButton = page.getByRole("button", { name: /mark all|reset all/i });
    this.paginationNext = page.getByRole("button", { name: /next|chevron_right/i });
    this.paginationPrev = page.getByRole("button", { name: /prev|chevron_left/i });
  }

  async goto(topicId: string) {
    await this.page.goto(`/topics/${topicId}`);
  }

  async clickPracticeTest(title: string) {
    await this.practiceTests.filter({ hasText: title }).click();
  }

  async filterVocab(segment: "All" | "Learned" | "Not Learned") {
    await this.segmentedControl.filter({ hasText: segment }).click();
  }
}
