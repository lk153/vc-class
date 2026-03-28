import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

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
          <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-2">
            {t("practiceTests")}
          </h1>
          <p className="text-lg font-headline italic text-[#464554] opacity-80">
            Create and manage assessment modules for your students.
          </p>
        </div>
        <Link
          href="/teacher/practice-tests/import"
          className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          {t("importTest")}
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">quiz</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#121c2a] leading-none">{tests.length}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Total Tests</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">help</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#2a14b4] leading-none">{totalQuestions}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Total Questions</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#1b6b51]">topic</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#1b6b51] leading-none">
              {new Set(tests.map((t: { topicId: string }) => t.topicId)).size}
            </p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Topics Covered</p>
          </div>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#eff4ff] flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[#2a14b4] text-3xl">quiz</span>
          </div>
          <h2 className="font-headline text-2xl text-[#121c2a] mb-2">No tests yet</h2>
          <p className="text-[#777586] font-body mb-6">Import your first practice test via CSV.</p>
          <Link
            href="/teacher/practice-tests/import"
            className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            {t("importTest")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test: any) => (
            <Link
              key={test.id}
              href={`/teacher/practice-tests/${test.id}`}
              className="group bg-white rounded-xl ambient-shadow p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_30px_60px_rgba(18,28,42,0.1)] block border border-transparent hover:border-[#2a14b4]/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2a14b4]">quiz</span>
                </div>
                <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                  {test.topic.language.name}
                </span>
              </div>

              <h3 className="font-headline text-2xl text-[#121c2a] mb-1 group-hover:text-[#2a14b4] transition-colors">
                {test.title}
              </h3>
              <p className="text-sm text-[#464554] font-body font-headline italic mb-6">
                {test.topic.title}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[#c7c4d7]/15">
                <div className="flex gap-6">
                  <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                    <span className="material-symbols-outlined text-[14px]">help</span>
                    {test._count.questions} questions
                  </div>
                </div>
                <span className="text-xs font-body text-[#2a14b4] opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
