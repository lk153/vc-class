import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import StudentTable from "@/components/teacher/StudentTable";

export default async function StudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  // Get students enrolled in this teacher's classes
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId: session.user.id } },
    include: {
      user: { include: { learnLanguage: true } },
      class: {
        include: {
          topicAssignments: {
            include: {
              topic: {
                include: {
                  language: true,
                  createdBy: { select: { name: true } },
                },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
        },
      },
    },
  });

  // Group by student, collecting topics grouped by class
  const studentMap = new Map<string, {
    user: typeof enrollments[0]["user"];
    classTopics: {
      className: string;
      topics: { id: string; assignmentId: string; title: string; languageName: string; createdBy: string; assignedAt: string }[];
    }[];
  }>();

  for (const enrollment of enrollments) {
    const classGroup = {
      className: enrollment.class.name,
      topics: enrollment.class.topicAssignments.map((ta: { id: string; topic: { id: string; title: string; language: { name: string }; createdBy: { name: string } | null }; assignedAt: Date }) => ({
        id: ta.topic.id,
        assignmentId: ta.id,
        title: ta.topic.title,
        languageName: ta.topic.language.name,
        createdBy: ta.topic.createdBy?.name || "-",
        assignedAt: ta.assignedAt.toISOString(),
      })),
    };

    const existing = studentMap.get(enrollment.userId);
    if (existing) {
      existing.classTopics.push(classGroup);
    } else {
      studentMap.set(enrollment.userId, {
        user: enrollment.user,
        classTopics: [classGroup],
      });
    }
  }

  const students = [...studentMap.values()].sort(
    (a, b) => b.user.createdAt.getTime() - a.user.createdAt.getTime()
  );

  return (
    <div>
      {/* Editorial Header */}
      <div className="mb-10">
        <p className="text-[10px] font-body uppercase tracking-[0.2em] text-[#464554] opacity-40 mb-2">
          {t("directory")}
        </p>
        <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
          {t("students")}
        </h1>
        <p className="text-lg font-body text-[#464554] opacity-80">
          {t("studentsSubtitle")}
        </p>
      </div>

      <StudentTable
        students={students.map((s: any) => {
          const totalTopics = s.classTopics.reduce((sum: number, ct: any) => sum + ct.topics.length, 0);
          return {
            id: s.user.id,
            name: s.user.name,
            email: s.user.email,
            status: s.user.status,
            languageId: s.user.learnLanguageId,
            languageName: s.user.learnLanguage?.name || "-",
            topicCount: totalTopics,
            classTopics: s.classTopics,
            createdAt: s.user.createdAt.toISOString(),
          };
        })}
      />
    </div>
  );
}
