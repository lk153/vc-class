import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  let body: {
    answers?: Record<string, string>;
    flagged?: string[];
    timeRemaining?: number;
    currentPhaseIndex?: number;
    tabSwitchCount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid or empty body" }, { status: 400 });
  }
  const { answers, flagged, timeRemaining, currentPhaseIndex, tabSwitchCount } = body;

  // Verify session belongs to user and is DOING
  const examSession = await prisma.examSession.findUnique({
    where: { id: sessionId },
  });

  if (!examSession || examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (examSession.status !== "DOING") {
    return NextResponse.json({ error: "Session is not active" }, { status: 403 });
  }

  // Time anomaly detection: compare server elapsed vs client reported time delta
  const serverElapsed = Math.floor(
    (Date.now() - examSession.lastSavedAt.getTime()) / 1000
  );
  let adjustedTimeRemaining = timeRemaining ?? examSession.timeRemaining;
  if (timeRemaining !== undefined) {
    const clientTimeDelta = examSession.timeRemaining - timeRemaining;
    // Client rewound clock — cap at server-calculated remaining
    if (clientTimeDelta < 0 && serverElapsed > 2) {
      adjustedTimeRemaining = Math.max(0, examSession.timeRemaining - serverElapsed);
    }
  }

  const now = new Date();

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      ...(answers !== undefined && { answersJson: answers }),
      ...(flagged !== undefined && { flaggedJson: flagged }),
      timeRemaining: adjustedTimeRemaining,
      ...(currentPhaseIndex !== undefined && { currentPhaseIndex }),
      ...(tabSwitchCount !== undefined && { tabSwitchCount }),
      lastSavedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    lastSavedAt: updated.lastSavedAt,
    timeRemaining: updated.timeRemaining,
  });
}
