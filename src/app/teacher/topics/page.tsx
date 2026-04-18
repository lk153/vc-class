import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TopicList from "@/components/teacher/TopicList";

export const metadata: Metadata = { title: "Topics" };

export default async function TeacherTopicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
      <TopicList
        topics={topics.map((t: { id: string; title: string; description: string | null; language: { name: string }; languageId: string; _count: { vocabulary: number; topicAssignments: number } }) => ({
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
