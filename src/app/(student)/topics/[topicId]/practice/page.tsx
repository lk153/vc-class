import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PracticeSession from "@/components/student/PracticeSession";
import ExamSession from "@/components/student/ExamSession";

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

  // Get a specific test or the first published one
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
        status: "published",
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

  const questions = practiceTest.questions.map((q: any) => ({
    id: q.id,
    questionNumber: q.questionNumber,
    content: q.content,
    questionType: q.questionType,
    answer1: q.answer1,
    answer2: q.answer2,
    answer3: q.answer3,
    answer4: q.answer4,
    correctAnswer: q.correctAnswer,
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
    explanation: q.explanation,
    explanationMediaUrl: q.explanationMediaUrl,
    explanationMediaType: q.explanationMediaType,
    audioPlayLimit: q.audioPlayLimit,
    sectionId: q.sectionId,
    advancedData: q.advancedData,
  }));

  // Exam mode: test has sections
  if (sections.length > 0) {
    return (
      <ExamSession
        topicId={topicId}
        practiceTestId={practiceTest.id}
        testTitle={practiceTest.title}
        questions={questions}
        sections={sections.map((s: any) => ({
          id: s.id,
          parentId: s.parentId,
          level: s.level,
          title: s.title,
          description: s.description,
          sortOrder: s.sortOrder,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
        }))}
      />
    );
  }

  // Classic mode: one question at a time
  return (
    <PracticeSession
      topicId={topicId}
      practiceTestId={practiceTest.id}
      testTitle={practiceTest.title}
      questions={questions}
      testMode={(practiceTest as any).mode || "test"}
      shuffleAnswers={(practiceTest as any).shuffleAnswers || false}
      showReviewMoment={(practiceTest as any).showReviewMoment ?? true}
    />
  );
}
