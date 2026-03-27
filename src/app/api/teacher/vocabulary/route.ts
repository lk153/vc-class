import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, word, meaning, example, sortOrder } = await request.json();

  // Verify topic ownership
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const vocab = await prisma.vocabulary.create({
    data: { topicId, word, meaning, example, sortOrder: sortOrder || 0 },
  });

  return NextResponse.json(vocab, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, word, meaning, example } = await request.json();

  // Verify ownership via topic
  const vocab = await prisma.vocabulary.findUnique({
    where: { id },
    include: { topic: { select: { createdById: true } } },
  });
  if (!vocab || vocab.topic.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.vocabulary.update({
    where: { id },
    data: { word, meaning, example },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  // Verify ownership via topic
  const vocab = await prisma.vocabulary.findUnique({
    where: { id },
    include: { topic: { select: { createdById: true } } },
  });
  if (!vocab || vocab.topic.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.vocabulary.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
