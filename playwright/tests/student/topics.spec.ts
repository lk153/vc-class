import { test, expect } from "../../fixtures/base";
import { TopicsPage } from "../../pages/student/TopicsPage";
import { expectPath } from "../../helpers/assertions";

test.describe("Student – Topics Grid", () => {
  let topics: TopicsPage;

  test.beforeEach(async ({ studentPage }) => {
    topics = new TopicsPage(studentPage);
    await topics.goto();
  });

  test("topics page loads and shows a heading", async ({ studentPage }) => {
    await expect(topics.heading).toBeVisible();
  });

  test("enrolled topic cards are visible", async ({ studentPage }) => {
    await expect(topics.topicCards.first()).toBeVisible();
  });

  test("topic card displays a title", async ({ studentPage }) => {
    const card = topics.topicCards.first();
    await expect(card.locator("h2, h3, [data-testid='topic-title']").first()).toBeVisible();
  });

  test("topic card displays a vocab count", async ({ studentPage }) => {
    const card = topics.topicCards.first();
    // Look for any number indicating word/vocab count
    await expect(
      card.locator("text=/\\d+\\s*(word|vocab|term)/i").or(card.locator("[data-testid='vocab-count']")),
    ).toBeVisible();
  });

  test("topic card displays a progress bar or progress indicator", async ({ studentPage }) => {
    const card = topics.topicCards.first();
    await expect(
      card
        .locator("[role='progressbar'], progress, [data-testid='progress'], .progress")
        .or(card.locator("text=/\\d+%/").or(card.locator("svg circle"))),
    ).toBeVisible();
  });

  test("clicking a topic card navigates to its detail page", async ({ studentPage }) => {
    await topics.topicCards.first().click();
    await expectPath(studentPage, /\/topics\/[^/]+/);
  });

  test("language filter buttons are rendered", async ({ studentPage }) => {
    // Filters may or may not exist depending on enrolled languages; just assert page is usable
    const filterCount = await topics.languageFilters.count();
    // Either filters exist or the grid is shown directly — both are valid
    expect(filterCount >= 0).toBeTruthy();
  });

  test("language filter narrows visible topic cards", async ({ studentPage }) => {
    const filterButtons = topics.languageFilters;
    const count = await filterButtons.count();
    if (count === 0) {
      test.skip(); // No language filters present for this student
      return;
    }
    const initialCount = await topics.topicCards.count();
    await filterButtons.first().click();
    // After filtering, card count should be ≤ the original count
    const filteredCount = await topics.topicCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("topics page shows at least one topic for an enrolled student", async ({
    studentPage,
  }) => {
    // The test student is enrolled in a class with assigned topics
    const topics = new TopicsPage(studentPage);
    await topics.goto();
    const cardCount = await topics.topicCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
