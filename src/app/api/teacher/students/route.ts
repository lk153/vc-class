import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
