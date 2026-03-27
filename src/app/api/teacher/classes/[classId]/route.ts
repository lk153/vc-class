import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const body = await request.json();

  // Verify ownership
  const existing = await prisma.class.findUnique({ where: { id: classId } });
  if (!existing || existing.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name?.trim()) updateData.name = body.name.trim();
  if (body.languageId) updateData.languageId = body.languageId;
  if (body.level?.trim()) updateData.level = body.level.trim();
  if (body.schedule?.trim()) updateData.schedule = body.schedule.trim();
  if (body.startDate) updateData.startDate = new Date(body.startDate);
  if (body.endDate) updateData.endDate = new Date(body.endDate);
  if (body.maxStudents !== undefined) updateData.maxStudents = body.maxStudents;
  if (body.specialNotes !== undefined) updateData.specialNotes = body.specialNotes?.trim() || null;
  if (body.status) updateData.status = body.status;

  const updated = await prisma.class.update({
    where: { id: classId },
    data: updateData,
    include: { language: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  const existing = await prisma.class.findUnique({ where: { id: classId } });
  if (!existing || existing.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.class.delete({ where: { id: classId } });

  return NextResponse.json({ success: true });
}
