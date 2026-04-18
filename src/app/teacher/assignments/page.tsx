import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AssignmentPanel from "@/components/teacher/AssignmentPanel";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const [topics, classes, assignments] = await Promise.all([
    prisma.topic.findMany({
      where: { createdById: session.user.id },
      include: { language: true },
      orderBy: { title: "asc" },
    }),
    prisma.class.findMany({
      where: { teacherId: session.user.id, status: { not: "CANCELLED" } },
      include: {
        language: true,
        topicAssignments: { select: { topicId: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.topicAssignment.findMany({
      where: { class: { teacherId: session.user.id } },
      include: {
        class: { include: { language: true } },
        topic: { include: { language: true } },
      },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  return (
    <div>
      {/* Editorial Header */}
      <div className="mb-10">
        <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
          {t("assignments")}
        </h1>
        <p className="text-lg font-body text-[#464554] opacity-80">
          {t("assignmentsSubtitle")}
        </p>
      </div>
      <AssignmentPanel
        topics={topics.map((t: { id: string; title: string; language: { name: string } }) => ({
          id: t.id,
          title: t.title,
          languageName: t.language.name,
        }))}
        classes={classes.map((c: { id: string; name: string; language: { name: string }; _count: { enrollments: number }; topicAssignments: { topicId: string }[] }) => ({
          id: c.id,
          name: c.name,
          languageName: c.language.name,
          studentCount: c._count.enrollments,
          assignedTopicIds: c.topicAssignments.map((a: { topicId: string }) => a.topicId),
        }))}
        assigned={assignments.map((a: {
          id: string;
          assignedAt: Date;
          class: { id: string; name: string; language: { name: string } };
          topic: { id: string; title: string; language: { name: string } };
        }) => ({
          id: a.id,
          className: a.class.name,
          classLanguageName: a.class.language.name,
          topicTitle: a.topic.title,
          topicLanguageName: a.topic.language.name,
          assignedAt: a.assignedAt.toISOString(),
        }))}
      />
    </div>
  );
}
