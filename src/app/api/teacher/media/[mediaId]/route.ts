import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

async function getMediaUsageCount(fileUrl: string): Promise<number> {
  // Check all media URL fields in questions
  const count = await prisma.question.count({
    where: {
      OR: [
        { contentMediaUrl: fileUrl },
        { answer1MediaUrl: fileUrl },
        { answer2MediaUrl: fileUrl },
        { answer3MediaUrl: fileUrl },
        { answer4MediaUrl: fileUrl },
        { explanationMediaUrl: fileUrl },
      ],
    },
  });
  return count;
}

export async function DELETE(
  request: Request,
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

  // Check if force=true query param is set, otherwise check usage
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    const usageCount = await getMediaUsageCount(media.fileUrl);
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "media_in_use", usageCount },
        { status: 409 },
      );
    }
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
