-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "practice_result_id" TEXT,
ALTER COLUMN "practice_test_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_practice_result_id_fkey" FOREIGN KEY ("practice_result_id") REFERENCES "practice_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
