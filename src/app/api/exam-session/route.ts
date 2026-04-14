import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { practiceTestId } = await request.json();
  if (!practiceTestId) {
    return NextResponse.json({ error: "practiceTestId required" }, { status: 400 });
  }

  // Verify test exists and is ACTIVE
  const test = await prisma.practiceTest.findUnique({
    where: { id: practiceTestId },
    select: { id: true, status: true, totalTime: true, maxAttempts: true, topicId: true },
  });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }
  if (test.status !== "ACTIVE") {
    return NextResponse.json({ error: "Test is not active" }, { status: 403 });
  }

  // Verify enrollment access
  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: session.user.id,
      class: { topicAssignments: { some: { topicId: test.topicId } } },
    },
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Find latest exam session for this user + test
  const existingSession = await prisma.examSession.findFirst({
    where: { userId: session.user.id, practiceTestId },
    orderBy: { attemptNumber: "desc" },
  });

  // If DOING session exists, return it for resume
  if (existingSession && existingSession.status === "DOING") {
    return NextResponse.json({
      sessionId: existingSession.id,
      status: existingSession.status,
      attemptNumber: existingSession.attemptNumber,
      answers: existingSession.answersJson,
      flagged: existingSession.flaggedJson,
      currentPhaseIndex: existingSession.currentPhaseIndex,
      timeRemaining: existingSession.timeRemaining,
      startedAt: existingSession.startedAt,
      lastSavedAt: existingSession.lastSavedAt,
    });
  }

  // If GRADING, return status only
  if (existingSession && existingSession.status === "GRADING") {
    return NextResponse.json({
      sessionId: existingSession.id,
      status: existingSession.status,
      attemptNumber: existingSession.attemptNumber,
      submittedAt: existingSession.submittedAt,
    });
  }

  // If GRADED, check if retake is allowed
  if (existingSession && existingSession.status === "GRADED") {
    const nextAttempt = existingSession.attemptNumber + 1;
    const canRetake = test.maxAttempts === 0 || nextAttempt <= test.maxAttempts;

    if (!canRetake) {
      return NextResponse.json({
        sessionId: existingSession.id,
        status: existingSession.status,
        attemptNumber: existingSession.attemptNumber,
        practiceResultId: existingSession.practiceResultId,
        canRetake: false,
      });
    }

    // Allow retake — will create new session below
    return NextResponse.json({
      sessionId: existingSession.id,
      status: existingSession.status,
      attemptNumber: existingSession.attemptNumber,
      practiceResultId: existingSession.practiceResultId,
      canRetake: true,
      nextAttemptNumber: nextAttempt,
    });
  }

  // No session exists — create new one
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = headerList.get("user-agent") || null;

  const newSession = await prisma.examSession.create({
    data: {
      userId: session.user.id,
      practiceTestId,
      attemptNumber: existingSession ? existingSession.attemptNumber + 1 : 1,
      timeRemaining: test.totalTime || 2700,
      ipAddress: ip,
      userAgent: ua,
    },
  });

  return NextResponse.json({
    sessionId: newSession.id,
    status: newSession.status,
    attemptNumber: newSession.attemptNumber,
    answers: newSession.answersJson,
    flagged: newSession.flaggedJson,
    currentPhaseIndex: newSession.currentPhaseIndex,
    timeRemaining: newSession.timeRemaining,
    startedAt: newSession.startedAt,
    lastSavedAt: newSession.lastSavedAt,
  }, { status: 201 });
}

// Start a retake (creates new session for next attempt)
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { practiceTestId, attemptNumber } = await request.json();

  const test = await prisma.practiceTest.findUnique({
    where: { id: practiceTestId },
    select: { id: true, status: true, totalTime: true, maxAttempts: true, topicId: true },
  });
  if (!test || test.status !== "ACTIVE") {
    return NextResponse.json({ error: "Test not available" }, { status: 403 });
  }

  if (test.maxAttempts !== 0 && attemptNumber > test.maxAttempts) {
    return NextResponse.json({ error: "Max attempts reached" }, { status: 403 });
  }

  // Verify enrollment access
  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: session.user.id,
      class: { topicAssignments: { some: { topicId: test.topicId } } },
    },
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = headerList.get("user-agent") || null;

  const newSession = await prisma.examSession.create({
    data: {
      userId: session.user.id,
      practiceTestId,
      attemptNumber,
      timeRemaining: test.totalTime || 2700,
      ipAddress: ip,
      userAgent: ua,
    },
  });

  return NextResponse.json({
    sessionId: newSession.id,
    status: newSession.status,
    attemptNumber: newSession.attemptNumber,
    answers: newSession.answersJson,
    flagged: newSession.flaggedJson,
    currentPhaseIndex: newSession.currentPhaseIndex,
    timeRemaining: newSession.timeRemaining,
    startedAt: newSession.startedAt,
    lastSavedAt: newSession.lastSavedAt,
  }, { status: 201 });
}
