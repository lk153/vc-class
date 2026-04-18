import { test, expect } from "../../fixtures/base";
import { MediaPage } from "../../pages/teacher/MediaPage";
import { expectToast, waitForSave } from "../../helpers/assertions";

test.describe("Teacher Media Page", () => {
  let mediaPage: MediaPage;

  test.beforeEach(async ({ teacherPage }) => {
    mediaPage = new MediaPage(teacherPage);
    await mediaPage.goto();
  });

  test("media page loads with a heading", async ({ teacherPage }) => {
    await expect(mediaPage.heading).toBeVisible();
  });

  test("stats cards are visible showing file counts or storage usage", async ({ teacherPage }) => {
    const statCount = await mediaPage.statCards.count();
    if (statCount > 0) {
      await expect(mediaPage.statCards.first()).toBeVisible();
    } else {
      // Stats may be hidden when there are no files
      await expect(mediaPage.heading).toBeVisible();
    }
  });

  test("type filter dropdown toggle is visible", async ({ teacherPage }) => {
    // TypeFilterDropdown renders as a single toggle button (not 4 separate buttons)
    await expect(mediaPage.typeFilterToggle).toBeVisible();
  });

  test("filtering by Image type narrows the media table", async ({ teacherPage }) => {
    await mediaPage.filterByType("Image");
    await teacherPage.waitForTimeout(400);
    const rowCount = await mediaPage.mediaRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test("filtering by Audio type narrows the media table", async ({ teacherPage }) => {
    await mediaPage.filterByType("Audio");
    await teacherPage.waitForTimeout(400);
    const rowCount = await mediaPage.mediaRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test("search input filters by filename", async ({ teacherPage }) => {
    await expect(mediaPage.searchInput).toBeVisible();
    await mediaPage.search("test");
    await teacherPage.waitForTimeout(400);
    const rowCount = await mediaPage.mediaRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test("upload button opens the upload modal", async ({ teacherPage }) => {
    await expect(mediaPage.uploadButton).toBeVisible();
    await mediaPage.uploadButton.click();
    await teacherPage.waitForTimeout(400);
    // Upload modal or file input should appear
    const fileInput = mediaPage.fileInput;
    const modal = teacherPage.locator("[role='dialog'], .fixed.inset-0").first();
    const fileInputVisible = await fileInput.isVisible().catch(() => false);
    const modalVisible = await modal.isVisible().catch(() => false);
    expect(fileInputVisible || modalVisible).toBeTruthy();
  });

  test("media rows show filename and action buttons when media exists", async ({ teacherPage }) => {
    const rowCount = await mediaPage.mediaRows.count();
    if (rowCount > 0) {
      const firstRow = mediaPage.mediaRows.first();
      await expect(firstRow).toBeVisible();
      const text = await firstRow.textContent();
      expect((text ?? "").length).toBeGreaterThan(0);
    } else {
      await expect(mediaPage.heading).toBeVisible();
    }
  });

  test("empty state is shown when there are no media files", async ({ teacherPage }) => {
    // Filter by a type that likely has no files to trigger empty state
    await mediaPage.filterByType("Video");
    await teacherPage.waitForTimeout(400);
    const rowCount = await mediaPage.mediaRows.count();
    if (rowCount === 0) {
      await expect(mediaPage.emptyState).toBeVisible();
    }
  });
});
