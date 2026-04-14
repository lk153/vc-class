import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resultId } = await params;

  const result = await prisma.practiceResult.findUnique({
    where: { id: resultId, userId: session.user.id },
    include: {
      practiceTest: {
        select: { id: true, title: true, topic: { select: { title: true } } },
      },
      studentAnswers: {
        include: {
          question: {
            select: {
              id: true,
              questionNumber: true,
              content: true,
              questionType: true,
              correctAnswer: true,
              explanation: true,
              difficulty: true,
              contentMediaUrl: true,
              contentMediaType: true,
            },
          },
        },
        orderBy: { question: { questionNumber: "asc" } },
      },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      examSession: {
        select: { id: true, status: true, attemptNumber: true, gradedAt: true },
      },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  const isGraded = result.examSession?.status === "GRADED";

  return NextResponse.json({
    id: result.id,
    testName: result.practiceTest.title,
    topicName: result.practiceTest.topic.title,
    score: Math.round(result.score),
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    completedAt: result.completedAt,
    sessionStatus: result.examSession?.status || "GRADED",
    attemptNumber: result.examSession?.attemptNumber || 1,
    gradedAt: result.examSession?.gradedAt,
    answers: result.studentAnswers.map((sa) => ({
      id: sa.id,
      questionNumber: sa.question.questionNumber,
      content: sa.question.content,
      questionType: sa.question.questionType,
      contentMediaUrl: sa.question.contentMediaUrl,
      contentMediaType: sa.question.contentMediaType,
      difficulty: sa.question.difficulty,
      selectedAnswer: sa.selectedAnswer,
      isCorrect: sa.isCorrect,
      // Only reveal correct answer and explanation if graded
      ...(isGraded
        ? {
            correctAnswer: sa.question.correctAnswer,
            explanation: sa.question.explanation,
          }
        : {}),
      // Teacher feedback
      teacherOverride: sa.teacherOverride,
      teacherScore: sa.teacherScore,
      teacherComment: sa.teacherComment,
    })),
    comments: result.comments.map((c) => ({
      id: c.id,
      content: c.content,
      userName: c.user.name,
      createdAt: c.createdAt,
    })),
  });
}
