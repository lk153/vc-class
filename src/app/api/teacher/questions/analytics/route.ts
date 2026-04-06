import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const test = await prisma.practiceTest.findUnique({
    where: { id: testId },
    select: { createdById: true },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (test.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all questions for this test
  const questions = await prisma.question.findMany({
    where: { practiceTestId: testId },
    select: { id: true },
  });

  const questionIds = questions.map((q) => q.id);

  // Get all student answers for these questions
  const answers = await prisma.studentAnswer.findMany({
    where: { questionId: { in: questionIds } },
    select: {
      questionId: true,
      isCorrect: true,
      timeSpent: true,
      selectedAnswer: true,
    },
  });

  // Group by questionId and compute analytics
  const grouped = new Map<
    string,
    { correct: number; total: number; timeSpents: number[]; wrongAnswers: string[] }
  >();

  for (const a of answers) {
    let entry = grouped.get(a.questionId);
    if (!entry) {
      entry = { correct: 0, total: 0, timeSpents: [], wrongAnswers: [] };
      grouped.set(a.questionId, entry);
    }
    entry.total++;
    if (a.isCorrect) {
      entry.correct++;
    } else {
      entry.wrongAnswers.push(a.selectedAnswer);
    }
    if (a.timeSpent != null) {
      entry.timeSpents.push(a.timeSpent);
    }
  }

  const analytics = questionIds.map((questionId) => {
    const entry = grouped.get(questionId);
    if (!entry || entry.total === 0) {
      return {
        questionId,
        successRate: 0,
        avgTimeSpent: 0,
        commonWrongAnswer: null,
        totalAttempts: 0,
      };
    }

    // Find most frequent wrong answer
    const wrongFreq = new Map<string, number>();
    for (const wa of entry.wrongAnswers) {
      wrongFreq.set(wa, (wrongFreq.get(wa) || 0) + 1);
    }
    let commonWrongAnswer: string | null = null;
    let maxCount = 0;
    for (const [answer, count] of wrongFreq) {
      if (count > maxCount) {
        maxCount = count;
        commonWrongAnswer = answer;
      }
    }

    const avgTimeSpent =
      entry.timeSpents.length > 0
        ? Math.round(
            entry.timeSpents.reduce((sum, t) => sum + t, 0) / entry.timeSpents.length
          )
        : 0;

    return {
      questionId,
      successRate: Math.round((entry.correct / entry.total) * 100) / 100,
      avgTimeSpent,
      commonWrongAnswer,
      totalAttempts: entry.total,
    };
  });

  return NextResponse.json(analytics);
}
