/**
 * Shared grading utility — used server-side to grade student answers.
 * IMPORTANT: This runs on the server only. The client never receives correctAnswer.
 */

type GradableQuestion = {
  questionType: string;
  correctAnswer: string;
  advancedData: string | null;
};

/**
 * Determines if a student's answer is correct for a given question.
 * Handles all 10 question types including complex types with advancedData.
 */
export function isQuestionCorrect(
  question: GradableQuestion,
  selectedAnswer: string
): boolean {
  if (!selectedAnswer) return false;

  const { questionType, correctAnswer, advancedData } = question;

  // WORD_BANK: student fills blanks from a word bank
  if (questionType === "WORD_BANK" && advancedData) {
    try {
      const adv = JSON.parse(advancedData);
      const filled: Record<string, string> = JSON.parse(selectedAnswer);
      return adv.sentences.every(
        (s: { answer: string }, i: number) =>
          (filled[i] || "").toLowerCase().trim() ===
          s.answer.toLowerCase().trim()
      );
    } catch {
      return false;
    }
  }

  // MATCHING: student pairs items from two columns
  if (questionType === "MATCHING" && advancedData) {
    try {
      const adv = JSON.parse(advancedData);
      const pairs: number[][] = JSON.parse(selectedAnswer);
      return (
        JSON.stringify(pairs.sort()) ===
        JSON.stringify(adv.correctPairs.sort())
      );
    } catch {
      return false;
    }
  }

  // REORDER_WORDS: student arranges words in correct order
  if (questionType === "REORDER_WORDS" && advancedData) {
    try {
      const adv = JSON.parse(advancedData);
      return selectedAnswer === adv.correctOrder.join(",");
    } catch {
      return false;
    }
  }

  // CUE_WRITING: open-ended, requires teacher grading — auto-grade as incorrect
  if (questionType === "CUE_WRITING") {
    return false;
  }

  // Default: exact match (MCQ, TRUE_FALSE, GAP_FILL, PRONUNCIATION, STRESS, CLOZE_PASSAGE)
  return (
    selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
  );
}

/**
 * Checks if a question type requires manual teacher grading.
 */
export function requiresManualGrading(questionType: string): boolean {
  return questionType === "CUE_WRITING";
}
