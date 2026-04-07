import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  // Get student IDs enrolled in this teacher's classes
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId: session.user.id } },
    select: { userId: true },
  });
  const studentIds = [...new Set(enrollments.map((e: any) => e.userId))];

  const where = {
    userId: { in: studentIds },
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { practiceTest: { title: { contains: search, mode: "insensitive" as const } } },
        { practiceTest: { topic: { title: { contains: search, mode: "insensitive" as const } } } },
      ],
    }),
    ...(dateFrom || dateTo
      ? {
          completedAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    prisma.practiceResult.findMany({
      where,
      include: {
        user: { select: { name: true } },
        practiceTest: {
          include: {
            topic: { include: { language: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.practiceResult.count({ where }),
  ]);

  return NextResponse.json({
    results: results.map((r: any) => ({
      id: r.id,
      studentName: r.user.name,
      testName: r.practiceTest.title,
      topicName: r.practiceTest.topic.title,
      language: r.practiceTest.topic.language.name,
      score: r.score,
      correctCount: r.correctCount,
      totalQuestions: r.totalQuestions,
      completedAt: r.completedAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  // Verify these results belong to teacher's students
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId: session.user.id } },
    select: { userId: true },
  });
  const studentIds = new Set(enrollments.map((e: { userId: string }) => e.userId));

  const results = await prisma.practiceResult.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true },
  });

  const validIds = results.filter((r) => studentIds.has(r.userId)).map((r) => r.id);

  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid results to delete" }, { status: 404 });
  }

  // Delete student answers first (cascade should handle this, but be explicit)
  await prisma.studentAnswer.deleteMany({ where: { practiceResultId: { in: validIds } } });
  // Delete comments
  await prisma.comment.deleteMany({ where: { practiceResultId: { in: validIds } } });
  // Delete results
  await prisma.practiceResult.deleteMany({ where: { id: { in: validIds } } });

  return NextResponse.json({ deleted: validIds.length });
}
