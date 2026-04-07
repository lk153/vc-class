-- Migrate all YES_NO questions to TRUE_FALSE (change answer text from Yes/No to True/False)
UPDATE "questions" SET
  "question_type" = 'TRUE_FALSE',
  "answer_1" = 'True',
  "answer_2" = 'False',
  "correct_answer" = CASE
    WHEN "correct_answer" = 'Yes' THEN 'True'
    WHEN "correct_answer" = 'No' THEN 'False'
    ELSE "correct_answer"
  END
WHERE "question_type" = 'YES_NO';

-- Remove YES_NO from enum (PostgreSQL requires recreating the enum)
ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'GAP_FILL', 'REORDER_WORDS', 'CUE_WRITING', 'PRONUNCIATION', 'STRESS', 'CLOZE_PASSAGE', 'TRUE_FALSE', 'MATCHING');
ALTER TABLE "questions" ALTER COLUMN "question_type" TYPE "QuestionType" USING "question_type"::text::"QuestionType";
DROP TYPE "QuestionType_old";
