import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Custom assertion helpers for common VC Class UI patterns.
 */

/** Assert a Sonner toast appeared with the given text */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 5_000 });
}

/** Assert a toast did NOT appear */
export async function expectNoToast(page: Page, text: string | RegExp) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await expect(toast).not.toBeVisible({ timeout: 2_000 });
}

/** Assert score text has correct color class */
export async function expectScoreColor(
  locator: Locator,
  score: number,
) {
  if (score >= 80) {
    await expect(locator).toHaveCSS("color", /27, 107, 81/); // #1b6b51
  } else if (score >= 50) {
    await expect(locator).toHaveCSS("color", /42, 20, 180/); // #2a14b4
  } else {
    await expect(locator).toHaveCSS("color", /123, 0, 32/); // #7b0020
  }
}

/** Assert a Material Symbols icon is present */
export async function expectIcon(parent: Locator, iconName: string) {
  await expect(
    parent.locator(".material-symbols-outlined", { hasText: iconName }),
  ).toBeVisible();
}

/** Assert page is on expected URL path */
export async function expectPath(page: Page, path: string | RegExp) {
  if (typeof path === "string") {
    await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } else {
    await expect(page).toHaveURL(path);
  }
}

/** Assert element count in a grid/list */
export async function expectCount(locator: Locator, count: number) {
  await expect(locator).toHaveCount(count);
}

/** Wait for network idle after an action (useful after API saves) */
export async function waitForSave(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 5_000 });
}
