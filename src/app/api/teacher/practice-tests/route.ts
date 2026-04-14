import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    id,
    title,
    status,
    mode,
    shuffleAnswers,
    shuffleQuestions,
    showReviewMoment,
    totalTime,
    maxAttempts,
    availableFrom,
    availableTo,
  } = await request.json();

  if (!id || !title?.trim()) {
    return NextResponse.json({ error: "ID and title are required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.practiceTest.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { title: title.trim() };
  if (status !== undefined) data.status = status;
  if (mode !== undefined) data.mode = mode;
  if (shuffleAnswers !== undefined) data.shuffleAnswers = shuffleAnswers;
  if (shuffleQuestions !== undefined) data.shuffleQuestions = shuffleQuestions;
  if (showReviewMoment !== undefined) data.showReviewMoment = showReviewMoment;
  if (totalTime !== undefined) data.totalTime = totalTime;
  if (maxAttempts !== undefined) data.maxAttempts = maxAttempts;
  if (availableFrom !== undefined) data.availableFrom = availableFrom ? new Date(availableFrom) : null;
  if (availableTo !== undefined) data.availableTo = availableTo ? new Date(availableTo) : null;

  const test = await prisma.practiceTest.update({
    where: { id },
    data,
  });

  // If status changed to ACTIVE, notify enrolled students
  if (status === "ACTIVE" && existing.status !== "ACTIVE") {
    const topicAssignments = await prisma.topicAssignment.findMany({
      where: { topicId: existing.topicId },
      include: { class: { include: { enrollments: { select: { userId: true } } } } },
    });
    const studentIds = new Set<string>();
    for (const ta of topicAssignments) {
      for (const enrollment of ta.class.enrollments) {
        studentIds.add(enrollment.userId);
      }
    }
    if (studentIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(studentIds).map((userId) => ({
          userId,
          type: "TEST_ACTIVATED" as const,
          referenceId: id,
        })),
      });
    }
  }

  return NextResponse.json(test);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.practiceTest.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascade delete: questions, sections, results, student answers all cascade via schema
  await prisma.practiceTest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
