import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [results, total] = await Promise.all([
    prisma.media.findMany({
      where,
      include: { uploadedBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.media.count({ where }),
  ]);

  return NextResponse.json({
    results: results.map((m: any) => ({
      id: m.id,
      fileName: m.fileName,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      fileSize: m.fileSize,
      ownerEmail: m.uploadedBy.email,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
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
