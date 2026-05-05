/**
 * E2E identity — shared constants between the seed script, the reset API
 * endpoint, and the Playwright suite (via [playwright/workspace/identity.ts]).
 *
 * These IDs are the ownership anchor for the entire E2E fixture graph:
 * every row created by the test suite has its owner chain (createdById /
 * teacherId / userId / uploadedById) reach one of these two users.
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
