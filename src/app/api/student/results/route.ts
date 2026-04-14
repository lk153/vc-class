import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await prisma.practiceResult.findMany({
    where: { userId: session.user.id },
    orderBy: { completedAt: "desc" },
    include: {
      practiceTest: {
        select: { id: true, title: true, topicId: true, topic: { select: { title: true } } },
      },
      examSession: {
        select: { id: true, status: true, attemptNumber: true, gradedAt: true },
      },
    },
  });

  return NextResponse.json(
    results.map((r) => ({
      id: r.id,
      testName: r.practiceTest.title,
      topicName: r.practiceTest.topic.title,
      score: Math.round(r.score),
      correctCount: r.correctCount,
      totalQuestions: r.totalQuestions,
      completedAt: r.completedAt,
      sessionStatus: r.examSession?.status || "GRADED",
      attemptNumber: r.examSession?.attemptNumber || 1,
      gradedAt: r.examSession?.gradedAt,
    }))
  );
}
