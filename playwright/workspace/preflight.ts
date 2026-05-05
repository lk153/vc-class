/**
 * Pre-flight guard — the last line of defence before any Playwright spec
 * mutates a database row. Aborts the entire run if the authenticated
 * context is not an E2E identity.
 *
 * Endpoint contract (implemented in `src/app/api/e2e/me/route.ts`):
 *   GET /api/e2e/me
 *   Response: { id: string; email: string; isTest: boolean; role: "STUDENT" | "TEACHER" }
 *
 * If /api/e2e/me is unreachable, `preflight` also throws — better a loud
 * abort than silently running against an unverified session.
 */

import { type APIRequestContext } from "@playwright/test";
import { isE2eEmail } from "./identity";

export type MeResponse = {
  id: string;
  email: string;
  isTest: boolean;
  role: "STUDENT" | "TEACHER";
};

export async function preflight(request: APIRequestContext, expectedRole: "TEACHER" | "STUDENT"): Promise<void> {
  const res = await request.get("/api/e2e/me", { failOnStatusCode: false });

  if (!res.ok()) {
    throw new Error(
      `Pre-flight aborted: GET /api/e2e/me returned ${res.status()}. ` +
        `The E2E workspace endpoint must be deployed before running the suite.`
    );
  }

  const me = (await res.json()) as MeResponse;

  if (!me.isTest || !isE2eEmail(me.email)) {
    throw new Error(
      `Pre-flight aborted: authenticated as a non-test user (email=${me.email}, ` +
        `isTest=${me.isTest}). Refusing to run — would mutate real data.`
    );
  }
  if (me.role !== expectedRole) {
    throw new Error(
      `Pre-flight aborted: expected role=${expectedRole}, got role=${me.role} for ${me.email}.`
    );
  }
}
