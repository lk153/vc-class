-- CreateEnum
CREATE TYPE "SectionLevel" AS ENUM ('PART', 'GROUP', 'EXERCISE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'REORDER_WORDS';
ALTER TYPE "QuestionType" ADD VALUE 'CUE_WRITING';
ALTER TYPE "QuestionType" ADD VALUE 'PRONUNCIATION';
ALTER TYPE "QuestionType" ADD VALUE 'STRESS';
ALTER TYPE "QuestionType" ADD VALUE 'CLOZE_PASSAGE';
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "advanced_data" TEXT,
ADD COLUMN     "parent_question_id" TEXT,
ADD COLUMN     "section_id" TEXT;

-- CreateTable
CREATE TABLE "test_sections" (
    "id" TEXT NOT NULL,
    "practice_test_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" "SectionLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "media_url" TEXT,
    "media_type" TEXT,

    CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_practice_test_id_fkey" FOREIGN KEY ("practice_test_id") REFERENCES "practice_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "test_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "test_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_parent_question_id_fkey" FOREIGN KEY ("parent_question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
