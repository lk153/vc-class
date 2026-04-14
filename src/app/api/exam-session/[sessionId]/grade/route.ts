import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requiresManualGrading } from "@/lib/grading";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const { grades, markAsGraded } = await request.json();

  // Load session with answers and question types
  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      practiceResult: {
        include: {
          studentAnswers: {
            include: { question: { select: { questionType: true } } },
          },
        },
      },
      practiceTest: {
        select: { topicId: true },
      },
    },
  });

  if (!examSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (examSession.status !== "GRADING" && examSession.status !== "GRADED") {
    return NextResponse.json({ error: "Session not submitted yet" }, { status: 403 });
  }

  if (!examSession.practiceResult) {
    return NextResponse.json({ error: "No result found for this session" }, { status: 404 });
  }

  // Verify teacher has access to THIS student (not just the topic)
  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: examSession.userId,
      class: {
        teacherId: session.user.id,
        topicAssignments: { some: { topicId: examSession.practiceTest.topicId } },
      },
    },
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  // Build a set of valid answer IDs for this session's result
  const validAnswerIds = new Set(
    examSession.practiceResult?.studentAnswers.map((a) => a.id) || []
  );

  // Apply per-question grades with validation
  const now = new Date();
  if (grades && Array.isArray(grades)) {
    for (const grade of grades) {
      const { studentAnswerId, teacherOverride, teacherScore, teacherComment } = grade;

      // Validate the answer belongs to this session's result
      if (!validAnswerIds.has(studentAnswerId)) {
        return NextResponse.json(
          { error: `Invalid studentAnswerId: ${studentAnswerId}` },
          { status: 400 }
        );
      }

      await prisma.studentAnswer.update({
        where: { id: studentAnswerId },
        data: {
          teacherOverride: teacherOverride ?? undefined,
          teacherScore: teacherScore ?? undefined,
          teacherComment: teacherComment ?? undefined,
          teacherGradedAt: now,
          ...(teacherOverride !== undefined ? { isCorrect: teacherOverride } : {}),
        },
      });
    }
  }

  // Check if we should mark as graded
  let shouldMarkGraded = markAsGraded;
  if (!shouldMarkGraded && examSession.practiceResult) {
    // Auto-detect: check if all MANUAL questions have been reviewed
    const freshAnswers = await prisma.studentAnswer.findMany({
      where: { practiceResultId: examSession.practiceResult.id },
      include: { question: { select: { questionType: true } } },
    });
    shouldMarkGraded = freshAnswers.every((a) => {
      if (requiresManualGrading(a.question.questionType)) {
        return a.teacherOverride !== null;
      }
      return true; // Auto-graded questions are always "done"
    });
  }

  if (shouldMarkGraded && examSession.practiceResult) {
    // Recalculate score
    const allAnswers = await prisma.studentAnswer.findMany({
      where: { practiceResultId: examSession.practiceResult.id },
    });

    const correctCount = allAnswers.filter((a) => {
      if (a.teacherOverride !== null) return a.teacherOverride;
      if (a.teacherScore !== null) return a.teacherScore >= 0.5;
      return a.isCorrect;
    }).length;

    const totalQuestions = allAnswers.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    await prisma.practiceResult.update({
      where: { id: examSession.practiceResult.id },
      data: { correctCount, incorrectCount: totalQuestions - correctCount, score },
    });

    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "GRADED", gradedAt: now },
    });

    // Notify student that grading is complete
    await prisma.notification.create({
      data: {
        userId: examSession.userId,
        type: "EXAM_GRADED",
        referenceId: sessionId,
      },
    });
  }

  return NextResponse.json({ success: true, status: shouldMarkGraded ? "GRADED" : examSession.status });
}
