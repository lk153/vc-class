-- AlterTable: practice_tests — add config fields + updated_at with default for existing rows
ALTER TABLE "practice_tests"
ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "available_to" TIMESTAMP(3),
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'test',
ADD COLUMN     "show_review_moment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shuffle_answers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: set existing tests to "published" so they remain visible to students
UPDATE "practice_tests" SET "status" = 'published' WHERE "status" = 'draft';

-- AlterTable: questions — add media + enhancement fields
ALTER TABLE "questions"
ADD COLUMN     "answer_1_media_type" TEXT,
ADD COLUMN     "answer_1_media_url" TEXT,
ADD COLUMN     "answer_2_media_type" TEXT,
ADD COLUMN     "answer_2_media_url" TEXT,
ADD COLUMN     "answer_3_media_type" TEXT,
ADD COLUMN     "answer_3_media_url" TEXT,
ADD COLUMN     "answer_4_media_type" TEXT,
ADD COLUMN     "answer_4_media_url" TEXT,
ADD COLUMN     "audio_play_limit" INTEGER,
ADD COLUMN     "content_media_type" TEXT,
ADD COLUMN     "content_media_url" TEXT,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "explanation_media_type" TEXT,
ADD COLUMN     "explanation_media_url" TEXT;

-- AlterTable: student_answers — add time_spent
ALTER TABLE "student_answers" ADD COLUMN     "time_spent" INTEGER;

-- CreateTable: question_bookmarks
CREATE TABLE "question_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_bookmarks_user_id_question_id_key" ON "question_bookmarks"("user_id", "question_id");

ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
