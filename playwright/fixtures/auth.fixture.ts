import { test as base, type Page, type BrowserContext, type APIRequestContext } from "@playwright/test";
import path from "path";
import { ApiHelper } from "../helpers/api.helper";

const TEACHER_AUTH = path.join(__dirname, "..", ".auth", "e2e-teacher.json");
const STUDENT_AUTH = path.join(__dirname, "..", ".auth", "e2e-student.json");

/**
 * Attach listeners that collect server-side failures the test would otherwise
 * silently swallow:
 *   - Any /api/* response with status >= 500
 *   - Uncaught browser exceptions (page errors)
 *
 * Tests that legitimately expect a 5xx can splice/clear the `errors` array
 * before control returns from `use()`, since the fixture reads it afterwards.
 */
function attachServerErrorWatcher(page: Page, errors: string[]) {
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/api/")) return;
    if (res.status() < 500) return;
    let body = "";
    try { body = (await res.text()).slice(0, 300); } catch { /* body unavailable */ }
    errors.push(`[${res.status()}] ${res.request().method()} ${url}${body ? `\n    body: ${body}` : ""}`);
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
}

/**
 * Extends Playwright's base test with:
 * - Pre-authenticated page fixtures (teacherPage, studentPage)
 * - API helpers with auto-cleanup tracking
 *
 * Data Cleanup Strategy:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Level 1: Per-test cleanup (afterEach in specs)         │
 * │  → Tests delete what they create via API in afterEach   │
 * │                                                         │
 * │  Level 2: Global teardown (safety net)                  │
 * │  → Deletes all "E2E " prefixed / "@e2e.test" data      │
 * │  → Catches anything missed by crashed/failed tests      │
 * └─────────────────────────────────────────────────────────┘
 *
 * Usage in specs:
 *   test("something", async ({ teacherPage, teacherApi }) => {
 *     const res = await teacherApi.createTopic({ ... });
 *     // test runs...
 *     // cleanup in afterEach or global teardown handles deletion
 *   });
 */
type AuthFixtures = {
  teacherPage: Page;
  teacherContext: BrowserContext;
  teacherApi: ApiHelper;
  /** Server-side failures (5xx + pageerror) observed during the test via `teacherPage`. */
  teacherServerErrors: string[];
  studentPage: Page;
  studentContext: BrowserContext;
  studentApi: ApiHelper;
  /** Server-side failures (5xx + pageerror) observed during the test via `studentPage`. */
  studentServerErrors: string[];
};

export const test = base.extend<AuthFixtures>({
  teacherContext: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: TEACHER_AUTH });
    await use(ctx);
    await ctx.close();
  },
  teacherServerErrors: async ({}, use) => {
    const errors: string[] = [];
    await use(errors);
  },
  teacherPage: async ({ teacherContext, teacherServerErrors }, use, testInfo) => {
    const page = await teacherContext.newPage();
    attachServerErrorWatcher(page, teacherServerErrors);
    await use(page);
    if (teacherServerErrors.length > 0) {
      throw new Error(
        `Test "${testInfo.titlePath.slice(1).join(" › ")}" observed ` +
          `${teacherServerErrors.length} server error(s):\n` +
          teacherServerErrors.map((e) => `  ${e}`).join("\n")
      );
    }
  },
  teacherApi: async ({ teacherContext }, use) => {
    const request = teacherContext.request;
    await use(new ApiHelper(request));
  },

  studentContext: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: STUDENT_AUTH });
    await use(ctx);
    await ctx.close();
  },
  studentServerErrors: async ({}, use) => {
    const errors: string[] = [];
    await use(errors);
  },
  studentPage: async ({ studentContext, studentServerErrors }, use, testInfo) => {
    const page = await studentContext.newPage();
    attachServerErrorWatcher(page, studentServerErrors);
    await use(page);
    if (studentServerErrors.length > 0) {
      throw new Error(
        `Test "${testInfo.titlePath.slice(1).join(" › ")}" observed ` +
          `${studentServerErrors.length} server error(s):\n` +
          studentServerErrors.map((e) => `  ${e}`).join("\n")
      );
    }
  },
  studentApi: async ({ studentContext }, use) => {
    const request = studentContext.request;
    await use(new ApiHelper(request));
  },
});

export { expect } from "@playwright/test";
