import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTeacherStudentIds(teacherId: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId } },
    select: { userId: true },
  });
  return [...new Set(enrollments.map((e: { userId: string }) => e.userId))];
}

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

  const studentIds = await getTeacherStudentIds(session.user.id);

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

  const statusFilter = searchParams.get("status") || "";

  const [results, total] = await Promise.all([
    prisma.practiceResult.findMany({
      where: {
        ...where,
        ...(statusFilter && {
          examSession: { status: statusFilter as any },
        }),
      },
      include: {
        user: { select: { name: true } },
        practiceTest: {
          include: {
            topic: { include: { language: true } },
          },
        },
        examSession: {
          select: { status: true, attemptNumber: true, tabSwitchCount: true },
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
      sessionStatus: r.examSession?.status || null,
      attemptNumber: r.examSession?.attemptNumber || 1,
      tabSwitchCount: r.examSession?.tabSwitchCount || 0,
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
  const studentIds = new Set(await getTeacherStudentIds(session.user.id));

  const results = await prisma.practiceResult.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true },
  });

  const validIds = results.filter((r) => studentIds.has(r.userId)).map((r) => r.id);

  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid results to delete" }, { status: 404 });
  }

  // Delete dependent records in parallel, then results
  await Promise.all([
    prisma.studentAnswer.deleteMany({ where: { practiceResultId: { in: validIds } } }),
    prisma.comment.deleteMany({ where: { practiceResultId: { in: validIds } } }),
  ]);
  await prisma.practiceResult.deleteMany({ where: { id: { in: validIds } } });

  return NextResponse.json({ deleted: validIds.length });
}
