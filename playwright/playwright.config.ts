import { defineConfig, devices } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:18888";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: (() => {
    const v = process.env.PW_WORKERS;
    if (!v) return "50%";
    // Accept "50%" style percentages, else coerce to int
    return v.endsWith("%") ? v : Number(v) || 1;
  })(),
  reporter: process.env.CI
    ? [["html", { outputFolder: "./report" }], ["github"]]
    : [["html", { outputFolder: "./report", open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
  },

  timeout: 30_000,
  expect: { timeout: 5_000 },

  /* Start Next.js dev server automatically */
  webServer: {
    command: "npm run dev",
    port: 18888,
    cwd: path.resolve(__dirname, ".."),
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    /* ── Setup: generate auth storageState ── */
    {
      name: "setup",
      testDir: ".",
      testMatch: "global-setup.ts",
    },

    /* ── Desktop Chromium (primary) ──
       Exam lifecycle/integrity specs share one student + one exam attempt,
       so they run in a separate serial project below instead of here. */
    {
      name: "chromium",
      testIgnore: /student\/exam-(lifecycle|integrity)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },

    /* ── Student exam flow — serial (shared attempt state) ── */
    {
      name: "chromium-exam",
      testMatch: /student\/exam-(lifecycle|integrity)\.spec\.ts/,
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },

    /* ── Desktop Firefox ── */
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },

    /* ── Mobile Chrome ── */
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },

    /* ── Mobile Safari ── */
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
      dependencies: ["setup"],
    },

    /* ── Teardown: cleanup test data after all projects ── */
    {
      name: "teardown",
      testDir: ".",
      testMatch: "global-teardown.ts",
      dependencies: ["chromium", "chromium-exam", "firefox", "mobile-chrome", "mobile-safari"],
    },
  ],
});
