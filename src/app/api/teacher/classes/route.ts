import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      language: true,
      _count: { select: { enrollments: true, topicAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, languageId, level, schedule, startDate, endDate, maxStudents, specialNotes } = body;

  if (!name?.trim() || !languageId || !level?.trim() || !schedule?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newClass = await prisma.class.create({
    data: {
      name: name.trim(),
      languageId,
      level: level.trim(),
      schedule: schedule.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      teacherId: session.user.id,
      maxStudents: maxStudents || 10,
      specialNotes: specialNotes?.trim() || null,
    },
    include: { language: true },
  });

  return NextResponse.json(newClass, { status: 201 });
}
