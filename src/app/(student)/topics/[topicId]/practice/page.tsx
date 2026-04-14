import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PracticeSession from "@/components/student/PracticeSession";
import ExamShell from "@/components/exam/ExamShell";
import ExamEntryGate from "@/components/exam/ExamEntryGate";

export const metadata: Metadata = {
  title: "Practice Test",
  description: "Take a practice test to assess your vocabulary knowledge and language skills.",
};

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ testId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { topicId } = await params;
  const { testId } = await searchParams;

  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: session.user.id,
      class: { topicAssignments: { some: { topicId } } },
    },
  });
  if (!hasAccess) notFound();

  // Get a specific test or the first active one
  let practiceTest;
  if (testId) {
    practiceTest = await prisma.practiceTest.findUnique({
      where: { id: testId, topicId },
      include: {
        questions: { orderBy: { questionNumber: "asc" } },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    });
  } else {
    const now = new Date();
    practiceTest = await prisma.practiceTest.findFirst({
      where: {
        topicId,
        status: "ACTIVE",
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: now } },
        ],
        AND: [
          { OR: [{ availableTo: null }, { availableTo: { gte: now } }] },
        ],
      },
      include: {
        questions: { orderBy: { questionNumber: "asc" } },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  if (!practiceTest || practiceTest.questions.length === 0) notFound();

  const sections = (practiceTest as any).sections || [];
  const isTestMode = (practiceTest as any).mode !== "practice";

  // Map question fields — strip correctAnswer for test mode (security: server-side grading only)
  function mapQuestion(q: any, includeCorrectAnswer: boolean) {
    return {
      id: q.id,
      questionNumber: q.questionNumber,
      content: q.content,
      questionType: q.questionType,
      answer1: q.answer1,
      answer2: q.answer2,
      answer3: q.answer3,
      answer4: q.answer4,
      ...(includeCorrectAnswer ? { correctAnswer: q.correctAnswer } : {}),
      timer: q.timer,
      contentMediaUrl: q.contentMediaUrl,
      contentMediaType: q.contentMediaType,
      answer1MediaUrl: q.answer1MediaUrl,
      answer1MediaType: q.answer1MediaType,
      answer2MediaUrl: q.answer2MediaUrl,
      answer2MediaType: q.answer2MediaType,
      answer3MediaUrl: q.answer3MediaUrl,
      answer3MediaType: q.answer3MediaType,
      answer4MediaUrl: q.answer4MediaUrl,
      answer4MediaType: q.answer4MediaType,
      difficulty: q.difficulty,
      ...(includeCorrectAnswer ? { explanation: q.explanation } : {}),
      ...(includeCorrectAnswer ? { explanationMediaUrl: q.explanationMediaUrl } : {}),
      ...(includeCorrectAnswer ? { explanationMediaType: q.explanationMediaType } : {}),
      audioPlayLimit: q.audioPlayLimit,
      sectionId: q.sectionId,
      advancedData: q.advancedData,
    };
  }

  // ── Test mode: use ExamEntryGate → ExamShell ──
  if (isTestMode) {
    const questions = practiceTest.questions.map((q: any) => mapQuestion(q, false));
    const mappedSections = sections.map((s: any) => ({
      id: s.id,
      parentId: s.parentId,
      level: s.level,
      title: s.title,
      description: s.description,
      sortOrder: s.sortOrder,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
    }));

    // Query exam session for this user + test
    const examSession = await prisma.examSession.findFirst({
      where: { userId: session.user.id, practiceTestId: practiceTest.id },
      orderBy: { attemptNumber: "desc" },
      include: {
        practiceResult: { select: { id: true, score: true } },
      },
    });

    // Count answered from session
    let sessionAnsweredCount = 0;
    if (examSession?.answersJson) {
      const ans = examSession.answersJson as Record<string, string>;
      sessionAnsweredCount = Object.values(ans).filter(Boolean).length;
    }

    // Count root PART sections
    const partsCount = sections.filter((s: any) => s.level === "PART").length;

    // Determine retake availability
    let canRetake = false;
    let nextAttemptNumber = 1;
    if (examSession?.status === "GRADED") {
      nextAttemptNumber = examSession.attemptNumber + 1;
      canRetake = (practiceTest as any).maxAttempts === 0 ||
        nextAttemptNumber <= (practiceTest as any).maxAttempts;
    }

    return (
      <ExamEntryGate
        topicId={topicId}
        practiceTestId={practiceTest.id}
        testTitle={practiceTest.title}
        testStatus={practiceTest.status}
        questionCount={questions.length}
        totalTime={(practiceTest as any).totalTime || 2700}
        maxAttempts={(practiceTest as any).maxAttempts || 1}
        partsCount={partsCount}
        sessionStatus={examSession?.status || null}
        sessionAttemptNumber={examSession?.attemptNumber}
        sessionTimeRemaining={examSession?.timeRemaining}
        sessionAnsweredCount={sessionAnsweredCount}
        sessionLastSavedAt={examSession?.submittedAt?.toISOString() || examSession?.lastSavedAt?.toISOString() || null}
        sessionResultId={examSession?.practiceResult?.id || null}
        sessionScore={examSession?.practiceResult?.score ? Math.round(examSession.practiceResult.score) : null}
        canRetake={canRetake}
        nextAttemptNumber={nextAttemptNumber}
      >
        <ExamShell
          topicId={topicId}
          practiceTestId={practiceTest.id}
          testTitle={practiceTest.title}
          questions={questions}
          sections={mappedSections}
          totalTime={(practiceTest as any).totalTime || 2700}
          shuffleQuestions={(practiceTest as any).shuffleQuestions || false}
          shuffleAnswers={(practiceTest as any).shuffleAnswers || false}
        />
      </ExamEntryGate>
    );
  }

  // ── Practice mode: one question at a time with immediate feedback ──
  const questions = practiceTest.questions.map((q: any) => ({
    ...mapQuestion(q, true),
    correctAnswer: q.correctAnswer,
  }));
  return (
    <PracticeSession
      topicId={topicId}
      practiceTestId={practiceTest.id}
      testTitle={practiceTest.title}
      questions={questions}
      testMode="practice"
      shuffleAnswers={(practiceTest as any).shuffleAnswers || false}
      showReviewMoment={(practiceTest as any).showReviewMoment ?? true}
    />
  );
}
