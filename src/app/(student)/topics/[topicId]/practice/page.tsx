import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PracticeSession from "@/components/student/PracticeSession";

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

  // Get a specific test or the first available
  let practiceTest;
  if (testId) {
    practiceTest = await prisma.practiceTest.findUnique({
      where: { id: testId, topicId },
      include: { questions: { orderBy: { questionNumber: "asc" } } },
    });
  } else {
    practiceTest = await prisma.practiceTest.findFirst({
      where: { topicId },
      include: { questions: { orderBy: { questionNumber: "asc" } } },
    });
  }

  if (!practiceTest || practiceTest.questions.length === 0) notFound();

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
  }));

  return (
    <PracticeSession
      topicId={topicId}
      practiceTestId={practiceTest.id}
      testTitle={practiceTest.title}
      questions={questions}
    />
  );
}
