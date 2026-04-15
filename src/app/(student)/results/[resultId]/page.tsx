import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Test Result",
  description: "View your test result details and teacher feedback.",
};

export default async function StudentResultDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { resultId } = await params;
  const t = await getTranslations("student");

  const result = await prisma.practiceResult.findUnique({
    where: { id: resultId, userId: session.user.id },
    include: {
      practiceTest: {
        select: { id: true, title: true, topicId: true, topic: { select: { title: true } } },
      },
      studentAnswers: {
        include: {
          question: {
            select: {
              questionNumber: true,
              content: true,
              questionType: true,
              correctAnswer: true,
              explanation: true,
              difficulty: true,
              sectionId: true,
            },
          },
        },
        orderBy: { question: { questionNumber: "asc" } },
      },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      examSession: {
        select: { status: true, attemptNumber: true, gradedAt: true },
      },
    },
  });

  if (!result) notFound();

  const score = Math.round(result.score);
  const isGraded = result.examSession?.status === "GRADED";

  // Attempt history — all attempts for this test
  const allAttempts = await prisma.practiceResult.findMany({
    where: {
      userId: session.user.id,
      practiceTestId: result.practiceTest.id,
    },
    orderBy: { completedAt: "asc" },
    select: {
      id: true,
      score: true,
      completedAt: true,
      examSession: { select: { attemptNumber: true } },
    },
  });

  // Time spent per section (group by sectionId via question)
  const timeBySection = new Map<string, { label: string; time: number }>();
  let totalTimeSpent = 0;
  result.studentAnswers.forEach((sa: any) => {
    const time = sa.timeSpent || 0;
    totalTimeSpent += time;
    const sectionKey = sa.question.sectionId || "general";
    if (!timeBySection.has(sectionKey)) {
      timeBySection.set(sectionKey, { label: sectionKey === "general" ? "General" : `Section`, time: 0 });
    }
    timeBySection.get(sectionKey)!.time += time;
  });

  // Difficulty breakdown
  const byDifficulty = [1, 2, 3].map((d) => {
    const qs = result.studentAnswers.filter((sa: any) => (sa.question.difficulty ?? 1) === d);
    const correct = qs.filter((sa: any) => sa.isCorrect).length;
    return { level: d, label: d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard", total: qs.length, correct };
  }).filter((d) => d.total > 0);

  // Question type breakdown
  const typeMap = new Map<string, { correct: number; total: number }>();
  result.studentAnswers.forEach((sa: any) => {
    const type = sa.question.questionType;
    if (!typeMap.has(type)) typeMap.set(type, { correct: 0, total: 0 });
    const entry = typeMap.get(type)!;
    entry.total++;
    if (sa.isCorrect) entry.correct++;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/results" className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#121c2a] mb-6">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        {t("myResults")}
      </Link>

      {/* Score hero */}
      <div className="text-center mb-8">
        <h1 className="font-body text-xl font-bold text-[#121c2a] mb-1">{result.practiceTest.title}</h1>
        <p className="text-sm font-body text-[#777586] mb-4">
          {result.practiceTest.topic.title}
          {result.examSession?.attemptNumber && result.examSession.attemptNumber > 1 && ` · Attempt ${result.examSession.attemptNumber}`}
        </p>
        <p className={`text-5xl font-body font-bold mb-2 ${
          score >= 80 ? "text-[#1b6b51]" : score >= 50 ? "text-[#2a14b4]" : "text-[#7b0020]"
        }`}>
          {score}%
        </p>
        <p className="text-base font-body text-[#777586]">
          {result.correctCount} / {result.totalQuestions} correct
        </p>
      </div>

      {/* Analytics */}
      {byDifficulty.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4">
          <h3 className="text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">bar_chart</span>
            By Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {byDifficulty.map((d) => (
              <div key={d.level} className="text-center">
                <p className="text-lg font-body font-bold text-[#121c2a]">
                  {d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0}%
                </p>
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">
                  {d.label}
                </p>
                <p className="text-xs font-body text-[#c7c4d7]">{d.correct}/{d.total}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeMap.size > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4">
          <h3 className="text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">category</span>
            By Question Type
          </h3>
          <div className="space-y-2">
            {Array.from(typeMap.entries()).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs font-body text-[#464554]">
                  {type.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-body font-bold text-[#121c2a]">
                  {data.correct}/{data.total} ({Math.round((data.correct / data.total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time distribution */}
      {totalTimeSpent > 0 && timeBySection.size > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4">
          <h3 className="text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">schedule</span>
            Time Distribution
          </h3>
          <div className="space-y-2">
            {Array.from(timeBySection.entries()).map(([key, data]) => {
              const pct = totalTimeSpent > 0 ? Math.round((data.time / totalTimeSpent) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs font-body mb-1">
                    <span className="text-[#464554]">{data.label}</span>
                    <span className="text-[#121c2a] font-bold">{pct}% ({Math.round(data.time / 60)}m)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#f1ecf6]">
                    <div className="h-full rounded-full bg-[#5e35f1]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attempt history */}
      {allAttempts.length > 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4">
          <h3 className="text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">trending_up</span>
            Attempt History
          </h3>
          <div className="space-y-2">
            {allAttempts.map((attempt: any) => {
              const attemptScore = Math.round(attempt.score);
              const isCurrent = attempt.id === result.id;
              return (
                <div
                  key={attempt.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    isCurrent ? "bg-[#e3dfff]/30 ring-1 ring-[#5e35f1]/20" : "bg-[#f8f9ff]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-body font-bold text-[#777586]">
                      Attempt {attempt.examSession?.attemptNumber || "—"}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-body font-bold text-[#5e35f1] bg-[#e3dfff] px-1.5 py-0.5 rounded">Current</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-body font-bold ${
                      attemptScore >= 80 ? "text-[#1b6b51]" : attemptScore >= 50 ? "text-[#2a14b4]" : "text-[#7b0020]"
                    }`}>
                      {attemptScore}%
                    </span>
                    <span className="text-xs font-body text-[#c7c4d7]">
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Answer review */}
      <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(18,28,42,0.04)] overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-[#c7c4d7]/15">
          <h3 className="font-body font-bold text-base text-[#121c2a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4] text-[18px]">fact_check</span>
            Answer Review
          </h3>
        </div>
        <div className="divide-y divide-[#c7c4d7]/10">
          {result.studentAnswers.map((sa: any) => {
            const effectiveCorrect = sa.teacherOverride !== null ? sa.teacherOverride : sa.isCorrect;
            return (
              <div key={sa.id} className={`px-5 py-4 ${!effectiveCorrect ? "bg-[#ffdada]/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    effectiveCorrect ? "bg-[#a6f2d1]/30 text-[#1b6b51]" : "bg-[#ffdada]/30 text-[#7b0020]"
                  }`}>
                    {sa.question.questionNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-[#121c2a] font-medium mb-2">{sa.question.content}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-body">
                      <span className={effectiveCorrect ? "text-[#1b6b51]" : "text-[#7b0020]"}>
                        Your answer: <strong>{sa.selectedAnswer || "(no answer)"}</strong>
                      </span>
                      {isGraded && !effectiveCorrect && (
                        <span className="text-[#1b6b51]">
                          Correct: <strong>{sa.question.correctAnswer}</strong>
                        </span>
                      )}
                    </div>

                    {/* Teacher feedback */}
                    {sa.teacherComment && (
                      <div className="mt-2 bg-[#f7f2fa] rounded-lg p-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-[#2a14b4] mt-0.5">chat</span>
                        <p className="text-xs font-body text-[#464554]">{sa.teacherComment}</p>
                      </div>
                    )}

                    {/* Explanation */}
                    {isGraded && sa.question.explanation && (
                      <div className="mt-2 bg-[#f8f9ff] rounded-lg p-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-[#777586] mt-0.5">lightbulb</span>
                        <p className="text-xs font-body text-[#777586]">{sa.question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test-level comments */}
      {result.comments.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4">
          <h3 className="font-body font-bold text-base text-[#121c2a] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4] text-[18px]">chat</span>
            Teacher Comments
          </h3>
          <div className="space-y-3">
            {result.comments.map((c: any) => (
              <div key={c.id} className="border-b border-[#c7c4d7]/15 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-body font-semibold text-[#121c2a]">{c.user.name}</span>
                  <span className="text-xs font-body text-[#777586]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-body text-[#464554]">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to topic */}
      <div className="text-center mt-8">
        <Link
          href={`/topics/${result.practiceTest.topicId}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-body font-bold text-white
            bg-[#2a14b4] hover:bg-[#4338ca] shadow-lg shadow-[#2a14b4]/15 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Topic
        </Link>
      </div>
    </div>
  );
}
