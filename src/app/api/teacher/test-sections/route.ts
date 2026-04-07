import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });

  // Verify ownership
  const test = await prisma.practiceTest.findUnique({ where: { id: testId } });
  if (!test || test.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch all sections for the test as flat list (client builds tree)
  const sections = await prisma.testSection.findMany({
    where: { practiceTestId: testId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(sections);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId, parentId, level, title, description, sortOrder, mediaUrl, mediaType } =
    await request.json();

  // Verify ownership
  const test = await prisma.practiceTest.findUnique({ where: { id: testId } });
  if (!test || test.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const section = await prisma.testSection.create({
    data: {
      practiceTestId: testId,
      parentId: parentId || null,
      level,
      title,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
    },
  });

  return NextResponse.json(section, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description, sortOrder, mediaUrl, mediaType } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify ownership via test
  const section = await prisma.testSection.findUnique({
    where: { id },
    include: { practiceTest: { select: { createdById: true } } },
  });
  if (!section || section.practiceTest.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.testSection.update({
    where: { id },
    data: {
      title: title ?? undefined,
      description: description ?? undefined,
      sortOrder: sortOrder ?? undefined,
      mediaUrl: mediaUrl ?? undefined,
      mediaType: mediaType ?? undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify ownership
  const section = await prisma.testSection.findUnique({
    where: { id },
    include: { practiceTest: { select: { createdById: true } } },
  });
  if (!section || section.practiceTest.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascade delete (children + unlink questions)
  await prisma.testSection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
