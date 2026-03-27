import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title } = await request.json();

  if (!id || !title?.trim()) {
    return NextResponse.json({ error: "ID and title are required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.practiceTest.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const test = await prisma.practiceTest.update({
    where: { id },
    data: { title: title.trim() },
  });

  return NextResponse.json(test);
}
