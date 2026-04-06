import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, title, questions, status, mode, shuffleAnswers, showReviewMoment } = await request.json();

  if (!topicId || !title || !questions?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const practiceTest = await prisma.practiceTest.create({
    data: {
      title,
      topicId,
      createdById: session.user.id,
      status: status || "draft",
      mode,
      shuffleAnswers,
      showReviewMoment,
      questions: {
        create: questions.map(
          (q: {
            questionNumber: number;
            content: string;
            questionType: string;
            answer1: string;
            answer2: string | null;
            answer3: string | null;
            answer4: string | null;
            correctAnswer: string;
            timer: number;
            contentMediaUrl?: string | null;
            contentMediaType?: string | null;
            answer1MediaUrl?: string | null;
            answer1MediaType?: string | null;
            answer2MediaUrl?: string | null;
            answer2MediaType?: string | null;
            answer3MediaUrl?: string | null;
            answer3MediaType?: string | null;
            answer4MediaUrl?: string | null;
            answer4MediaType?: string | null;
            difficulty?: number;
            explanation?: string | null;
            explanationMediaUrl?: string | null;
            explanationMediaType?: string | null;
            audioPlayLimit?: number | null;
          }) => ({
            questionNumber: q.questionNumber,
            content: q.content,
            questionType: q.questionType as "YES_NO" | "MULTIPLE_CHOICE" | "GAP_FILL",
            answer1: q.answer1,
            answer2: q.answer2,
            answer3: q.answer3,
            answer4: q.answer4,
            correctAnswer: q.correctAnswer,
            timer: q.timer || 30,
            contentMediaUrl: q.contentMediaUrl,
            contentMediaType: q.contentMediaType,
            answer1MediaUrl: q.answer1MediaUrl,
            answer1MediaType: q.answer1MediaType,
            answer2MediaUrl: q.answer2MediaUrl,
            answer2MediaType: q.answer2MediaType,
            answer3MediaUrl: q.answer3MediaUrl,
            answer3MediaType: q.answer3MediaType,
            answer4MediaUrl: q.answer4MediaUrl,
            answer4MediaType: q.answer4MediaType,
            difficulty: q.difficulty ?? 1,
            explanation: q.explanation,
            explanationMediaUrl: q.explanationMediaUrl,
            explanationMediaType: q.explanationMediaType,
            audioPlayLimit: q.audioPlayLimit,
          })
        ),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(practiceTest, { status: 201 });
}
