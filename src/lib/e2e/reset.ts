import type { PrismaClient } from "@prisma/client";

/**
 * Delete every row whose ownership chain reaches an `isTest=true` User.
 *
 * Order is leaf → root to respect FK constraints (none of the User→owner
 * relations use `onDelete: Cascade` — that is intentional to protect real
 * data from accidental cascades if a User is ever deleted by mistake).
 *
 * Runs inside a single `$transaction`: any step failing rolls the whole
 * delete back. After the delete completes, the caller typically calls
 * `seedE2eWorkspace` to re-upsert the baseline fixture graph.
 *
 * Safety properties:
 *   - Targeted row sets are derived by filtering on isTest=true User IDs,
 *     so no path can touch a real-user row.
 *   - Empty testUserIds set → no-op returning zero counts.
 */
export async function resetE2eWorkspace(prisma: PrismaClient) {
  const testUsers = await prisma.user.findMany({
    where: { isTest: true },
    select: { id: true },
  });
  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length === 0) {
    return { deleted: {} as Record<string, number>, skipped: true as const };
  }

  const [e2eTopics, e2eTests, e2eClasses] = await Promise.all([
    prisma.topic.findMany({
      where: { createdById: { in: testUserIds } },
      select: { id: true },
    }),
    prisma.practiceTest.findMany({
      where: { createdById: { in: testUserIds } },
      select: { id: true },
    }),
    prisma.class.findMany({
      where: { teacherId: { in: testUserIds } },
      select: { id: true },
    }),
  ]);

  const topicIds = e2eTopics.map((t) => t.id);
  const testIds = e2eTests.map((t) => t.id);
  const classIds = e2eClasses.map((c) => c.id);

  const deleted = await prisma.$transaction(async (tx) => {
    const r: Record<string, number> = {};

    // ── Layer 1: exam + comment leaves ──
    r.studentAnswers = (
      await tx.studentAnswer.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            testIds.length ? { question: { practiceTestId: { in: testIds } } } : undefined,
          ].filter(Boolean) as object[],
        },
      })
    ).count;
    r.comments = (
      await tx.comment.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            { practiceResult: { userId: { in: testUserIds } } },
          ],
        },
      })
    ).count;
    r.examSessions = (
      await tx.examSession.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            testIds.length ? { practiceTestId: { in: testIds } } : undefined,
          ].filter(Boolean) as object[],
        },
      })
    ).count;
    r.practiceResults = (
      await tx.practiceResult.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            testIds.length ? { practiceTestId: { in: testIds } } : undefined,
          ].filter(Boolean) as object[],
        },
      })
    ).count;

    // ── Layer 2: question + section → practice test ──
    if (testIds.length) {
      r.questions = (await tx.question.deleteMany({ where: { practiceTestId: { in: testIds } } })).count;
      r.testSections = (await tx.testSection.deleteMany({ where: { practiceTestId: { in: testIds } } })).count;
      r.practiceTests = (await tx.practiceTest.deleteMany({ where: { id: { in: testIds } } })).count;
    } else {
      r.questions = 0;
      r.testSections = 0;
      r.practiceTests = 0;
    }

    // ── Layer 3: flashcards + bookmarks → vocabulary → topic ──
    r.flashcardProgress = (
      await tx.flashcardProgress.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            topicIds.length ? { vocabulary: { topicId: { in: topicIds } } } : undefined,
          ].filter(Boolean) as object[],
        },
      })
    ).count;
    r.questionBookmarks = (
      await tx.questionBookmark.deleteMany({ where: { userId: { in: testUserIds } } })
    ).count;
    if (topicIds.length) {
      r.vocabularies = (await tx.vocabulary.deleteMany({ where: { topicId: { in: topicIds } } })).count;
      r.topics = (await tx.topic.deleteMany({ where: { id: { in: topicIds } } })).count;
    } else {
      r.vocabularies = 0;
      r.topics = 0;
    }

    // ── Layer 4: topic assignment + enrollment → class ──
    if (classIds.length) {
      r.topicAssignments = (await tx.topicAssignment.deleteMany({ where: { classId: { in: classIds } } })).count;
      r.classEnrollments = (
        await tx.classEnrollment.deleteMany({
          where: {
            OR: [{ userId: { in: testUserIds } }, { classId: { in: classIds } }],
          },
        })
      ).count;
      r.classes = (await tx.class.deleteMany({ where: { id: { in: classIds } } })).count;
    } else {
      r.topicAssignments = 0;
      r.classEnrollments = (
        await tx.classEnrollment.deleteMany({ where: { userId: { in: testUserIds } } })
      ).count;
      r.classes = 0;
    }

    // ── Layer 5: media + notifications ──
    r.media = (await tx.media.deleteMany({ where: { uploadedById: { in: testUserIds } } })).count;
    r.notifications = (await tx.notification.deleteMany({ where: { userId: { in: testUserIds } } })).count;

    // ── Layer 6: users ──
    r.users = (await tx.user.deleteMany({ where: { id: { in: testUserIds }, isTest: true } })).count;

    return r;
  });

  return { deleted, skipped: false as const };
}
