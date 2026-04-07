import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    id,
    content,
    answer1,
    answer2,
    answer3,
    answer4,
    correctAnswer,
    timer,
    contentMediaUrl,
    contentMediaType,
    answer1MediaUrl,
    answer1MediaType,
    answer2MediaUrl,
    answer2MediaType,
    answer3MediaUrl,
    answer3MediaType,
    answer4MediaUrl,
    answer4MediaType,
    difficulty,
    explanation,
    explanationMediaUrl,
    explanationMediaType,
    audioPlayLimit,
    sectionId,
    advancedData,
  } = await request.json();

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
      contentMediaUrl: contentMediaUrl ?? undefined,
      contentMediaType: contentMediaType ?? undefined,
      answer1MediaUrl: answer1MediaUrl ?? undefined,
      answer1MediaType: answer1MediaType ?? undefined,
      answer2MediaUrl: answer2MediaUrl ?? undefined,
      answer2MediaType: answer2MediaType ?? undefined,
      answer3MediaUrl: answer3MediaUrl ?? undefined,
      answer3MediaType: answer3MediaType ?? undefined,
      answer4MediaUrl: answer4MediaUrl ?? undefined,
      answer4MediaType: answer4MediaType ?? undefined,
      difficulty: difficulty ?? undefined,
      explanation: explanation ?? undefined,
      explanationMediaUrl: explanationMediaUrl ?? undefined,
      explanationMediaType: explanationMediaType ?? undefined,
      audioPlayLimit: audioPlayLimit ?? undefined,
      sectionId: sectionId ?? undefined,
      advancedData: advancedData ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
