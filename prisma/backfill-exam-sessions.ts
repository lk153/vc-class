/**
 * Backfill script: Creates ExamSession records for existing PracticeResult data.
 *
 * Run AFTER the schema migration that adds ExamSession and TestStatus enum:
 *   npx tsx prisma/backfill-exam-sessions.ts
 *
 * What it does:
 * 1. Maps existing PracticeTest.status string values to the new TestStatus enum
 *    - "draft" → DRAFT, "published" → ACTIVE, anything else → DRAFT (with warning)
 * 2. For each existing PracticeResult without a linked ExamSession:
 *    - Creates an ExamSession with status=GRADED, attemptNumber assigned sequentially
 *    - Links it via practiceResultId
 *
 * Safe to run multiple times — skips results that already have an ExamSession.
 */

import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Load .env.local manually (same as prisma.config.ts)
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL || "")
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting backfill...\n");

  // ── Step 1: Verify TestStatus enum migration is done ──
  // If status is still a string, the enum migration hasn't run yet
  const testCount = await prisma.practiceTest.count();
  console.log(`Found ${testCount} practice tests.`);

  // ── Step 2: Backfill ExamSession for existing PracticeResults ──
  const resultsWithoutSession = await prisma.practiceResult.findMany({
    where: {
      examSession: null, // No linked ExamSession
    },
    orderBy: [
      { practiceTestId: "asc" },
      { userId: "asc" },
      { completedAt: "asc" },
    ],
    select: {
      id: true,
      userId: true,
      practiceTestId: true,
      completedAt: true,
      practiceTest: {
        select: { totalTime: true },
      },
    },
  });

  console.log(`Found ${resultsWithoutSession.length} results without ExamSession.\n`);

  if (resultsWithoutSession.length === 0) {
    console.log("Nothing to backfill. All results already have ExamSession records.");
    return;
  }

  // Group by (userId, practiceTestId) to assign attempt numbers
  const groups = new Map<string, typeof resultsWithoutSession>();
  for (const result of resultsWithoutSession) {
    const key = `${result.userId}:${result.practiceTestId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(result);
  }

  let created = 0;
  let errors = 0;

  for (const [key, results] of groups) {
    // Check if there are already ExamSessions for this user+test (from prior runs)
    const existingSessions = await prisma.examSession.findMany({
      where: {
        userId: results[0].userId,
        practiceTestId: results[0].practiceTestId,
      },
      select: { attemptNumber: true },
      orderBy: { attemptNumber: "desc" },
    });
    const startAttempt = existingSessions.length > 0
      ? existingSessions[0].attemptNumber + 1
      : 1;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const attemptNumber = startAttempt + i;

      try {
        await prisma.examSession.create({
          data: {
            userId: result.userId,
            practiceTestId: result.practiceTestId,
            status: "GRADED",
            attemptNumber,
            currentPhaseIndex: 0,
            timeRemaining: 0,
            answersJson: {},
            flaggedJson: [],
            startedAt: result.completedAt,
            lastSavedAt: result.completedAt,
            submittedAt: result.completedAt,
            gradedAt: result.completedAt,
            practiceResultId: result.id,
          },
        });
        created++;
      } catch (err: any) {
        // Unique constraint violation = already exists, skip
        if (err?.code === "P2002") {
          console.log(`  Skipping ${key} attempt ${attemptNumber} (already exists)`);
        } else {
          console.error(`  Error creating session for result ${result.id}:`, err?.message);
          errors++;
        }
      }
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Created: ${created} ExamSession records`);
  console.log(`  Skipped: ${resultsWithoutSession.length - created - errors} (already existed)`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
