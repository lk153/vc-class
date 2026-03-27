import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
type VocabItem = { id: string; word: string; meaning: string; example: string | null };
type PracticeTestItem = { id: string; title: string; _count: { questions: number } };
type ProgressItem = { vocabularyId: string };
type PracticeResultItem = { id: string; practiceTestId: string; score: number };

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { topicId } = await params;
  const t = await getTranslations("student");

  // Verify student has access via class enrollment
  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: session.user.id,
      class: { topicAssignments: { some: { topicId } } },
    },
  });

  if (!hasAccess) notFound();

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      language: true,
      vocabulary: { orderBy: { sortOrder: "asc" } },
      practiceTests: {
        include: { _count: { select: { questions: true } } },
      },
    },
  });

  if (!topic) notFound();

  // Get flashcard progress
  const progress = await prisma.flashcardProgress.findMany({
    where: {
      userId: session.user.id,
      vocabularyId: { in: (topic.vocabulary as VocabItem[]).map((v) => v.id) },
      learned: true,
    },
  });

  const learnedSet = new Set((progress as ProgressItem[]).map((p) => p.vocabularyId));
  const learnedCount = progress.length;
  const totalCount = topic.vocabulary.length;
  const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  const allLearned = totalCount > 0 && learnedCount === totalCount;

  // Get practice results
  const practiceResults = await prisma.practiceResult.findMany({
    where: {
      userId: session.user.id,
      practiceTestId: { in: (topic.practiceTests as PracticeTestItem[]).map((pt) => pt.id) },
    },
    orderBy: { completedAt: "desc" },
  });

  const resultsByTest = new Map<string, PracticeResultItem>(
    practiceResults.map((r: PracticeResultItem) => [r.practiceTestId, r])
  );

  return (
    <div className="font-body">
      {/* Hero Editorial Header */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20 items-end">
        <div className="lg:col-span-7">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-sm font-body uppercase tracking-widest text-[#464554]">
            <Link href="/topics" className="hover:text-[#2a14b4] transition-colors">
              {t("topics")}
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-[#2a14b4] font-bold">{topic.language.name}</span>
          </nav>

          <h1 className="text-7xl md:text-8xl font-headline text-[#121c2a] leading-none mb-6">
            {topic.title}
          </h1>

          {topic.description && (
            <p className="text-xl md:text-2xl text-[#464554] font-headline italic leading-relaxed max-w-2xl">
              {topic.description}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Progress Card */}
          <div className="bg-[#eff4ff] p-8 rounded-xl ambient-shadow">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-body uppercase tracking-widest text-[#464554]">
                {t("progress") || "Progress"}
              </span>
              <span className="text-3xl font-headline text-[#2a14b4]">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#d9e3f6] rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-[#464554] font-medium">
              {t("wordsLearned", { count: learnedCount, total: totalCount })}
            </p>
          </div>

          {/* Study Flashcards Button */}
          <Link
            href={`/topics/${topicId}/flashcards`}
            className="w-full py-5 bg-[#2a14b4] text-white rounded-full font-body font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">style</span>
            {t("studyFlashcards")}
          </Link>
        </div>
      </header>

      {/* Vocabulary Collection */}
      <section className="mb-24">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="text-4xl font-headline text-[#121c2a]">
            {t("vocabularyCollection") || "Vocabulary Collection"}
          </h2>
          <div className="h-px flex-grow mx-8 bg-[#c7c4d7]/20 hidden md:block" />
          <span className="text-sm font-body uppercase tracking-widest text-[#464554]">
            {t("items", { count: totalCount })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(topic.vocabulary as VocabItem[]).map((vocab) => {
            const isLearned = learnedSet.has(vocab.id);
            return (
              <div
                key={vocab.id}
                className={`group p-8 rounded-xl transition-all duration-500 relative overflow-hidden ${
                  isLearned
                    ? "bg-white shadow-[0px_20px_40px_rgba(18,28,42,0.06)] hover:shadow-[0px_30px_60px_rgba(18,28,42,0.1)]"
                    : "bg-[#eff4ff]/40 border border-[#c7c4d7]/10 shadow-[0px_10px_20px_rgba(18,28,42,0.02)]"
                }`}
              >
                <div className="absolute top-6 right-6">
                  {isLearned ? (
                    <span
                      className="material-symbols-outlined text-[#1b6b51]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[#c7c4d7]">
                      radio_button_unchecked
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-headline text-[#121c2a] mb-4">{vocab.word}</h3>
                <p className="text-sm text-[#464554] mb-6 leading-relaxed">{vocab.meaning}</p>

                {vocab.example && (
                  <>
                    <p className="text-xs font-body uppercase tracking-wider text-[#2a14b4] mb-2 opacity-60">
                      {t("example")}
                    </p>
                    <p className="text-sm font-headline italic text-[#121c2a]">
                      &ldquo;{vocab.example}&rdquo;
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Practice Tests Section */}
      {topic.practiceTests.length > 0 && (
        <section className="bg-[#eff4ff] rounded-3xl p-12 relative overflow-hidden">
          {/* Accent blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2a14b4]/5 rounded-full blur-3xl -mr-32 -mt-32" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
            <div className="max-w-xl">
              <h2 className="text-4xl font-headline text-[#121c2a] mb-4">
                {t("testKnowledge") || "Test your knowledge"}
              </h2>
              <p className="text-lg font-headline italic text-[#464554]">
                {t("testDescription") || "Validate your mastery through our curated assessment modules."}
              </p>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-4">
              {(topic.practiceTests as PracticeTestItem[]).map((test) => {
                const result = resultsByTest.get(test.id);
                return (
                  <div
                    key={test.id}
                    className="bg-white p-6 rounded-2xl flex items-center justify-between border border-[#c7c4d7]/10 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#a6f2d1]/30 flex items-center justify-center text-[#1b6b51]">
                        <span className="material-symbols-outlined">quiz</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#121c2a]">{test.title}</h4>
                        <p className="text-xs font-body uppercase tracking-widest text-[#464554]">
                          {t("questionsCount", { count: test._count.questions })}
                        </p>
                      </div>
                    </div>
                    {result && (
                      <div className="text-right">
                        <span className="block text-2xl font-headline text-[#2a14b4]">
                          {Math.round(result.score)}%
                        </span>
                        <span className="text-[10px] font-body uppercase text-[#464554]">
                          {t("bestAttempt")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {allLearned && (
                <Link
                  href={`/topics/${topicId}/practice`}
                  className="w-full py-4 bg-[#121c2a] text-white rounded-xl font-body font-bold uppercase tracking-widest text-xs hover:opacity-90 active:scale-[0.98] transition-all text-center"
                >
                  {t("retakeAssessment") || "Retake Assessment"}
                </Link>
              )}

              {!allLearned && (
                <p className="text-xs text-[#777586] font-body text-center uppercase tracking-wider">
                  {t("learnAllWordsFirst") || "Learn all words to unlock practice tests"}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
