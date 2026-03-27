import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const { studentIds } = await request.json();

  if (!studentIds?.length) {
    return NextResponse.json({ error: "No students provided" }, { status: 400 });
  }

  // Verify ownership
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!cls || cls.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check capacity
  const remaining = cls.maxStudents - cls._count.enrollments;
  if (studentIds.length > remaining) {
    return NextResponse.json(
      { error: `Only ${remaining} spots remaining` },
      { status: 400 }
    );
  }

  const result = await prisma.classEnrollment.createMany({
    data: studentIds.map((userId: string) => ({ classId, userId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
