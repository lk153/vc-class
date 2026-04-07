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
    title,
    status,
    mode,
    shuffleAnswers,
    showReviewMoment,
    availableFrom,
    availableTo,
  } = await request.json();

  if (!id || !title?.trim()) {
    return NextResponse.json({ error: "ID and title are required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.practiceTest.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { title: title.trim() };
  if (status !== undefined) data.status = status;
  if (mode !== undefined) data.mode = mode;
  if (shuffleAnswers !== undefined) data.shuffleAnswers = shuffleAnswers;
  if (showReviewMoment !== undefined) data.showReviewMoment = showReviewMoment;
  if (availableFrom !== undefined) data.availableFrom = availableFrom ? new Date(availableFrom) : null;
  if (availableTo !== undefined) data.availableTo = availableTo ? new Date(availableTo) : null;

  const test = await prisma.practiceTest.update({
    where: { id },
    data,
  });

  return NextResponse.json(test);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.practiceTest.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascade delete: questions, sections, results, student answers all cascade via schema
  await prisma.practiceTest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
