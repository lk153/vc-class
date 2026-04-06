-- AlterTable
ALTER TABLE "practice_tests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vocabularies" ADD COLUMN     "pronunciation" TEXT,
ADD COLUMN     "type" TEXT;
