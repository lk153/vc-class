import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetE2eWorkspace } from "@/lib/e2e/reset";
import { seedE2eWorkspace } from "@/lib/e2e/seed";

/**
 * Delete every row whose owner chain reaches an `isTest=true` User, then
 * re-upsert the baseline fixture graph. Both steps happen in sequence; the
 * delete half runs inside a single Prisma transaction so a failure rolls
 * back cleanly.
 *
 * Guarded by three independent locks:
 *   1. process.env.E2E_ALLOW === "yes" — prod MUST NOT set this
 *   2. NODE_ENV !== "production" — defence in depth
 *   3. x-e2e-secret header matches E2E_CLEANUP_SECRET
 *
 * No session check: the caller (Playwright teardown) uses its own storage-
 * state but the endpoint doesn't need it — the secret header is enough.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.E2E_ALLOW !== "yes") {
    return NextResponse.json({ error: "E2E endpoints disabled" }, { status: 403 });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const expectedSecret = process.env.E2E_CLEANUP_SECRET || "e2e-cleanup-key";
  const providedSecret = req.headers.get("x-e2e-secret");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const { deleted, skipped } = await resetE2eWorkspace(prisma);
    const reseeded = await seedE2eWorkspace(prisma);
    return NextResponse.json({
      ok: true,
      deleted,
      skipped,
      reseeded: true,
      fixtures: reseeded,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("E2E workspace reset failed:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
