import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TopicGrid from "@/components/student/TopicGrid";
import { getTranslations } from "next-intl/server";

export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("student");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { learnLanguage: true },
  });

  const languageLabel = user?.learnLanguage
    ? `${user.learnLanguage.name} ${t("language") || "Language"}`
    : t("curatedCollection") || "Curated Collection";

  // Get topics assigned to classes the student is enrolled in
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: session.user.id },
    include: {
      class: {
        include: {
          topicAssignments: {
            include: {
              topic: {
                include: {
                  language: true,
                  vocabulary: true,
                  _count: { select: { vocabulary: true } },
                },
              },
            },
            orderBy: { assignedAt: "desc" },
          },
        },
      },
    },
  });

  // Flatten and deduplicate topics across classes
  const seenTopicIds = new Set<string>();
  const assignments = enrollments.flatMap((e) =>
    e.class.topicAssignments.filter((ta) => {
      if (seenTopicIds.has(ta.topicId)) return false;
      seenTopicIds.add(ta.topicId);
      return true;
    })
  );

  // Get flashcard progress for all assigned topics
  const vocabIds = assignments.flatMap((a) =>
    a.topic.vocabulary.map((v: { id: string }) => v.id)
  );

  const progress = await prisma.flashcardProgress.findMany({
    where: {
      userId: session.user.id,
      vocabularyId: { in: vocabIds },
      learned: true,
    },
  });

  const learnedSet = new Set(progress.map((p) => p.vocabularyId));

  return (
    <div className="font-body">
      {/* Editorial Header */}
      <header className="mb-16 max-w-4xl">
        <div className="inline-block px-3 py-1 mb-4 bg-[#d9e3f6] text-[#464554] font-body text-[10px] uppercase tracking-[0.2em] rounded-full">
          {languageLabel}
        </div>
        <h1 className="font-headline text-6xl md:text-7xl text-[#121c2a] tracking-tight leading-tight">
          {t("topics")}
        </h1>
        <p className="mt-6 text-[#464554] text-lg max-w-2xl font-light leading-relaxed">
          {t("topicsDescription") || "A personal library of linguistic explorations. Each collection is designed to bridge the gap between technical mastery and natural fluency."}
        </p>
      </header>

      {assignments.length === 0 ? (
        <div className="text-center py-20 text-[#777586]">
          <span className="material-symbols-outlined text-6xl mb-6 block">menu_book</span>
          <h2 className="font-headline text-3xl italic text-[#121c2a] mb-3">No topics yet</h2>
          <p className="text-[#464554] font-body">No topics assigned yet. Please wait for your teacher.</p>
        </div>
      ) : (
        <TopicGrid
          items={assignments.map((assignment) => {
            const totalWords = assignment.topic.vocabulary.length;
            const learnedWords = assignment.topic.vocabulary.filter((v) =>
              learnedSet.has(v.id)
            ).length;
            return {
              id: assignment.id,
              topic: assignment.topic,
              languageId: assignment.topic.language.id,
              languageName: assignment.topic.language.name,
              totalWords,
              learnedWords,
            };
          })}
          languages={[...new Map(
            assignments.map((a) => [a.topic.language.id, { id: a.topic.language.id, name: a.topic.language.name }])
          ).values()]}
        />
      )}
    </div>
  );
}
