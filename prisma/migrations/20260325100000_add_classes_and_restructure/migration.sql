-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('SCHEDULING', 'ACTIVE', 'ENDED', 'ARCHIVED');

-- CreateTable: classes
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "max_students" INTEGER NOT NULL DEFAULT 10,
    "special_notes" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'SCHEDULING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: class_enrollments
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_class_id_user_id_key" ON "class_enrollments"("class_id", "user_id");

-- AddForeignKey: classes.language_id -> languages.id
ALTER TABLE "classes" ADD CONSTRAINT "classes_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: classes.teacher_id -> users.id
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: class_enrollments.class_id -> classes.id
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: class_enrollments.user_id -> users.id
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restructure topic_assignments: replace user_id with class_id
-- First, drop existing data and constraints
DELETE FROM "topic_assignments";
ALTER TABLE "topic_assignments" DROP CONSTRAINT IF EXISTS "topic_assignments_user_id_fkey";
DROP INDEX IF EXISTS "topic_assignments_user_id_topic_id_key";
ALTER TABLE "topic_assignments" DROP COLUMN "user_id";

-- Add class_id column
ALTER TABLE "topic_assignments" ADD COLUMN "class_id" TEXT NOT NULL;

-- Add unique constraint and foreign key
CREATE UNIQUE INDEX "topic_assignments_class_id_topic_id_key" ON "topic_assignments"("class_id", "topic_id");
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove teacher_id from users
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_teacher_id_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_id";
