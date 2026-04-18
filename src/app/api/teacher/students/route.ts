import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No student ids provided" }, { status: 400 });
  }

  // Only allow deletion of STUDENT users who have at least one enrollment
  // in a class owned by this teacher.
  const deletable = await prisma.user.findMany({
    where: {
      id: { in: ids },
      role: "STUDENT",
      classEnrollments: { some: { class: { teacherId: session.user.id } } },
    },
    select: { id: true },
  });
  const deletableIds = deletable.map((u: { id: string }) => u.id);

  if (deletableIds.length === 0) {
    return NextResponse.json({ error: "No deletable students" }, { status: 404 });
  }

  // Cascade handles: ClassEnrollment, FlashcardProgress, PracticeResult,
  // ExamAttempt, ExamAnswer, QuestionBookmark, QuestionOverride, Notification.
  const result = await prisma.user.deleteMany({
    where: { id: { in: deletableIds } },
  });

  return NextResponse.json({ deleted: result.count });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, status, name, email, learnLanguageId } = await request.json();

  if (!studentId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
    updateData.status = status;
  }
  if (name?.trim()) {
    updateData.name = name.trim();
  }
  if (email?.trim()) {
    updateData.email = email.trim();
  }
  if (learnLanguageId !== undefined) {
    updateData.learnLanguageId = learnLanguageId || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: studentId },
    data: updateData,
    include: { learnLanguage: true },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    languageName: user.learnLanguage?.name || "-",
  });
}
