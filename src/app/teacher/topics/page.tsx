import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import TopicList from "@/components/teacher/TopicList";

export default async function TeacherTopicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const [topics, languages] = await Promise.all([
    prisma.topic.findMany({
      where: { createdById: session.user.id },
      include: {
        language: true,
        _count: { select: { vocabulary: true, topicAssignments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.language.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      {/* Editorial Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-2">
            {t("topics")}
          </h1>
          <p className="text-lg font-headline italic text-[#464554] opacity-80">
            Curate and manage your vocabulary collections.
          </p>
        </div>
      </div>

      <TopicList
        topics={topics.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          languageName: t.language.name,
          languageId: t.languageId,
          vocabCount: t._count.vocabulary,
          assignmentCount: t._count.topicAssignments,
        }))}
        languages={languages}
        teacherId={session.user.id}
      />
    </div>
  );
}
