import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resultId } = await params;

  const result = await prisma.practiceResult.findUnique({
    where: { id: resultId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      practiceTest: {
        include: {
          topic: { include: { language: true } },
          questions: { orderBy: { questionNumber: "asc" } },
        },
      },
      studentAnswers: {
        include: { question: true },
        orderBy: { question: { questionNumber: "asc" } },
      },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the student belongs to this teacher's classes
  const enrollment = await prisma.classEnrollment.findFirst({
    where: {
      userId: result.user.id,
      class: { teacherId: session.user.id },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: result.id,
    score: result.score,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    completedAt: result.completedAt.toISOString(),
    student: {
      name: result.user.name,
      email: result.user.email,
    },
    testName: result.practiceTest.title,
    topicName: result.practiceTest.topic.title,
    language: result.practiceTest.topic.language.name,
    answers: result.studentAnswers.map((sa) => ({
      id: sa.id,
      questionNumber: sa.question.questionNumber,
      content: sa.question.content,
      selectedAnswer: sa.selectedAnswer,
      correctAnswer: sa.question.correctAnswer,
      isCorrect: sa.isCorrect,
    })),
    comments: result.comments.map((c) => ({
      id: c.id,
      content: c.content,
      userName: c.user.name,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
