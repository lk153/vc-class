import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";

  const where = {
    uploadedById: session.user.id,
    ...(search && {
      fileName: { contains: search, mode: "insensitive" as const },
    }),
    ...(type && {
      fileType: { startsWith: type },
    }),
  };

  // Always fetch stats from ALL user media (unfiltered)
  const allMedia = prisma.media.findMany({
    where: { uploadedById: session.user.id },
    select: { fileType: true, fileSize: true },
  });

  const [results, total, allItems] = await Promise.all([
    prisma.media.findMany({
      where,
      include: { uploadedBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.media.count({ where }),
    allMedia,
  ]);

  // Compute usage count for each media file in current page
  const fileUrls = results.map((m: any) => m.fileUrl);
  const fileUrlSet = new Set(fileUrls);
  const usageResults = fileUrls.length > 0
    ? await prisma.question.findMany({
        where: {
          OR: fileUrls.flatMap((url: string) => [
            { contentMediaUrl: url },
            { answer1MediaUrl: url },
            { answer2MediaUrl: url },
            { answer3MediaUrl: url },
            { answer4MediaUrl: url },
            { explanationMediaUrl: url },
          ]),
        },
        select: {
          contentMediaUrl: true,
          answer1MediaUrl: true,
          answer2MediaUrl: true,
          answer3MediaUrl: true,
          answer4MediaUrl: true,
          explanationMediaUrl: true,
        },
      })
    : [];

  // Count how many questions reference each URL
  const usageMap = new Map<string, number>();
  for (const q of usageResults) {
    for (const url of [q.contentMediaUrl, q.answer1MediaUrl, q.answer2MediaUrl, q.answer3MediaUrl, q.answer4MediaUrl, q.explanationMediaUrl]) {
      if (url && fileUrlSet.has(url)) {
        usageMap.set(url, (usageMap.get(url) || 0) + 1);
      }
    }
  }

  return NextResponse.json({
    results: results.map((m: any) => ({
      id: m.id,
      fileName: m.fileName,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      fileSize: m.fileSize,
      ownerEmail: m.uploadedBy.email,
      createdAt: m.createdAt.toISOString(),
      usageCount: usageMap.get(m.fileUrl) || 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: allItems.reduce(
      (acc, m: { fileType: string; fileSize: number }) => {
        acc.totalFiles++;
        acc.totalSize += m.fileSize;
        if (m.fileType.startsWith("image/")) acc.imageCount++;
        else if (m.fileType.startsWith("audio/")) acc.audioCount++;
        else if (m.fileType.startsWith("video/")) acc.videoCount++;
        return acc;
      },
      { totalFiles: 0, totalSize: 0, imageCount: 0, audioCount: 0, videoCount: 0 },
    ),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { files } = await request.json();

  if (!files?.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "audio/mpeg", "video/mp4"];

  const records = [];
  for (const file of files) {
    if (!allowedTypes.includes(file.fileType)) continue;

    const record = await prisma.media.create({
      data: {
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: file.fileSize,
        uploadedById: session.user.id,
      },
    });
    records.push(record);
  }

  return NextResponse.json({ count: records.length, records }, { status: 201 });
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

  const mediaItems = await prisma.media.findMany({
    where: { id: { in: ids }, uploadedById: session.user.id },
  });

  // Delete from Vercel Blob (parallel)
  await Promise.all(mediaItems.map((m) => del(m.fileUrl).catch(() => null)));

  // Delete from DB
  await prisma.media.deleteMany({
    where: { id: { in: mediaItems.map((m) => m.id) } },
  });

  return NextResponse.json({ deleted: mediaItems.length });
}
