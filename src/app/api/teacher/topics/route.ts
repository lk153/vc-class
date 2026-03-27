import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, languageId } = await request.json();

  if (!title || !languageId) {
    return NextResponse.json({ error: "Title and language required" }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      title,
      description: description || null,
      languageId,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(topic, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description } = await request.json();

  // Verify ownership
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const topic = await prisma.topic.update({
    where: { id },
    data: { title, description: description || null },
  });

  return NextResponse.json(topic);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  // Verify ownership
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.topic.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
