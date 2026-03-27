import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import ClassDetailClient from "@/components/teacher/ClassDetailClient";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");
  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      language: true,
      enrollments: {
        include: {
          user: { select: { id: true, name: true, email: true, status: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
      topicAssignments: {
        include: {
          topic: { include: { language: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!cls || cls.teacherId !== session.user.id) notFound();

  // Get all students not yet enrolled in this class
  const enrolledIds = cls.enrollments.map((e) => e.userId);
  const availableStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      id: { notIn: enrolledIds.length > 0 ? enrolledIds : ["_none_"] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Get available languages for editing
  const languages = await prisma.language.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4] transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t("classes")}
      </Link>

      <ClassDetailClient
        classId={classId}
        classInfo={{
          name: cls.name,
          languageId: cls.languageId,
          languageName: cls.language.name,
          level: cls.level,
          schedule: cls.schedule,
          startDate: cls.startDate.toISOString().split("T")[0],
          endDate: cls.endDate.toISOString().split("T")[0],
          maxStudents: cls.maxStudents,
          specialNotes: cls.specialNotes || "",
          status: cls.status,
        }}
        languages={languages.map((l) => ({ id: l.id, name: l.name, code: l.code }))}
        enrolledStudents={cls.enrollments.map((e) => ({
          id: e.user.id,
          name: e.user.name,
          email: e.user.email,
          status: e.user.status,
          enrolledAt: e.enrolledAt.toISOString(),
        }))}
        availableStudents={availableStudents}
        topics={cls.topicAssignments.map((ta) => ({
          id: ta.id,
          title: ta.topic.title,
          languageName: ta.topic.language.name,
          assignedAt: ta.assignedAt.toISOString(),
        }))}
      />
    </div>
  );
}
