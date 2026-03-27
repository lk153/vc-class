import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ResultCommentSection from "@/components/teacher/ResultCommentSection";

export default async function StudentResultDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/topics");

  const t = await getTranslations("teacher");
  const { resultId } = await params;

  const result = await prisma.practiceResult.findUnique({
    where: { id: resultId },
    include: {
      user: { select: { name: true, email: true } },
      practiceTest: {
        include: {
          topic: { include: { language: true } },
          questions: { orderBy: { questionNumber: "asc" } },
        },
      },
      studentAnswers: {
        include: { question: true },
        orderBy: { question: { questionNumber: "asc" } },
      },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!result) notFound();

  const initials = result.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/teacher/student-results"
        className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4] transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t("backToResults")}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-[#e3dfff] flex items-center justify-center text-base sm:text-lg font-bold text-[#2a14b4] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#121c2a] truncate">
              {result.user.name}
            </h1>
            <p className="text-sm font-body text-[#777586] truncate">{result.user.email}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-3 py-1.5 rounded-full w-fit shrink-0">
          {result.practiceTest.topic.language.name}
        </span>
      </div>

      {/* Test info + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("testNameCol")}
          </p>
          <p className="font-headline text-lg text-[#121c2a] font-semibold">
            {result.practiceTest.title}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("topicCol")}
          </p>
          <p className="font-headline text-lg text-[#121c2a] font-semibold">
            {result.practiceTest.topic.title}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("scoreCol")}
          </p>
          <p
            className={`font-headline text-3xl font-bold ${
              result.score >= 80
                ? "text-[#1b6b51]"
                : result.score >= 50
                ? "text-[#2a14b4]"
                : "text-[#7b0020]"
            }`}
          >
            {Math.round(result.score)}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("submittedDate")}
          </p>
          <p className="font-headline text-lg text-[#121c2a]">
            {new Date(result.completedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Answer Details */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] overflow-hidden overflow-x-auto">
        <div className="px-6 py-4 border-b border-[#c7c4d7]/15">
          <h2 className="font-headline text-xl font-bold text-[#121c2a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4]">fact_check</span>
            {t("answerDetails")}
            <span className="text-sm font-body font-normal text-[#777586] ml-1">
              {result.correctCount}/{result.totalQuestions} {t("correctCol").toLowerCase()}
            </span>
          </h2>
        </div>
        <table className="w-full text-left min-w-[550px]">
          <thead>
            <tr className="bg-[#eff4ff]/50 text-[10px] font-bold uppercase tracking-[0.1em] text-[#464554]/70">
              <th className="px-6 py-3 w-12">#</th>
              <th className="px-6 py-3">{t("question")}</th>
              <th className="px-6 py-3">{t("studentAnswer")}</th>
              <th className="px-6 py-3">{t("correctAnswer")}</th>
              <th className="px-6 py-3 text-center">{t("resultCol")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c7c4d7]/10">
            {result.studentAnswers.map((sa: { id: string; isCorrect: boolean; selectedAnswer: string; question: { questionNumber: number; content: string; correctAnswer: string } }) => (
              <tr
                key={sa.id}
                className={`transition-colors ${
                  sa.isCorrect ? "hover:bg-[#a6f2d1]/10" : "hover:bg-[#ffdada]/10"
                }`}
              >
                <td className="px-6 py-3.5 text-sm font-body text-[#777586]">
                  Q{sa.question.questionNumber}
                </td>
                <td className="px-6 py-3.5 text-sm font-body text-[#121c2a]">
                  {sa.question.content}
                </td>
                <td className="px-6 py-3.5 text-sm font-body font-medium">
                  <span className={sa.isCorrect ? "text-[#1b6b51]" : "text-[#7b0020]"}>
                    {sa.selectedAnswer}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm font-body text-[#1b6b51] font-medium">
                  {sa.question.correctAnswer}
                </td>
                <td className="px-6 py-3.5 text-center">
                  {sa.isCorrect ? (
                    <span className="material-symbols-outlined text-[#1b6b51] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[#7b0020] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      cancel
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Teacher Feedback / Comments */}
      <ResultCommentSection
        resultId={resultId}
        comments={result.comments.map((c: { id: string; content: string; user: { name: string }; createdAt: Date }) => ({
          id: c.id,
          content: c.content,
          userName: c.user.name,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
