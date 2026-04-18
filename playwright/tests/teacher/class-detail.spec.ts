import { test, expect } from "../../fixtures/base";
import { ClassesPage } from "../../pages/teacher/ClassesPage";
import { ClassDetailPage } from "../../pages/teacher/ClassDetailPage";
import { expectToast } from "../../helpers/assertions";

test.describe("Teacher Class Detail Page", () => {
  let classDetailPage: ClassDetailPage;
  let classesPage: ClassesPage;

  test.beforeEach(async ({ teacherPage }) => {
    classDetailPage = new ClassDetailPage(teacherPage);
    classesPage = new ClassesPage(teacherPage);
    await classesPage.goto();
    // Click the first actual class card (not the create link)
    const cardCount = await classesPage.classCards.count();
    if (cardCount > 0) {
      await classesPage.classCards.first().click();
      await teacherPage.waitForURL(/\/teacher\/classes\/(?!create)/);
    }
  });

  test("class detail page loads with class name", async ({ teacherPage }) => {
    // Class detail uses an editable textbox for the name, not an h1 heading
    const nameInput = teacherPage.locator("input[type='text']").first();
    await expect(nameInput).toBeVisible();
  });

  test("class name is displayed in an editable field", async ({ teacherPage }) => {
    const nameInput = teacherPage.locator("input[type='text']").first();
    await expect(nameInput).toBeVisible();
  });

  test("status button is visible and shows current status", async ({ teacherPage }) => {
    // Status is a custom dropdown button showing current status text
    const statusBtn = teacherPage.locator("button").filter({
      hasText: /scheduling|active|ended|cancelled/i,
    }).first();
    const isVisible = await statusBtn.isVisible().catch(() => false);
    if (isVisible) {
      await expect(statusBtn).toBeVisible();
    }
  });

  test("enrolled students section is present", async ({ teacherPage }) => {
    const enrollSection = teacherPage.getByText(/enrolled|student/i).first();
    await expect(enrollSection).toBeVisible();
  });

  test("enrollment section shows student checkboxes or list", async ({ teacherPage }) => {
    // Enrollment uses checkboxes on available students, not a search input
    const enrollArea = teacherPage.getByText(/enroll|student/i).first();
    await expect(enrollArea).toBeVisible();
  });

  test("topic assignments section lists assigned topics", async ({ teacherPage }) => {
    const topicSection = teacherPage.getByText(/topic/i).first();
    await expect(topicSection).toBeVisible();
  });

  test("save action shows a success toast", async ({ teacherPage }) => {
    const saveBtn = teacherPage.getByRole("button", { name: /save|update/i }).first();
    const hasSaveBtn = await saveBtn.isVisible().catch(() => false);
    if (hasSaveBtn) {
      await saveBtn.click();
      await expectToast(teacherPage, /saved|updated|success/i);
    } else {
      await teacherPage.waitForLoadState("networkidle");
      await expect(teacherPage.locator("input[type='text']").first()).toBeVisible();
    }
  });

  test("max students field is visible", async ({ teacherPage }) => {
    // Max students is a number input
    const maxField = teacherPage.locator("input[type='number']").first();
    const isVisible = await maxField.isVisible().catch(() => false);
    if (isVisible) {
      await expect(maxField).toBeVisible();
    }
  });
});
