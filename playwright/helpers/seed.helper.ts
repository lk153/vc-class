/**
 * Test data factory — generates unique names and structures for test isolation.
 *
 * CONVENTION: All E2E-created data uses the "E2E " prefix in names/titles
 * and "@e2e.test" suffix in emails. Cleanup is primarily driven by the
 * ownership-isolated workspace (owner-id chain → isTest=true User), but the
 * prefix remains a belt-and-suspenders sentinel and a readable signal when
 * eyeballing the DB.
 *
 * The prefix is NOT overridable — callers pass a descriptor/suffix only, so
 * no spec can accidentally produce a row that lacks the "E2E " marker.
 */

/** Prefix for all E2E test data — hardcoded, not overridable */
export const E2E_PREFIX = "E2E";

const ts = () => Date.now().toString(36);

export function uniqueEmail(suffix = "test") {
  return `${suffix}-${ts()}@e2e.test`;
}

/**
 * Build a unique, E2E-prefixed name.
 *
 * @param suffix optional descriptor inserted between the prefix and the
 *               timestamp (e.g. uniqueName("Topic") → "E2E Topic lq3k4…").
 *               Never replaces the prefix.
 */
export function uniqueName(suffix = "") {
  return `${E2E_PREFIX} ${suffix} ${ts()}`.replace(/\s+/g, " ").trim();
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
