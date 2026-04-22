import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Playwright pre-flight endpoint — returns the current session's identity
 * including the `isTest` flag. The suite refuses to run if this endpoint
 * reports `isTest=false` or a non-@e2e.test email.
 *
 * Not a security boundary: the real isolation comes from ownership filters
 * on every data query. This endpoint is a second line of defence against
 * a misconfigured env logging in as a real user.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.E2E_ALLOW !== "yes") {
    return NextResponse.json({ error: "E2E endpoints disabled" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, isTest: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
