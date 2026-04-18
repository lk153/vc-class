/**
 * Test data factory — generates unique names and structures for test isolation.
 *
 * CONVENTION: All E2E-created data uses the "E2E " prefix in names/titles
 * and "@e2e.test" suffix in emails. The cleanup API + global teardown
 * deletes everything matching these patterns after the test run.
 *
 * This guarantees the DB is identical before and after running tests.
 */

/** Prefix for all E2E test data — used by cleanup API to find and delete */
export const E2E_PREFIX = "E2E";

const ts = () => Date.now().toString(36);

export function uniqueEmail(prefix = "test") {
  return `${prefix}-${ts()}@e2e.test`;
}

export function uniqueName(prefix = E2E_PREFIX) {
  return `${prefix} ${ts()}`;
}

/** Minimal CSV content for practice test import */
export function sampleTestCsv(questionCount = 3): string {
  const header = "question_number,content,question_type,answer_1,answer_2,answer_3,answer_4,correct_answer,timer";
  const rows = Array.from({ length: questionCount }, (_, i) => {
    const n = i + 1;
    return `${n},"${E2E_PREFIX} question ${n}?",MULTIPLE_CHOICE,"Option A","Option B","Option C","Option D",answer_1,30`;
  });
  return [header, ...rows].join("\n");
}

/** Minimal CSV content for vocabulary import */
export function sampleVocabCsv(wordCount = 5): string {
  const header = "word,type,pronunciation,meaning,example,sort_order";
  const rows = Array.from({ length: wordCount }, (_, i) => {
    const n = i + 1;
    return `"${E2E_PREFIX}_word${n}","noun","/wɜːrd/","meaning ${n}","Example sentence ${n}.",${n}`;
  });
  return [header, ...rows].join("\n");
}
