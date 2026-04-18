import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = (process.env.DATABASE_URL || "")
  .replace(/[?&]sslmode=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const adapter = new PrismaPg({ connectionString, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true } });
  console.log("=== USERS ===");
  for (const u of users) console.log(u.id, u.email, u.role, u.status, u.name);

  const langs = await prisma.language.findMany({ select: { id: true, name: true, code: true } });
  console.log("\n=== LANGUAGES ===");
  for (const l of langs) console.log(l.id, l.name, l.code);

  const classes = await prisma.class.findMany({
    include: { enrollments: { select: { userId: true } }, topicAssignments: { select: { topicId: true, id: true } } },
  });
  console.log("\n=== CLASSES ===");
  for (const c of classes) {
    console.log(c.id, c.name, "status:", c.status, "teacher:", c.teacherId);
    console.log("  enrollments:", c.enrollments.map(e => e.userId));
    console.log("  topicAssignments:", c.topicAssignments.map(a => `${a.topicId} (${a.id})`));
  }

  const topics = await prisma.topic.findMany({ select: { id: true, title: true, languageId: true, createdById: true } });
  console.log("\n=== TOPICS ===");
  for (const t of topics) console.log(t.id, `"${t.title}"`, "lang:", t.languageId, "by:", t.createdById);

  const tests = await prisma.practiceTest.findMany({
    select: { id: true, title: true, topicId: true, status: true, mode: true },
    include: { _count: { select: { questions: true } } },
  });
  console.log("\n=== PRACTICE TESTS ===");
  for (const t of tests) console.log(t.id, `"${t.title}"`, "topic:", t.topicId, "status:", t.status, "mode:", t.mode || "practice", "q:", t._count.questions);

  const sessions = await prisma.examSession.findMany({ select: { id: true, userId: true, practiceTestId: true, status: true, attemptNumber: true } });
  console.log("\n=== EXAM SESSIONS ===");
  for (const s of sessions) console.log(s.id, "user:", s.userId, "test:", s.practiceTestId, s.status, "attempt:", s.attemptNumber);

  const results = await prisma.practiceResult.findMany({ select: { id: true, userId: true, practiceTestId: true, score: true, correctCount: true, totalQuestions: true } });
  console.log("\n=== PRACTICE RESULTS ===");
  for (const r of results) console.log(r.id, "user:", r.userId, "test:", r.practiceTestId, "score:", r.score, `${r.correctCount}/${r.totalQuestions}`);

  const media = await prisma.media.findMany({ select: { id: true, fileName: true, fileType: true } });
  console.log("\n=== MEDIA ===");
  for (const m of media) console.log(m.id, m.fileName, m.fileType);

  await prisma.$disconnect();
}
main();
