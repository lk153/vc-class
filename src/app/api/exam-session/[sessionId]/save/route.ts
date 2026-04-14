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
  const { answers, flagged, timeRemaining, currentPhaseIndex, tabSwitchCount } =
    await request.json();

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
  const clientTimeDelta = examSession.timeRemaining - timeRemaining;
  // If client claims more time remaining than server allows (clock manipulation),
  // use server-calculated time instead but still save
  let adjustedTimeRemaining = timeRemaining;
  if (clientTimeDelta < 0 && serverElapsed > 2) {
    // Client rewound the clock — cap at server-calculated remaining
    adjustedTimeRemaining = Math.max(0, examSession.timeRemaining - serverElapsed);
  }

  const now = new Date();

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      answersJson: answers ?? examSession.answersJson,
      flaggedJson: flagged ?? examSession.flaggedJson,
      timeRemaining: adjustedTimeRemaining,
      currentPhaseIndex: currentPhaseIndex ?? examSession.currentPhaseIndex,
      tabSwitchCount: tabSwitchCount ?? examSession.tabSwitchCount,
      lastSavedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    lastSavedAt: updated.lastSavedAt,
    timeRemaining: updated.timeRemaining,
  });
}
