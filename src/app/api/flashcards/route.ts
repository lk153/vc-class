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
