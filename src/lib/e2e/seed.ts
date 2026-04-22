import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { E2E_STUDENT, E2E_TEACHER } from "./identity";
import {
  E2E_CLASS_ID,
  E2E_LANGUAGE_CODE,
  E2E_TEST_IDS,
  E2E_TOPIC_IDS,
} from "./fixtures";

/**
 * Upsert the baseline E2E fixture graph. Idempotent — running it repeatedly
 * converges on the same state regardless of what was there before.
 *
 * Shape (matches the contract in playwright-right-way.md Phase 2):
 *   - 1 Class (E2E teacher owns, E2E student enrolled)
 *   - 2 Topics, 5 Vocabulary rows each, both assigned to the class
 *   - 1 PracticeTest in "test" mode (5 questions), status=ACTIVE
 *   - 1 PracticeTest in "practice" mode (3 questions), status=ACTIVE
 */
export async function seedE2eWorkspace(prisma: PrismaClient) {
  const teacherHash = await bcrypt.hash(E2E_TEACHER.password, 10);
  const studentHash = await bcrypt.hash(E2E_STUDENT.password, 10);

  const language = await prisma.language.upsert({
    where: { code: E2E_LANGUAGE_CODE },
    update: {},
    create: { code: E2E_LANGUAGE_CODE, name: "English" },
  });

  const teacher = await prisma.user.upsert({
    where: { id: E2E_TEACHER.id },
    update: { passwordHash: teacherHash, isTest: true, status: "ACTIVE" },
    create: {
      id: E2E_TEACHER.id,
      email: E2E_TEACHER.email,
      name: E2E_TEACHER.name,
      passwordHash: teacherHash,
      role: "TEACHER",
      status: "ACTIVE",
      isTest: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { id: E2E_STUDENT.id },
    update: { passwordHash: studentHash, isTest: true, status: "ACTIVE" },
    create: {
      id: E2E_STUDENT.id,
      email: E2E_STUDENT.email,
      name: E2E_STUDENT.name,
      passwordHash: studentHash,
      role: "STUDENT",
      status: "ACTIVE",
      isTest: true,
      learnLanguageId: language.id,
    },
  });

  const klass = await prisma.class.upsert({
    where: { id: E2E_CLASS_ID },
    update: {},
    create: {
      id: E2E_CLASS_ID,
      name: "E2E Class",
      languageId: language.id,
      level: "B1",
      schedule: JSON.stringify([{ day: "Monday", startTime: "18:00", endTime: "19:00" }]),
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      teacherId: teacher.id,
      maxStudents: 10,
      status: "ACTIVE",
    },
  });

  await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId: klass.id, userId: student.id } },
    update: {},
    create: { classId: klass.id, userId: student.id },
  });

  const topics = [
    {
      id: E2E_TOPIC_IDS.primary,
      title: "E2E Topic Primary",
      vocab: [
        { word: "alpha", meaning: "the first letter" },
        { word: "beta", meaning: "the second letter" },
        { word: "gamma", meaning: "the third letter" },
        { word: "delta", meaning: "change" },
        { word: "epsilon", meaning: "a small quantity" },
      ],
    },
    {
      id: E2E_TOPIC_IDS.secondary,
      title: "E2E Topic Secondary",
      vocab: [
        { word: "zeta", meaning: "the sixth letter" },
        { word: "eta", meaning: "the seventh letter" },
        { word: "theta", meaning: "the eighth letter" },
        { word: "iota", meaning: "a tiny amount" },
        { word: "kappa", meaning: "the tenth letter" },
      ],
    },
  ];

  for (const t of topics) {
    await prisma.topic.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: "E2E fixture topic",
        languageId: language.id,
        createdById: teacher.id,
      },
    });
    await prisma.topicAssignment.upsert({
      where: { classId_topicId: { classId: klass.id, topicId: t.id } },
      update: {},
      create: { classId: klass.id, topicId: t.id },
    });
    for (let i = 0; i < t.vocab.length; i++) {
      const v = t.vocab[i];
      await prisma.vocabulary.upsert({
        where: { id: `${t.id}-vocab-${i}` },
        update: {},
        create: {
          id: `${t.id}-vocab-${i}`,
          word: v.word,
          meaning: v.meaning,
          topicId: t.id,
          sortOrder: i,
        },
      });
    }
  }

  const testModeTest = await prisma.practiceTest.upsert({
    where: { id: E2E_TEST_IDS.testMode },
    update: {},
    create: {
      id: E2E_TEST_IDS.testMode,
      title: "E2E Test (test mode)",
      topicId: E2E_TOPIC_IDS.primary,
      createdById: teacher.id,
      status: "ACTIVE",
      mode: "test",
      totalTime: 600,
      shuffleAnswers: false,
      shuffleQuestions: false,
      showReviewMoment: true,
    },
  });

  const practiceModeTest = await prisma.practiceTest.upsert({
    where: { id: E2E_TEST_IDS.practiceMode },
    update: {},
    create: {
      id: E2E_TEST_IDS.practiceMode,
      title: "E2E Test (practice mode)",
      topicId: E2E_TOPIC_IDS.secondary,
      createdById: teacher.id,
      status: "ACTIVE",
      mode: "practice",
      totalTime: 600,
    },
  });

  const testModeQuestions = [
    { num: 1, content: "alpha is the ___ letter", answer1: "first", correct: "first", type: "GAP_FILL" as const },
    { num: 2, content: "beta is the second letter", answer1: "True", answer2: "False", correct: "True", type: "TRUE_FALSE" as const },
    { num: 3, content: "What is gamma?", answer1: "first", answer2: "second", answer3: "third", answer4: "fourth", correct: "third", type: "MULTIPLE_CHOICE" as const },
    { num: 4, content: "delta means", answer1: "change", answer2: "constant", answer3: "error", answer4: "sum", correct: "change", type: "MULTIPLE_CHOICE" as const },
    { num: 5, content: "epsilon is a ___ quantity", answer1: "small", correct: "small", type: "GAP_FILL" as const },
  ];
  for (const q of testModeQuestions) {
    await prisma.question.upsert({
      where: { id: `${testModeTest.id}-q${q.num}` },
      update: {},
      create: {
        id: `${testModeTest.id}-q${q.num}`,
        practiceTestId: testModeTest.id,
        questionNumber: q.num,
        content: q.content,
        questionType: q.type,
        answer1: q.answer1,
        answer2: q.answer2 ?? null,
        answer3: q.answer3 ?? null,
        answer4: q.answer4 ?? null,
        correctAnswer: q.correct,
        timer: 30,
      },
    });
  }

  const practiceModeQuestions = [
    { num: 1, content: "zeta is the ___ letter", answer1: "sixth", correct: "sixth", type: "GAP_FILL" as const },
    { num: 2, content: "eta is a Greek letter", answer1: "True", answer2: "False", correct: "True", type: "TRUE_FALSE" as const },
    { num: 3, content: "What is theta?", answer1: "sixth", answer2: "seventh", answer3: "eighth", answer4: "ninth", correct: "eighth", type: "MULTIPLE_CHOICE" as const },
  ];
  for (const q of practiceModeQuestions) {
    await prisma.question.upsert({
      where: { id: `${practiceModeTest.id}-q${q.num}` },
      update: {},
      create: {
        id: `${practiceModeTest.id}-q${q.num}`,
        practiceTestId: practiceModeTest.id,
        questionNumber: q.num,
        content: q.content,
        questionType: q.type,
        answer1: q.answer1,
        answer2: q.answer2 ?? null,
        answer3: q.answer3 ?? null,
        answer4: q.answer4 ?? null,
        correctAnswer: q.correct,
        timer: 30,
      },
    });
  }

  // ── Completed attempts on the practice-mode test ─────────────────────────
  // These give the student/teacher results pages real rows to render.
  // We avoid seeding results on the test-mode test because exam-lifecycle
  // specs need a fresh attempt there (default maxAttempts=1).
  const practiceResultsSeed = [
    {
      resultId: `${practiceModeTest.id}-result-1`,
      sessionId: `${practiceModeTest.id}-session-1`,
      attempt: 1,
      score: 100,
      correct: 3,
      incorrect: 0,
      date: new Date("2026-04-10T10:00:00Z"),
      answers: practiceModeQuestions.map((q) => ({ qId: `${practiceModeTest.id}-q${q.num}`, answer: q.correct, isCorrect: true })),
    },
    {
      resultId: `${practiceModeTest.id}-result-2`,
      sessionId: `${practiceModeTest.id}-session-2`,
      attempt: 2,
      score: 33.33,
      correct: 1,
      incorrect: 2,
      date: new Date("2026-04-12T10:00:00Z"),
      answers: practiceModeQuestions.map((q, i) => ({ qId: `${practiceModeTest.id}-q${q.num}`, answer: q.correct, isCorrect: i === 0 })),
    },
  ];

  for (const r of practiceResultsSeed) {
    await prisma.practiceResult.upsert({
      where: { id: r.resultId },
      update: {},
      create: {
        id: r.resultId,
        userId: student.id,
        practiceTestId: practiceModeTest.id,
        totalQuestions: practiceModeQuestions.length,
        correctCount: r.correct,
        incorrectCount: r.incorrect,
        score: r.score,
        completedAt: r.date,
      },
    });
    await prisma.examSession.upsert({
      where: { id: r.sessionId },
      update: {},
      create: {
        id: r.sessionId,
        userId: student.id,
        practiceTestId: practiceModeTest.id,
        status: "GRADED",
        attemptNumber: r.attempt,
        timeRemaining: 0,
        startedAt: r.date,
        submittedAt: r.date,
        gradedAt: r.date,
        practiceResultId: r.resultId,
      },
    });
    for (let i = 0; i < r.answers.length; i++) {
      const a = r.answers[i];
      await prisma.studentAnswer.upsert({
        where: { id: `${r.resultId}-answer-${i}` },
        update: {},
        create: {
          id: `${r.resultId}-answer-${i}`,
          practiceResultId: r.resultId,
          questionId: a.qId,
          userId: student.id,
          selectedAnswer: a.answer,
          isCorrect: a.isCorrect,
          attemptNumber: r.attempt,
          answeredAt: r.date,
        },
      });
    }
  }

  return {
    teacherId: teacher.id,
    studentId: student.id,
    classId: klass.id,
    topicIds: [E2E_TOPIC_IDS.primary, E2E_TOPIC_IDS.secondary],
    testIds: [E2E_TEST_IDS.testMode, E2E_TEST_IDS.practiceMode],
    resultIds: practiceResultsSeed.map((r) => r.resultId),
  };
}
