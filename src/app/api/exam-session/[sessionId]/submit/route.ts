import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isQuestionCorrect, requiresManualGrading } from "@/lib/grading";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  // Load session with validation
  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      practiceTest: {
        include: {
          questions: true,
        },
      },
    },
  });

  if (!examSession || examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (examSession.status !== "DOING") {
    // If already submitted, return the existing result (idempotent response)
    if (examSession.practiceResultId) {
      const existingResult = await prisma.practiceResult.findUnique({
        where: { id: examSession.practiceResultId },
        select: { id: true, score: true, correctCount: true, totalQuestions: true },
      });
      if (existingResult) {
        return NextResponse.json({
          status: examSession.status,
          score: Math.round(existingResult.score),
          resultId: existingResult.id,
          correctCount: existingResult.correctCount,
          totalQuestions: existingResult.totalQuestions,
        });
      }
    }
    return NextResponse.json({ error: "Session already submitted" }, { status: 403 });
  }

  // Atomic claim: set status to GRADING to prevent race conditions
  // If another request already claimed it, updateMany returns count=0
  const claimed = await prisma.examSession.updateMany({
    where: { id: sessionId, status: "DOING" },
    data: { status: "GRADING" },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Session already submitted" }, { status: 409 });
  }

  const questions = examSession.practiceTest.questions;
  const answers = (examSession.answersJson as Record<string, string>) || {};

  // Grade each answer server-side
  let correctCount = 0;
  let needsManualGrading = false;

  const answerRecords = questions.map((q) => {
    const selectedAnswer = answers[q.id] || "";
    const isManual = requiresManualGrading(q.questionType);

    if (isManual) {
      needsManualGrading = true;
    }

    const isCorrect = isManual ? false : isQuestionCorrect(q, selectedAnswer);
    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      userId: session.user.id,
      selectedAnswer,
      isCorrect,
      attemptNumber: 1,
      timeSpent: null as number | null,
    };
  });

  const totalQuestions = questions.length;
  const incorrectCount = totalQuestions - correctCount;
  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  // Create PracticeResult + StudentAnswer records, then update session.
  // If result creation fails, rollback the session status to DOING.
  let result;
  try {
    result = await prisma.practiceResult.create({
      data: {
        userId: session.user.id,
        practiceTestId: examSession.practiceTestId,
        totalQuestions,
        correctCount,
        incorrectCount,
        score,
        studentAnswers: {
          create: answerRecords,
        },
      },
    });
  } catch (err) {
    // Rollback: restore session to DOING so student can retry
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "DOING" },
    });
    return NextResponse.json({ error: "Failed to save results. Please try again." }, { status: 500 });
  }

  // Determine final status
  const finalStatus = needsManualGrading ? "GRADING" : "GRADED";
  const now = new Date();

  // Update session with result link
  await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: finalStatus as any,
      submittedAt: now,
      ...(finalStatus === "GRADED" ? { gradedAt: now } : {}),
      practiceResultId: result.id,
      answersJson: answers,
    },
  });

  // Create notification for teacher (non-critical — don't fail submission if this errors)
  try {
    const topicAssignment = await prisma.topicAssignment.findFirst({
      where: { topicId: examSession.practiceTest.topicId },
      include: { class: { select: { teacherId: true } } },
    });
    if (topicAssignment) {
      await prisma.notification.create({
        data: {
          userId: topicAssignment.class.teacherId,
          type: "EXAM_SUBMITTED",
          referenceId: sessionId,
        },
      });
    }
  } catch { /* notification failure is non-critical */ }

  return NextResponse.json({
    status: finalStatus,
    score: Math.round(score),
    resultId: result.id,
    correctCount,
    totalQuestions,
  });
}
