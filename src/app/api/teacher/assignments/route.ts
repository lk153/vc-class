import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicIds, classIds } = await request.json();

  if (!topicIds?.length || !classIds?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Create assignments, skip duplicates
  const data: { classId: string; topicId: string }[] = [];
  for (const classId of classIds) {
    for (const topicId of topicIds) {
      data.push({ classId, topicId });
    }
  }

  const result = await prisma.topicAssignment.createMany({
    data,
    skipDuplicates: true,
  });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
