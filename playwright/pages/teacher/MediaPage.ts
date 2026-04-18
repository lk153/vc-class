import { type Page, type Locator } from "@playwright/test";

export class MediaPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly uploadButton: Locator;
  readonly typeFilterToggle: Locator;
  readonly searchInput: Locator;
  readonly mediaRows: Locator;
  readonly pagination: Locator;
  readonly statCards: Locator;
  readonly emptyState: Locator;
  readonly fileInput: Locator;
  readonly uploadSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.uploadButton = page.getByRole("button", { name: /upload/i });
    // TypeFilterDropdown toggle — inside main content area, shows "All" or filter name + expand_more
    // Must NOT match the LocaleSwitcher (which also has expand_more)
    this.typeFilterToggle = page.locator("main button").filter({
      hasText: /all|image|audio|video/i,
    }).filter({
      has: page.locator("text=expand_more"),
    }).first();
    this.searchInput = page.getByPlaceholder(/search/i);
    // Media rows — table rows with td cells
    this.mediaRows = page.locator("table tbody tr");
    this.pagination = page.locator("nav, [data-testid='pagination']");
    this.statCards = page.locator(".rounded-2xl").filter({
      has: page.getByText(/total|storage|file/i),
    });
    this.emptyState = page.getByText(/no media|no file|empty/i).first();
    this.fileInput = page.locator("input[type='file']");
    this.uploadSubmitButton = page.getByRole("button", { name: /upload|save/i }).last();
  }

  async goto() {
    await this.page.goto("/teacher/media");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByType(type: "All" | "Image" | "Audio" | "Video") {
    // Open the TypeFilterDropdown
    await this.typeFilterToggle.click();
    await this.page.waitForTimeout(200);
    // Click the option inside the dropdown menu
    const dropdown = this.page.locator(".absolute.top-full");
    await dropdown.getByText(type, { exact: false }).click();
  }

  async copyUrl(fileName: string) {
    const row = this.mediaRows.filter({ hasText: fileName });
    await row.getByRole("button", { name: /copy/i }).click();
  }

  async deleteMedia(fileName: string) {
    const row = this.mediaRows.filter({ hasText: fileName });
    await row.getByRole("button", { name: /delete/i }).click();
  }
}
