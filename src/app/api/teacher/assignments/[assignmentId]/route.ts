import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await params;

  // Verify ownership via class
  const assignment = await prisma.topicAssignment.findUnique({
    where: { id: assignmentId },
    include: { class: { select: { teacherId: true } } },
  });

  if (!assignment || assignment.class.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.topicAssignment.delete({
    where: { id: assignmentId },
  });

  return NextResponse.json({ success: true });
}
