import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await request.json();

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const original = await prisma.practiceTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { questionNumber: "asc" } } },
  });

  if (!original) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (original.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newTest = await prisma.practiceTest.create({
    data: {
      title: `${original.title} (Copy)`,
      topicId: original.topicId,
      createdById: session.user.id,
      status: "draft",
      mode: original.mode,
      shuffleAnswers: original.shuffleAnswers,
      showReviewMoment: original.showReviewMoment,
      questions: {
        create: original.questions.map((q) => ({
          questionNumber: q.questionNumber,
          content: q.content,
          questionType: q.questionType,
          contentMediaUrl: q.contentMediaUrl,
          contentMediaType: q.contentMediaType,
          answer1: q.answer1,
          answer2: q.answer2,
          answer3: q.answer3,
          answer4: q.answer4,
          answer1MediaUrl: q.answer1MediaUrl,
          answer1MediaType: q.answer1MediaType,
          answer2MediaUrl: q.answer2MediaUrl,
          answer2MediaType: q.answer2MediaType,
          answer3MediaUrl: q.answer3MediaUrl,
          answer3MediaType: q.answer3MediaType,
          answer4MediaUrl: q.answer4MediaUrl,
          answer4MediaType: q.answer4MediaType,
          difficulty: q.difficulty,
          explanation: q.explanation,
          explanationMediaUrl: q.explanationMediaUrl,
          explanationMediaType: q.explanationMediaType,
          audioPlayLimit: q.audioPlayLimit,
          correctAnswer: q.correctAnswer,
          timer: q.timer,
        })),
      },
    },
  });

  return NextResponse.json({ id: newTest.id, title: newTest.title }, { status: 201 });
}
