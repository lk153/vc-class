import { type Page, type Locator } from "@playwright/test";

export class ImportTestPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly topicDropdown: Locator;
  readonly fileInput: Locator;
  readonly uploadArea: Locator;
  readonly errorTable: Locator;
  readonly importButton: Locator;
  readonly previewTable: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    // Custom dropdown: button "Select topic... expand_more"
    this.topicDropdown = page.getByRole("button", { name: /select topic/i });
    this.fileInput = page.locator("input[type='file']");
    this.uploadArea = page.locator(".border-dashed").first();
    this.errorTable = page.locator("table").filter({
      has: page.getByText(/error|invalid/i),
    });
    this.importButton = page.getByRole("button", { name: /import|upload/i });
    this.previewTable = page.locator("table").first();
    this.successMessage = page.getByText(/imported|success/i).first();
  }

  async goto() {
    await this.page.goto("/teacher/practice-tests/import");
  }

  async selectTopic(topicName: string) {
    await this.topicDropdown.click();
    await this.page.getByText(topicName, { exact: false }).click();
  }

  async uploadCsv(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async uploadCsvContent(content: string, filename = "test.csv") {
    await this.fileInput.setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
  }
}
