import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import PracticeTestGrid from "@/components/teacher/PracticeTestGrid";

export default async function PracticeTestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const tests = await prisma.practiceTest.findMany({
    where: { createdById: session.user.id },
    include: {
      topic: { include: { language: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalQuestions = tests.reduce((sum: number, t: { _count: { questions: number } }) => sum + t._count.questions, 0);

  return (
    <div>
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
            {t("practiceTests")}
          </h1>
          <p className="text-lg font-body text-[#464554] opacity-80">
            {t("practiceTestsSubtitle")}
          </p>
        </div>
        <Link
          href="/teacher/practice-tests/import"
          className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          {t("importTest")}
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">quiz</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#121c2a] leading-none">{tests.length}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("totalTests")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2a14b4]/10"><div className="h-full w-full bg-[#2a14b4] rounded-full" /></div>
        </div>
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">help</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#2a14b4] leading-none">{totalQuestions}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("totalQuestions")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2a14b4]/10"><div className="h-full w-full bg-[#2a14b4] rounded-full" /></div>
        </div>
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#1b6b51]">topic</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#1b6b51] leading-none">
                {new Set(tests.map((t: { topicId: string }) => t.topicId)).size}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("topicsCovered")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1b6b51]/10"><div className="h-full w-full bg-[#1b6b51] rounded-full" /></div>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#eff4ff] flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[#2a14b4] text-3xl">quiz</span>
          </div>
          <h2 className="font-body font-bold text-2xl text-[#121c2a] mb-2">{t("noTestsYet")}</h2>
          <p className="text-[#777586] font-body mb-6">{t("noTestsDescription")}</p>
          <Link
            href="/teacher/practice-tests/import"
            className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            {t("importTest")}
          </Link>
        </div>
      ) : (
        <PracticeTestGrid
          tests={tests.map((test: any) => ({
            id: test.id,
            title: test.title,
            topicTitle: test.topic.title,
            languageName: test.topic.language.name,
            questionCount: test._count.questions,
            status: test.status,
          }))}
        />
      )}
    </div>
  );
}
