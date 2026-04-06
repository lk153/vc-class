import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId, orderedIds } = await request.json();

  if (!testId || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "testId and orderedIds are required" },
      { status: 400 }
    );
  }

  const test = await prisma.practiceTest.findUnique({
    where: { id: testId },
    select: { createdById: true },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  if (test.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction(
    orderedIds.map((id: string, index: number) =>
      prisma.question.update({
        where: { id },
        data: { questionNumber: index + 1 },
      })
    )
  );

  return NextResponse.json({ success: true });
}
