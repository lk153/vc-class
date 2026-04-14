import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: unread count + recent notifications
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ unreadCount, notifications });
}

// PATCH: mark notifications as read
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationIds, markAllRead } = await request.json();

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  } else if (notificationIds && Array.isArray(notificationIds)) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: session.user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
