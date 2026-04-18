import { type Page, type Locator } from "@playwright/test";

export class StudentsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statCards: Locator;
  readonly studentRows: Locator;
  readonly emptyState: Locator;

  // Student Detail Modal
  readonly modal: Locator;
  readonly modalNameInput: Locator;
  readonly modalEmailInput: Locator;
  readonly modalSaveButton: Locator;
  readonly modalStatusToggle: Locator;
  readonly modalTopics: Locator;
  readonly modalCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.statCards = page.locator(".rounded-2xl").filter({ has: page.locator("text=/total|active|inactive/i") });
    this.studentRows = page.locator("tr, [data-testid='student-row']").filter({ has: page.locator("text=@") });
    this.emptyState = page.locator("text=/no students|empty/i");

    // Modal
    this.modal = page.locator(".fixed.inset-0").filter({ has: page.locator("input") });
    this.modalNameInput = page.getByLabel(/name/i);
    this.modalEmailInput = page.getByLabel(/email/i);
    this.modalSaveButton = page.getByRole("button", { name: /save|update/i });
    this.modalStatusToggle = page.getByRole("button", { name: /activate|deactivate/i });
    this.modalTopics = page.locator("[data-testid='topic-list'], li").filter({ hasText: /topic/i });
    this.modalCloseButton = page.getByRole("button", { name: /close|×/i });
  }

  async goto() {
    await this.page.goto("/teacher/students");
  }

  async clickStudent(name: string) {
    await this.studentRows.filter({ hasText: name }).click();
  }
}
