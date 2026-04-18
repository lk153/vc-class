import { type Page, type Locator } from "@playwright/test";

export class ClassDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statusDropdown: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly enrolledStudents: Locator;
  readonly enrollSearchInput: Locator;
  readonly enrollButton: Locator;
  readonly topicAssignments: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    // Custom dropdown toggle — button with status text + expand_more chevron
    this.statusDropdown = page.locator("button").filter({
      hasText: /scheduling|active|ended|cancelled/i,
    }).first();
    this.nameInput = page.getByLabel(/class name|name/i);
    this.saveButton = page.getByRole("button", { name: /save|update/i });
    this.enrolledStudents = page.locator("[data-testid='enrolled'], tr, li").filter({ hasText: /@/ });
    this.enrollSearchInput = page.getByPlaceholder(/search.*student|email/i);
    this.enrollButton = page.getByRole("button", { name: /enroll|add/i });
    this.topicAssignments = page.locator("[data-testid='topic-assignment'], li, tr").filter({
      hasText: /topic/i,
    });
    this.deleteButton = page.getByRole("button", { name: /delete|remove/i });
  }

  async goto(classId: string) {
    await this.page.goto(`/teacher/classes/${classId}`);
  }

  async enrollStudent(email: string) {
    await this.enrollSearchInput.fill(email);
    await this.enrollButton.click();
  }

  async unenrollStudent(name: string) {
    const row = this.enrolledStudents.filter({ hasText: name });
    await row.getByRole("button", { name: /remove|unenroll/i }).click();
  }
}
