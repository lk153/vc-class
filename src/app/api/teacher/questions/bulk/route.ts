import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_FIELDS = ["timer", "difficulty"] as const;

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, field, value } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json(
      { error: `field must be one of: ${ALLOWED_FIELDS.join(", ")}` },
      { status: 400 }
    );
  }

  // Verify all questions belong to teacher's tests
  const questions = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, practiceTest: { select: { createdById: true } } },
  });

  const allBelongToTeacher = questions.every(
    (q) => q.practiceTest.createdById === session.user.id
  );

  if (questions.length !== ids.length || !allBelongToTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.question.updateMany({
    where: { id: { in: ids } },
    data: { [field]: value },
  });

  return NextResponse.json({ updated: result.count });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  // Verify all questions belong to teacher's tests
  const questions = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, practiceTest: { select: { createdById: true } } },
  });

  const allBelongToTeacher = questions.every(
    (q) => q.practiceTest.createdById === session.user.id
  );

  if (questions.length !== ids.length || !allBelongToTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.question.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ deleted: result.count });
}
