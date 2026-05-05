import { test as setup } from "@playwright/test";
import path from "path";
import { E2E_STUDENT, E2E_TEACHER } from "./workspace/identity";
import { preflight } from "./workspace/preflight";

/**
 * Global setup — runs ONCE before any test project.
 *
 * For each E2E user: login → preflight → persist storage state.
 * Preflight runs on the same authenticated context so we never persist
 * cookies for a session the guard would reject. The whole suite aborts
 * before any dependent project runs if preflight fails.
 *
 * Note: enrollment + topic assignment are NOT done here. The E2E seed
 * (`prisma/seed.e2e.ts`, run by `make e2e-seed`) guarantees the fixture
 * graph exists before this file runs.
 */

const TEACHER_AUTH = path.join(__dirname, ".auth", "e2e-teacher.json");
const STUDENT_AUTH = path.join(__dirname, ".auth", "e2e-student.json");

setup("authenticate e2e teacher + preflight", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(E2E_TEACHER.email);
  await page.getByLabel(/password/i).fill(E2E_TEACHER.password);
  await page.getByRole("button", { name: /login|sign in/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15_000 });
  await preflight(page.request, "TEACHER");
  await page.context().storageState({ path: TEACHER_AUTH });
});

setup("authenticate e2e student + preflight", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(E2E_STUDENT.email);
  await page.getByLabel(/password/i).fill(E2E_STUDENT.password);
  await page.getByRole("button", { name: /login|sign in/i }).click();
  await page.waitForURL(/\/topics/, { timeout: 15_000 });
  await preflight(page.request, "STUDENT");
  await page.context().storageState({ path: STUDENT_AUTH });
});
