import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ExamStatusBadge from "@/components/exam/ExamStatusBadge";

export const metadata: Metadata = {
  title: "My Results",
  description: "View your test results and teacher feedback.",
};

export default async function StudentResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("student");

  const results = await prisma.practiceResult.findMany({
    where: { userId: session.user.id },
    orderBy: { completedAt: "desc" },
    include: {
      practiceTest: {
        select: { id: true, title: true, topic: { select: { title: true } } },
      },
      examSession: {
        select: { status: true, attemptNumber: true },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">assessment</span>
        </div>
        <h1 className="text-2xl font-body font-bold text-[#121c2a]">{t("myResults")}</h1>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-[#c7c4d7] block mb-4">quiz</span>
          <p className="text-base font-body text-[#777586]">No test results yet</p>
          <p className="text-sm font-body text-[#c7c4d7] mt-1">Complete a test to see your results here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r: any) => {
            const score = Math.round(r.score);
            const sessionStatus = r.examSession?.status || "GRADED";
            return (
              <Link
                key={r.id}
                href={`/results/${r.id}`}
                className="block bg-white rounded-xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)]
                  hover:shadow-[0_8px_24px_rgba(94,53,241,0.06)] transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-body font-bold text-base text-[#121c2a] truncate">
                        {r.practiceTest.title}
                      </h3>
                      <ExamStatusBadge testStatus="ACTIVE" sessionStatus={sessionStatus} />
                    </div>
                    <p className="text-xs font-body text-[#777586]">
                      {r.practiceTest.topic.title}
                      {r.examSession?.attemptNumber > 1 && ` · Attempt ${r.examSession.attemptNumber}`}
                      {" · "}
                      {new Date(r.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className={`text-2xl font-body font-bold ${
                      score >= 80 ? "text-[#1b6b51]" : score >= 50 ? "text-[#2a14b4]" : "text-[#7b0020]"
                    }`}>
                      {score}%
                    </div>
                    <span className="material-symbols-outlined text-[#c7c4d7] text-[18px]">
                      chevron_right
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
