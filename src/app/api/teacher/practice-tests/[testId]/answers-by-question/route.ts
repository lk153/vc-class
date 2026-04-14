import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;
  const { searchParams } = new URL(request.url);
  const questionNumber = parseInt(searchParams.get("questionNumber") || "1");

  // Verify teacher owns this test
  const test = await prisma.practiceTest.findUnique({
    where: { id: testId },
    select: { id: true, createdById: true, title: true },
  });

  if (!test || test.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get the question
  const question = await prisma.question.findFirst({
    where: { practiceTestId: testId, questionNumber },
    select: {
      id: true,
      questionNumber: true,
      content: true,
      questionType: true,
      correctAnswer: true,
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Get total question count for navigation
  const totalQuestions = await prisma.question.count({
    where: { practiceTestId: testId },
  });

  // Get all student answers for this question (across all submissions)
  const answers = await prisma.studentAnswer.findMany({
    where: { questionId: question.id },
    include: {
      user: { select: { id: true, name: true } },
      practiceResult: {
        select: {
          id: true,
          examSession: { select: { id: true, status: true, attemptNumber: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json({
    question: {
      id: question.id,
      questionNumber: question.questionNumber,
      content: question.content,
      questionType: question.questionType,
      correctAnswer: question.correctAnswer,
    },
    totalQuestions,
    testTitle: test.title,
    submissions: answers.map((a) => ({
      studentAnswerId: a.id,
      studentName: a.user.name,
      studentId: a.user.id,
      selectedAnswer: a.selectedAnswer,
      isCorrect: a.isCorrect,
      teacherOverride: a.teacherOverride,
      teacherScore: a.teacherScore,
      teacherComment: a.teacherComment,
      sessionId: a.practiceResult.examSession?.id || null,
      sessionStatus: a.practiceResult.examSession?.status || null,
      attemptNumber: a.practiceResult.examSession?.attemptNumber || 1,
    })),
  });
}
