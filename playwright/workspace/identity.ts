/**
 * E2E identity — the two dedicated Users that own every row created by the
 * Playwright suite. Real users (createdById / teacherId / userId != these IDs)
 * never see E2E data because the app's existing owner filters exclude it.
 *
 * These IDs MUST match the upserts in `prisma/seed.e2e.ts` exactly.
 * Do NOT fall back to env vars — a misconfigured env pointing at a real user
 * would cause the suite to mutate production data.
 */

export const E2E_TEACHER = {
  id: "e2e-teacher-fixed-0000000001",
  email: "e2e-teacher@e2e.test",
  password: "e2e-teacher-pass",
  name: "E2E Teacher",
} as const;

export const E2E_STUDENT = {
  id: "e2e-student-fixed-0000000001",
  email: "e2e-student@e2e.test",
  password: "e2e-student-pass",
  name: "E2E Student",
} as const;

export const E2E_EMAIL_DOMAIN = "@e2e.test";

export function isE2eEmail(email: string | undefined | null): boolean {
  return !!email && email.endsWith(E2E_EMAIL_DOMAIN);
}
