import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await params;

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media || media.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from Vercel Blob
  try {
    await del(media.fileUrl);
  } catch {
    // Continue even if blob deletion fails (file may already be gone)
  }

  // Delete from DB
  await prisma.media.delete({ where: { id: mediaId } });

  return NextResponse.json({ success: true });
}
