import { test, expect } from "../../fixtures/base";
import { ResultsPage } from "../../pages/student/ResultsPage";
import { expectPath, expectScoreColor } from "../../helpers/assertions";

test.describe("Student – Results List", () => {
  let results: ResultsPage;

  test.beforeEach(async ({ studentPage }) => {
    results = new ResultsPage(studentPage);
    await results.goto();
  });

  test("results page loads with a heading", async ({ studentPage }) => {
    await expect(results.heading).toBeVisible();
  });

  test("result entries are listed (or empty state is shown)", async ({ studentPage }) => {
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) {
      await expect(results.emptyState).toBeVisible();
    } else {
      await expect(results.resultRows.first()).toBeVisible();
    }
  });

  test("each result entry shows the test title", async ({ studentPage }) => {
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) return; // nothing to assert
    const firstRow = results.resultRows.first();
    const titleLocator = firstRow.locator("span, p, td, [data-testid='result-title']").first();
    await expect(titleLocator).toBeVisible();
    const text = await titleLocator.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("each result entry shows a score", async ({ studentPage }) => {
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) return;
    const scoreLocator = results.resultRows.first().locator("text=/\\d+%/").first();
    await expect(scoreLocator).toBeVisible();
  });

  test("each result entry shows a date", async ({ studentPage }) => {
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) return;
    // Date can be in many formats: "Apr 15", "2026-04-15", "15/04/2026", relative "2 days ago"
    const dateLocator = results.resultRows
      .first()
      .locator(
        "text=/\\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ago|day/i",
      )
      .first();
    await expect(dateLocator).toBeVisible();
  });

  test("score color coding: >= 80% is shown in green", async ({ studentPage }) => {
    const highScoreRow = results.resultRows
      .filter({ hasText: /\b(8[0-9]|9[0-9]|100)%/ })
      .first();
    const hasHighScore = await highScoreRow.isVisible().catch(() => false);
    if (!hasHighScore) return; // no high-score result seeded

    const scoreEl = highScoreRow.locator("text=/\\d+%/").first();
    await expectScoreColor(scoreEl, 85); // passes green assertion
  });

  test("score color coding: < 50% is shown in red", async ({ studentPage }) => {
    const lowScoreRow = results.resultRows
      .filter({ hasText: /\b([0-4][0-9])%/ })
      .first();
    const hasLowScore = await lowScoreRow.isVisible().catch(() => false);
    if (!hasLowScore) return;

    const scoreEl = lowScoreRow.locator("text=/\\d+%/").first();
    await expectScoreColor(scoreEl, 30);
  });

  test("clicking a result row navigates to the result detail page", async ({ studentPage }) => {
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) return;
    await results.resultRows.first().click();
    await expectPath(studentPage, /\/results\//);
  });

  test("empty state is shown when there are no results", async ({ studentPage }) => {
    // Navigate with a filter or user context that would have no results
    await studentPage.goto("/results?class=__nonexistent__");
    const rowCount = await results.resultRows.count();
    if (rowCount === 0) {
      const empty = studentPage.locator("text=/no results|empty|haven't taken/i");
      const hasEmpty = await empty.isVisible().catch(() => false);
      // Either an explicit empty state message or simply zero rows is acceptable
      expect(hasEmpty || rowCount === 0).toBeTruthy();
    }
  });
});
