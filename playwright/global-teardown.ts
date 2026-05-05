import { test as teardown } from "@playwright/test";
import path from "path";
import fs from "fs";
import { resetWorkspace } from "./workspace/reset";

/**
 * Global teardown — runs ONCE after all test projects complete.
 *
 * Delete-and-reseed in one shot:
 *   1. POST /api/e2e/workspace/reset — ordered delete (leaf → root) of every
 *      row whose owner chain reaches an isTest=true User, then re-upsert the
 *      baseline fixture graph.
 *   2. Remove the storage-state files so the next run forces re-authentication
 *      (prevents stale cookies from surviving a credentials rotation).
 *
 * Tests that create data mid-run do NOT need per-test cleanup — the reset
 * endpoint reclaims all E2E-owned rows. afterEach helpers are still useful
 * for keeping a single test's state tidy, but are no longer load-bearing.
 */

const AUTH_DIR = path.join(__dirname, ".auth");

teardown("reset e2e workspace (delete + reseed)", async ({ request }) => {
  const result = await resetWorkspace(request);

  if (!result.ok) {
    console.log(`⚠ Workspace reset failed: ${result.error ?? "unknown error"}`);
    console.log("  Manual cleanup may be needed; next run's reset will reclaim any leftovers.");
    return;
  }

  const deletedSummary = result.deleted
    ? Object.entries(result.deleted)
        .filter(([, n]) => n > 0)
        .map(([table, n]) => `${table}=${n}`)
        .join(" ")
    : "(no counts returned)";
  console.log(`✓ Workspace reset OK — deleted: ${deletedSummary}; reseeded=${result.reseeded ?? false}`);
});

teardown("remove auth storage-state files", async () => {
  if (!fs.existsSync(AUTH_DIR)) return;
  for (const file of fs.readdirSync(AUTH_DIR)) {
    fs.unlinkSync(path.join(AUTH_DIR, file));
  }
  console.log("✓ Auth storage-state files removed");
});
