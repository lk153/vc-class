import { type Page, type Locator } from "@playwright/test";

export class TeacherTopicDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly vocabList: Locator;
  readonly vocabRows: Locator;
  readonly addWordButton: Locator;
  readonly importVocabLink: Locator;

  // Add/Edit form
  readonly wordInput: Locator;
  readonly typeInput: Locator;
  readonly pronunciationInput: Locator;
  readonly meaningInput: Locator;
  readonly exampleInput: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.vocabList = page.locator("[data-testid='vocab-list'], table, .space-y-2").first();
    this.vocabRows = page.locator("tr, [data-testid='vocab-row']").filter({
      has: page.locator("td, span"),
    });
    this.addWordButton = page.getByRole("button", { name: /add.*word|new.*word/i });
    this.importVocabLink = page.getByRole("link", { name: /import/i });

    // Form fields
    this.wordInput = page.getByLabel(/word/i).or(page.getByPlaceholder(/word/i));
    this.typeInput = page.getByLabel(/type/i);
    this.pronunciationInput = page.getByLabel(/pronunciation/i);
    this.meaningInput = page.getByLabel(/meaning/i);
    this.exampleInput = page.getByLabel(/example/i);
    this.saveButton = page.getByRole("button", { name: /save|add|update/i });
    this.deleteButton = page.getByRole("button", { name: /delete/i });
  }

  async goto(topicId: string) {
    await this.page.goto(`/teacher/topics/${topicId}`);
  }

  async addWord(data: { word: string; meaning: string; type?: string }) {
    await this.addWordButton.click();
    await this.wordInput.fill(data.word);
    await this.meaningInput.fill(data.meaning);
    if (data.type) await this.typeInput.fill(data.type);
    await this.saveButton.click();
  }
}
