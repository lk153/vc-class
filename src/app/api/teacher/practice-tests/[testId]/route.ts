import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  const test = await prisma.practiceTest.findUnique({
    where: { id: testId, createdById: session.user.id },
    include: {
      topic: { include: { language: true } },
      questions: { orderBy: { questionNumber: "asc" } },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: test.id,
    title: test.title,
    topicTitle: test.topic.title,
    languageName: test.topic.language.name,
    questions: test.questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      content: q.content,
      questionType: q.questionType,
      answer1: q.answer1,
      answer2: q.answer2,
      answer3: q.answer3,
      answer4: q.answer4,
      correctAnswer: q.correctAnswer,
      timer: q.timer,
    })),
  });
}
