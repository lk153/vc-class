import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const languages = await prisma.language.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(languages);
}
