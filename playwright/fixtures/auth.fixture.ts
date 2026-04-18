import { test as base, type Page, type BrowserContext, type APIRequestContext } from "@playwright/test";
import path from "path";
import { ApiHelper } from "../helpers/api.helper";

const TEACHER_AUTH = path.join(__dirname, "..", ".auth", "teacher.json");
const STUDENT_AUTH = path.join(__dirname, "..", ".auth", "student.json");

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
  studentPage: Page;
  studentContext: BrowserContext;
  studentApi: ApiHelper;
};

export const test = base.extend<AuthFixtures>({
  teacherContext: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: TEACHER_AUTH });
    await use(ctx);
    await ctx.close();
  },
  teacherPage: async ({ teacherContext }, use) => {
    const page = await teacherContext.newPage();
    await use(page);
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
  studentPage: async ({ studentContext }, use) => {
    const page = await studentContext.newPage();
    await use(page);
  },
  studentApi: async ({ studentContext }, use) => {
    const request = studentContext.request;
    await use(new ApiHelper(request));
  },
});

export { expect } from "@playwright/test";
