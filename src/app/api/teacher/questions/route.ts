import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, content, answer1, answer2, answer3, answer4, correctAnswer, timer } =
    await request.json();

  // Verify ownership via practice test
  const question = await prisma.question.findUnique({
    where: { id },
    include: { practiceTest: { select: { createdById: true } } },
  });
  if (!question || question.practiceTest.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      content,
      answer1,
      answer2,
      answer3,
      answer4,
      correctAnswer,
      timer: timer || 30,
    },
  });

  return NextResponse.json(updated);
}
