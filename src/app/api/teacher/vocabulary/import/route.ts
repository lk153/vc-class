import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, words } = await request.json();

  if (!topicId || !words?.length) {
    return NextResponse.json({ error: "topicId and words are required" }, { status: 400 });
  }

  // Verify topic ownership
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get current max sortOrder
  const maxSort = await prisma.vocabulary.aggregate({
    where: { topicId },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  const created = [];
  for (const w of words as { word: string; meaning: string; type?: string | null; pronunciation?: string | null; example?: string | null; sortOrder?: number }[]) {
    if (!w.word || !w.meaning) continue;
    const vocab = await prisma.vocabulary.create({
      data: {
        topicId,
        word: w.word.trim(),
        type: w.type?.trim() || null,
        pronunciation: w.pronunciation?.trim() || null,
        meaning: w.meaning.trim(),
        example: w.example?.trim() || null,
        sortOrder: w.sortOrder ?? nextSort++,
      },
    });
    created.push(vocab);
  }

  return NextResponse.json({ count: created.length }, { status: 201 });
}
