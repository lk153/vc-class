import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AssignmentPanel from "@/components/teacher/AssignmentPanel";

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const [topics, classes] = await Promise.all([
    prisma.topic.findMany({
      where: { createdById: session.user.id },
      include: { language: true },
      orderBy: { title: "asc" },
    }),
    prisma.class.findMany({
      where: { teacherId: session.user.id, status: { not: "ARCHIVED" } },
      include: {
        language: true,
        topicAssignments: { select: { topicId: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      {/* Editorial Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-2">
          {t("assignments")}
        </h1>
        <p className="text-lg font-headline italic text-[#464554] opacity-80">
          Select topics and assign them to your classes.
        </p>
      </div>
      <AssignmentPanel
        topics={topics.map((t) => ({
          id: t.id,
          title: t.title,
          languageName: t.language.name,
        }))}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          languageName: c.language.name,
          studentCount: c._count.enrollments,
          assignedTopicIds: c.topicAssignments.map((a) => a.topicId),
        }))}
      />
    </div>
  );
}
