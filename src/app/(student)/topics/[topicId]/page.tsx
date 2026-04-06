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

  // Get bookmarked questions for this topic's tests
  const testIds = (topic.practiceTests as PracticeTestItem[]).map((pt) => pt.id);
  const bookmarks = await prisma.questionBookmark.findMany({
    where: {
      userId: session.user.id,
      question: { practiceTestId: { in: testIds } },
    },
    include: {
      question: {
        select: {
          id: true,
          content: true,
          questionNumber: true,
          contentMediaUrl: true,
          contentMediaType: true,
          correctAnswer: true,
          practiceTest: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // SVG circular progress
  const circleR = 54;
  const circleC = 2 * Math.PI * circleR;
  const circleOffset = circleC - (circleC * progressPercent) / 100;

  return (
    <div className="font-body">
      {/* ── Hero Section ── */}
      <header className="relative bg-white rounded-3xl overflow-hidden mb-12 ambient-shadow">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#2a14b4]/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-[#4338ca]/[0.03] rounded-full blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 md:p-12">
          {/* Left: title & description */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 mb-6 text-[10px] font-body uppercase tracking-[0.2em] text-[#777586]">
              <Link href="/topics" className="hover:text-[#2a14b4] transition-colors">
                {t("topics")}
              </Link>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-[#2a14b4] font-bold">{topic.language.name}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-body font-bold leading-[1.2] mb-4 bg-gradient-to-r from-[#2a14b4] to-[#6d28d9] bg-clip-text text-transparent">
              {topic.title}
            </h1>

            {topic.description && (
              <p className="text-lg text-[#464554] font-body leading-relaxed max-w-xl">
                {topic.description}
              </p>
            )}

            {/* CTA */}
            <Link
              href={`/topics/${topicId}/flashcards`}
              className="mt-8 w-fit self-center lg:self-start px-10 py-4 bg-[#2a14b4] text-white rounded-full font-body font-bold uppercase tracking-widest text-xs flex items-center gap-3 shadow-lg shadow-[#2a14b4]/20"
            >
              <span className="material-symbols-outlined text-[20px]">style</span>
              {t("studyFlashcards")}
            </Link>
          </div>

          {/* Right: circular progress */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Background ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={circleR} fill="none" stroke="#e3dfff" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r={circleR} fill="none"
                  stroke="url(#progressGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circleC}
                  strokeDashoffset={circleOffset}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#d8d0f8" />
                    <stop offset="100%" stopColor="#2a14b4" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Center text */}
              <div className="text-center z-10">
                <p className="text-4xl font-body font-bold text-[#2a14b4] leading-none">
                  {progressPercent}%
                </p>
                <p className="text-[10px] font-body uppercase tracking-[0.15em] text-[#777586] mt-2 font-bold">
                  {t("progress")}
                </p>
                <p className="text-xs text-[#464554] mt-1 font-medium">
                  {learnedCount} / {totalCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Vocabulary Collection ── */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">dictionary</span>
            </div>
            <h2 className="text-2xl font-body font-bold text-[#121c2a]">
              {t("vocabularyCollection")}
            </h2>
          </div>
          <span className="text-[10px] font-body uppercase tracking-[0.2em] text-[#777586] font-bold">
            {t("items", { count: totalCount })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(topic.vocabulary as VocabItem[]).map((vocab, idx) => {
            const isLearned = learnedSet.has(vocab.id);
            return (
              <div
                key={vocab.id}
                className={`group relative rounded-2xl p-6 transition-all duration-300 border ${
                  isLearned
                    ? "bg-white border-[#a6f2d1]/40 shadow-[0_4px_24px_rgba(18,28,42,0.06)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.1)]"
                    : "bg-white/60 border-[#e2e8f0] shadow-[0_2px_12px_rgba(18,28,42,0.03)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.08)] hover:border-[#c7c4d7]/40"
                }`}
              >
                {/* Top row: number + status */}
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {isLearned ? (
                    <span
                      className="material-symbols-outlined text-[18px] text-[#1b6b51]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <span className="w-[18px] h-[18px] rounded-full border-2 border-[#d9e3f6]" />
                  )}
                </div>

                {/* Word */}
                <h3 className="text-xl font-body font-bold text-[#121c2a] mb-2 leading-tight">
                  {vocab.word}
                </h3>

                {/* Meaning */}
                <p className="text-sm text-[#464554] leading-relaxed mb-4">{vocab.meaning}</p>

                {/* Example */}
                {vocab.example && (
                  <div className="pt-4 border-t border-[#e2e8f0]/60">
                    <p className="text-[10px] font-body uppercase tracking-[0.15em] text-[#2a14b4]/50 font-bold mb-1">
                      {t("example")}
                    </p>
                    <p className="text-xs font-body text-[#464554] italic leading-relaxed">
                      &ldquo;{vocab.example}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Practice Tests Section ── */}
      {topic.practiceTests.length > 0 && (
        <section className="relative bg-white rounded-3xl overflow-hidden ambient-shadow">
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#2a14b4]/[0.04] to-transparent" />

          <div className="relative z-10 p-8 md:p-12">
            {/* Section header */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#121c2a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-white">quiz</span>
              </div>
              <h2 className="text-2xl font-body font-bold text-[#121c2a]">
                {t("testKnowledge")}
              </h2>
            </div>
            <p className="text-sm font-body text-[#777586] mb-8 ml-14">
              {t("testDescription")}
            </p>

            {/* Test cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {(topic.practiceTests as PracticeTestItem[]).map((test) => {
                const result = resultsByTest.get(test.id);
                const score = result ? Math.round(result.score) : null;
                return (
                  <div
                    key={test.id}
                    className="bg-[#f8f9ff] rounded-2xl p-6 border border-[#e2e8f0] hover:border-[#c7c4d7]/50 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(18,28,42,0.06)]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">assignment</span>
                      </div>
                      {score !== null && (
                        <div className={`px-3 py-1 rounded-full text-xs font-body font-bold ${
                          score >= 80
                            ? "bg-[#a6f2d1]/30 text-[#1b6b51]"
                            : score >= 50
                            ? "bg-[#fef3c7] text-[#92400e]"
                            : "bg-[#ffdada]/50 text-[#7b0020]"
                        }`}>
                          {score}%
                        </div>
                      )}
                    </div>

                    <h4 className="font-body font-bold text-[#121c2a] mb-1">{test.title}</h4>
                    <p className="text-[10px] font-body uppercase tracking-[0.15em] text-[#777586] font-bold">
                      {t("questionsCount", { count: test._count.questions })}
                    </p>

                    {score !== null && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-[#777586]">emoji_events</span>
                        <span className="text-[10px] font-body uppercase tracking-[0.15em] text-[#777586] font-bold">
                          {t("bestAttempt")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action */}
            {allLearned ? (
              <Link
                href={`/topics/${topicId}/practice`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#121c2a] text-white rounded-full font-body font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#121c2a]/10"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                {t("retakeAssessment")}
              </Link>
            ) : (
              <div className="flex items-center gap-3 text-[#777586]">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <p className="text-xs font-body uppercase tracking-[0.15em] font-bold">
                  {t("learnAllWordsFirst")}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Bookmarked Questions ── */}
      {bookmarks.length > 0 && (
        <section className="mt-12 relative bg-white rounded-3xl overflow-hidden ambient-shadow">
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#fef3c7] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
              </div>
              <h2 className="text-2xl font-body font-bold text-[#121c2a]">{t("bookmarkedQuestions")}</h2>
            </div>
            <div className="space-y-3">
              {bookmarks.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 bg-[#f8f9ff] rounded-xl p-4 border border-[#e2e8f0]">
                  {b.question.contentMediaUrl && b.question.contentMediaType === "image" ? (
                    <img src={b.question.contentMediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : b.question.contentMediaType === "audio" ? (
                    <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[#1b6b51]">headphones</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                      <span className="font-body font-bold text-xs text-[#2a14b4]">Q{b.question.questionNumber}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-[#121c2a] truncate">{b.question.content}</p>
                    <p className="text-[10px] font-body text-[#777586]">{b.question.practiceTest.title}</p>
                  </div>
                  <span className="text-xs font-body font-medium text-[#1b6b51] bg-[#a6f2d1]/30 px-2.5 py-1 rounded-full shrink-0">
                    {b.question.correctAnswer}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
