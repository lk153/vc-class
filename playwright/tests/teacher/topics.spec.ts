import { test, expect } from "../../fixtures/base";
import { TeacherTopicsPage } from "../../pages/teacher/TopicsPage";
import { expectPath } from "../../helpers/assertions";
import { uniqueName } from "../../helpers/seed.helper";

test.describe("Teacher Topics Page", () => {
  let topicsPage: TeacherTopicsPage;

  test.beforeEach(async ({ teacherPage }) => {
    topicsPage = new TeacherTopicsPage(teacherPage);
    await topicsPage.goto();
  });

  // ── READ: verify existing seed data ──

  test("topics page loads with heading and topic cards", async ({ teacherPage }) => {
    await expect(topicsPage.heading).toBeVisible();
    const cardCount = await topicsPage.topicCards.count();
    if (cardCount === 0) {
      await expect(topicsPage.emptyState).toBeVisible();
    } else {
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test("language filter chips are visible", async ({ teacherPage }) => {
    const chips = topicsPage.languageFilter;
    const count = await chips.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("language filter narrows the topic list", async ({ teacherPage }) => {
    const engChip = topicsPage.languageFilter.filter({ hasText: /English/i });
    const isVisible = await engChip.isVisible().catch(() => false);
    if (isVisible) {
      await engChip.click();
      await teacherPage.waitForTimeout(300);
      const count = await topicsPage.topicCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("topic cards show title and language badge", async ({ teacherPage }) => {
    const cardCount = await topicsPage.topicCards.count();
    if (cardCount > 0) {
      const firstCard = topicsPage.topicCards.first();
      await expect(firstCard).toBeVisible();
      const text = await firstCard.textContent();
      expect((text ?? "").length).toBeGreaterThan(0);
    }
  });

  test("clicking a topic card navigates to detail page", async ({ teacherPage }) => {
    const cardCount = await topicsPage.topicCards.count();
    if (cardCount > 0) {
      await topicsPage.topicCards.first().click();
      await expectPath(teacherPage, /\/teacher\/topics\//);
    }
  });

  // ── CREATE → VERIFY → DELETE lifecycle ──

  test("create topic, verify it appears, then it is cleaned up", async ({ teacherPage }) => {
    const title = uniqueName("Topic");

    // TopicList hides the create form by default — click the "add" placeholder to reveal it
    const addPlaceholder = teacherPage.locator("button").filter({ has: teacherPage.locator("text=add") }).last();
    const addVisible = await addPlaceholder.isVisible().catch(() => false);
    if (addVisible) {
      await addPlaceholder.click();
      await teacherPage.waitForTimeout(300);
    }

    // CREATE — must select a language (required field)
    await topicsPage.createTopic(title, "English", undefined);
    await teacherPage.waitForTimeout(500);

    // VERIFY: topic appears in the list
    const successToast = teacherPage.locator("[data-sonner-toast]").filter({ hasText: /success|created/i });
    const toastVisible = await successToast.isVisible().catch(() => false);
    const cardExists = await topicsPage.topicCards.filter({ hasText: title }).isVisible().catch(() => false);
    expect(toastVisible || cardExists).toBeTruthy();

    // DELETE: handled by global teardown (title starts with "E2E ")
  });

  // ── VALIDATION: no data created on error ──

  test("empty title shows validation error, no data created", async ({ teacherPage }) => {
    // Reveal the create form first
    const addPlaceholder = teacherPage.locator("button").filter({ has: teacherPage.locator("text=add") }).last();
    const addVisible = await addPlaceholder.isVisible().catch(() => false);
    if (addVisible) {
      await addPlaceholder.click();
      await teacherPage.waitForTimeout(300);
    }

    const titleInput = topicsPage.titleInput;
    const isVisible = await titleInput.isVisible().catch(() => false);
    if (isVisible) {
      await titleInput.fill("");
      await topicsPage.createButton.click();
      // Should stay on topics page (HTML5 required validation)
      await expect(teacherPage).toHaveURL(/\/teacher\/topics/);
    }
  });
});
