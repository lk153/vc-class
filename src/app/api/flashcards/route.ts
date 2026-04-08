import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vocabularyId, learned } = await request.json();

  if (!vocabularyId || typeof learned !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const progress = await prisma.flashcardProgress.upsert({
    where: {
      userId_vocabularyId: {
        userId: session.user.id,
        vocabularyId,
      },
    },
    update: {
      learned,
      learnedAt: learned ? new Date() : null,
    },
    create: {
      userId: session.user.id,
      vocabularyId,
      learned,
      learnedAt: learned ? new Date() : null,
    },
  });

  return NextResponse.json(progress);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vocabularyIds, learned } = await request.json();

  if (!Array.isArray(vocabularyIds) || typeof learned !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = learned ? new Date() : null;
  const userId = session.user.id;

  await prisma.$executeRawUnsafe(
    `INSERT INTO flashcard_progress (id, vocabulary_id, user_id, learned, learned_at)
     SELECT gen_random_uuid(), vid, $1, $2, $3
     FROM unnest($4::text[]) AS vid
     ON CONFLICT (user_id, vocabulary_id)
     DO UPDATE SET learned = $2, learned_at = $3`,
    userId,
    learned,
    now,
    vocabularyIds,
  );

  return NextResponse.json({ updated: vocabularyIds.length });
}
