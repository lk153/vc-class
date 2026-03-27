import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { practiceId } = await params;
  const { totalQuestions, correctCount, incorrectCount, score, answers } =
    await request.json();

  const result = await prisma.practiceResult.create({
    data: {
      userId: session.user.id,
      practiceTestId: practiceId,
      totalQuestions,
      correctCount,
      incorrectCount,
      score,
      studentAnswers: {
        create: answers.map(
          (a: {
            questionId: string;
            selectedAnswer: string;
            isCorrect: boolean;
            attempts: number;
          }) => ({
            questionId: a.questionId,
            userId: session.user.id,
            selectedAnswer: a.selectedAnswer,
            isCorrect: a.isCorrect,
            attemptNumber: a.attempts,
          })
        ),
      },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
