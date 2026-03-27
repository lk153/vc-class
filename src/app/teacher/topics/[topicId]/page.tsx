import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import VocabularyManager from "@/components/teacher/VocabularyManager";

export default async function TeacherTopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { topicId } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId, createdById: session.user.id },
    include: {
      language: true,
      vocabulary: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!topic) notFound();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{topic.title}</h1>
          {topic.description && (
            <p className="text-muted mt-1">{topic.description}</p>
          )}
          <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full mt-2 inline-block">
            {topic.language.name}
          </span>
        </div>
      </div>

      <VocabularyManager
        topicId={topicId}
        vocabulary={topic.vocabulary.map((v) => ({
          id: v.id,
          word: v.word,
          meaning: v.meaning,
          example: v.example,
          sortOrder: v.sortOrder,
        }))}
      />
    </div>
  );
}
