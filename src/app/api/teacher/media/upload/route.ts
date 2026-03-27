import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  // Check if Blob storage is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[Media Upload] BLOB_READ_WRITE_TOKEN is not set. Please configure it in .env.local");
    return NextResponse.json(
      { error: "Media storage is not configured. Set BLOB_READ_WRITE_TOKEN in environment variables." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user || session.user.role !== "TEACHER") {
          throw new Error("Unauthorized: must be a teacher to upload media");
        }

        console.log(`[Media Upload] Token requested by ${session.user.email} for: ${pathname}`);

        const allowedTypes = [
          "image/png",
          "image/jpeg",
          "audio/mpeg",
          "video/mp4",
        ];

        return {
          allowedContentTypes: allowedTypes,
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB per file
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log(`[Media Upload] Upload completed: ${blob.url} (${blob.pathname})`);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const err = error as Error;
    console.error("[Media Upload] Error:", err.message);
    console.error("[Media Upload] Stack:", err.stack);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 400 }
    );
  }
}
