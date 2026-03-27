import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, title, questions } = await request.json();

  if (!topicId || !title || !questions?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const practiceTest = await prisma.practiceTest.create({
    data: {
      title,
      topicId,
      createdById: session.user.id,
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
          })
        ),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(practiceTest, { status: 201 });
}
