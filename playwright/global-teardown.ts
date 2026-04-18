import { test as teardown } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * Global teardown — runs ONCE after all test projects complete.
 *
 * Cleans up:
 * 1. E2E test data from the database (users registered during tests)
 * 2. Auth state files
 *
 * This ensures the DB is identical before and after the test run.
 * Tests that create data mid-run are responsible for their own cleanup
 * via the `cleanupApi` fixture. This teardown is a safety net for
 * anything that slipped through (e.g., test crashed before cleanup).
 */

const AUTH_DIR = path.join(__dirname, ".auth");

teardown("cleanup e2e test data from database", async ({ request }) => {
  // Delete any users created by E2E tests (emails ending with @e2e.test)
  try {
    const res = await request.delete("/api/e2e/cleanup", {
      data: { secret: process.env.E2E_CLEANUP_SECRET || "e2e-cleanup-key" },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      console.log("✓ E2E test data cleaned from database");
    } else {
      console.log(`⚠ Cleanup API returned ${res.status()} — manual cleanup may be needed`);
    }
  } catch {
    console.log("⚠ Cleanup API not available — skipping DB cleanup");
  }
});

teardown("remove auth state files", async () => {
  if (fs.existsSync(AUTH_DIR)) {
    for (const file of fs.readdirSync(AUTH_DIR)) {
      fs.unlinkSync(path.join(AUTH_DIR, file));
    }
    console.log("✓ Auth state files removed");
  }
});
