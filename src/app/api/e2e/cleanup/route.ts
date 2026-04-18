import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * E2E cleanup endpoint — removes all test data created by Playwright tests.
 * Only available in development. Protected by a shared secret.
 *
 * Convention: all E2E-created data uses emails ending with "@e2e.test"
 * or names starting with "E2E ".
 */
export async function DELETE(req: Request) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const secret = process.env.E2E_CLEANUP_SECRET || "e2e-cleanup-key";

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Delete E2E test users and all cascading data
  const deleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: "@e2e.test" } },
        { name: { startsWith: "E2E " } },
      ],
    },
  });

  // Delete E2E test topics (created by tests, named with E2E prefix)
  const deletedTopics = await prisma.topic.deleteMany({
    where: { title: { startsWith: "E2E " } },
  });

  // Delete E2E test classes
  const deletedClasses = await prisma.class.deleteMany({
    where: { name: { startsWith: "E2E " } },
  });

  // Delete E2E test practice tests
  const deletedTests = await prisma.practiceTest.deleteMany({
    where: { title: { startsWith: "E2E " } },
  });

  return NextResponse.json({
    cleaned: {
      users: deleted.count,
      topics: deletedTopics.count,
      classes: deletedClasses.count,
      practiceTests: deletedTests.count,
    },
  });
}
