import { type Page, type Locator } from "@playwright/test";

export class ImportVocabPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly fileInput: Locator;
  readonly uploadArea: Locator;
  readonly previewTable: Locator;
  readonly importButton: Locator;
  readonly errorTable: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.fileInput = page.locator("input[type='file']");
    this.uploadArea = page.locator("[data-testid='upload-area'], .border-dashed");
    this.previewTable = page.locator("table, [data-testid='preview']").first();
    this.importButton = page.getByRole("button", { name: /import|upload/i });
    this.errorTable = page.locator("table").filter({ hasText: /error|invalid/i });
    this.successMessage = page.locator("text=/imported|success/i");
  }

  async goto(topicId: string) {
    await this.page.goto(`/teacher/topics/${topicId}/import-vocab`);
  }

  async uploadCsvContent(content: string, filename = "vocab.csv") {
    await this.fileInput.setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
  }
}
