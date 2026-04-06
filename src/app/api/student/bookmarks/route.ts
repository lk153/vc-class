import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await prisma.questionBookmark.findMany({
    where: { userId: session.user.id },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          questionType: true,
          contentMediaUrl: true,
          contentMediaType: true,
          practiceTest: { select: { id: true, title: true, topicId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    bookmarks.map((b) => ({
      id: b.id,
      questionId: b.question.id,
      content: b.question.content,
      questionType: b.question.questionType,
      contentMediaUrl: b.question.contentMediaUrl,
      contentMediaType: b.question.contentMediaType,
      testId: b.question.practiceTest.id,
      testTitle: b.question.practiceTest.title,
      topicId: b.question.practiceTest.topicId,
      createdAt: b.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await request.json();
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  const bookmark = await prisma.questionBookmark.upsert({
    where: {
      userId_questionId: { userId: session.user.id, questionId },
    },
    create: { userId: session.user.id, questionId },
    update: {},
  });

  return NextResponse.json(bookmark, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await request.json();
  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  await prisma.questionBookmark.deleteMany({
    where: { userId: session.user.id, questionId },
  });

  return NextResponse.json({ success: true });
}
