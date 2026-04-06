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
    status: test.status,
    mode: test.mode,
    shuffleAnswers: test.shuffleAnswers,
    showReviewMoment: test.showReviewMoment,
    availableFrom: test.availableFrom,
    availableTo: test.availableTo,
    questions: test.questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      content: q.content,
      contentMediaUrl: q.contentMediaUrl,
      contentMediaType: q.contentMediaType,
      questionType: q.questionType,
      answer1: q.answer1,
      answer1MediaUrl: q.answer1MediaUrl,
      answer1MediaType: q.answer1MediaType,
      answer2: q.answer2,
      answer2MediaUrl: q.answer2MediaUrl,
      answer2MediaType: q.answer2MediaType,
      answer3: q.answer3,
      answer3MediaUrl: q.answer3MediaUrl,
      answer3MediaType: q.answer3MediaType,
      answer4: q.answer4,
      answer4MediaUrl: q.answer4MediaUrl,
      answer4MediaType: q.answer4MediaType,
      correctAnswer: q.correctAnswer,
      timer: q.timer,
      difficulty: q.difficulty,
      explanation: q.explanation,
      explanationMediaUrl: q.explanationMediaUrl,
      explanationMediaType: q.explanationMediaType,
      audioPlayLimit: q.audioPlayLimit,
    })),
  });
}
