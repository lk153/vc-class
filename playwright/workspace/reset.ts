/**
 * Thin client for the server-side workspace reset endpoint.
 *
 * Endpoint contract (implemented in `src/app/api/e2e/workspace/reset/route.ts`):
 *   POST /api/e2e/workspace/reset
 *   Headers: x-e2e-secret: <E2E_CLEANUP_SECRET>
 *   Behaviour:
 *     1. Refuse unless process.env.E2E_ALLOW === "yes"
 *     2. Inside a single prisma.$transaction, delete children → parents in the
 *        documented order, scoped to rows whose owner chain reaches a User
 *        with isTest=true. Hard-guard: if any targeted row's owner chain
 *        contains isTest=false, throw and rollback.
 *     3. Re-seed baseline fixtures (idempotent upserts with the fixed IDs
 *        from workspace/fixtures.ts).
 *   Response: { ok: true, deleted: Record<string, number>, reseeded: true }
 */

import { type APIRequestContext } from "@playwright/test";

const SECRET = process.env.E2E_CLEANUP_SECRET || "e2e-cleanup-key";

export type ResetResponse = {
  ok: boolean;
  deleted?: Record<string, number>;
  reseeded?: boolean;
  error?: string;
};

export async function resetWorkspace(request: APIRequestContext): Promise<ResetResponse> {
  const res = await request.post("/api/e2e/workspace/reset", {
    headers: { "x-e2e-secret": SECRET },
    failOnStatusCode: false,
  });

  if (!res.ok()) {
    return { ok: false, error: `status ${res.status()}: ${await res.text()}` };
  }
  return (await res.json()) as ResetResponse;
}
