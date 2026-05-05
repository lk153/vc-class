/**
 * Fixed IDs for the baseline E2E fixture graph. Mirrored by
 * [playwright/workspace/fixtures.ts] so specs reference the same rows.
 */

import { E2E_STUDENT, E2E_TEACHER } from "./identity";

export const E2E_CLASS_ID = "e2e-class-fixed-00000000001";

export const E2E_TOPIC_IDS = {
  primary: "e2e-topic-primary-0000000001",
  secondary: "e2e-topic-secondary-000000001",
} as const;

export const E2E_TEST_IDS = {
  /** 5-question test in "test" mode — drives exam lifecycle specs */
  testMode: "e2e-test-testmode-0000000001",
  /** 3-question test in "practice" mode — drives practice session specs */
  practiceMode: "e2e-test-practice-0000000001",
} as const;

export const E2E_LANGUAGE_CODE = "en";

export const E2E_OWNER_IDS = [E2E_TEACHER.id, E2E_STUDENT.id] as const;
