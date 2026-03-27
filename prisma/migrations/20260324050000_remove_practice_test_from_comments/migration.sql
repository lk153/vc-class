-- Delete comments that have no practice_result_id (old practice test comments)
DELETE FROM "comments" WHERE "practice_result_id" IS NULL;

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_practice_test_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "comments_practice_test_id_idx";

-- AlterTable: make practice_result_id required and drop practice_test_id
ALTER TABLE "comments" ALTER COLUMN "practice_result_id" SET NOT NULL;
ALTER TABLE "comments" DROP COLUMN "practice_test_id";
