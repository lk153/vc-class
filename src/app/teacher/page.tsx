import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  // Get student IDs enrolled in this teacher's classes
  const enrollments = await prisma.classEnrollment.findMany({
    where: { class: { teacherId: session.user.id } },
    include: { user: { select: { id: true, status: true } } },
  });
  const studentMap = new Map<string, { id: string; status: string }>(enrollments.map((e: { userId: string; user: { id: string; status: string } }) => [e.userId, e.user]));
  const uniqueStudents = [...studentMap.values()];
  const totalStudents = uniqueStudents.length;
  const activeStudents = uniqueStudents.filter((s: { status: string }) => s.status === "ACTIVE").length;

  const [totalTopics, recentResults] = await Promise.all([
    prisma.topic.count({ where: { createdById: session.user.id } }),
    prisma.practiceResult.findMany({
      where: {
        userId: { in: uniqueStudents.map((s: { id: string }) => s.id) },
      },
      take: 10,
      orderBy: { completedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        practiceTest: {
          select: {
            title: true,
            topic: { select: { title: true, language: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const stats = [
    {
      label: t("totalStudents"),
      value: totalStudents,
      icon: "group",
      iconBg: "bg-[#e3dfff]",
      iconColor: "text-[#2a14b4]",
      barColor: "bg-[#2a14b4]",
      barBg: "bg-[#2a14b4]/10",
    },
    {
      label: t("activeStudents"),
      value: activeStudents,
      icon: "verified",
      iconBg: "bg-[#a6f2d1]/40",
      iconColor: "text-[#1b6b51]",
      barColor: "bg-[#1b6b51]",
      barBg: "bg-[#1b6b51]/10",
    },
    {
      label: t("totalTopics"),
      value: totalTopics,
      icon: "menu_book",
      iconBg: "bg-[#ffdada]/40",
      iconColor: "text-[#7b0020]",
      barColor: "bg-[#7b0020]",
      barBg: "bg-[#7b0020]/10",
    },
  ];

  function getScoreColor(score: number) {
    if (score >= 90) return "text-[#1b6b51]";
    if (score >= 70) return "text-[#2a14b4]";
    return "text-[#7b0020]";
  }

  function getScoreDot(score: number) {
    if (score >= 90) return "bg-[#1b6b51]";
    if (score >= 70) return "bg-[#2a14b4]";
    return "bg-[#7b0020]";
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="font-body font-bold text-3xl text-[#121c2a]">{t("dashboard")}</h1>
        <p className="text-[#464554] font-body mt-1">{t("dashboardSubtitle")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined text-[20px] ${stat.iconColor}`}>{stat.icon}</span>
              </div>
              <div>
                <p className="font-body font-bold text-2xl text-[#121c2a] leading-none">{stat.value}</p>
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">
                  {stat.label}
                </p>
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-[3px] ${stat.barBg}`}><div className={`h-full w-full ${stat.barColor} rounded-full`} /></div>
          </div>
        ))}
      </div>

      {/* Recent Results Table */}
      <div className="bg-white rounded-xl ambient-shadow p-4 md:p-8">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-body font-bold text-2xl text-[#121c2a]">{t("recentResults")}</h2>
          <Link
            href="/teacher/student-results"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-body font-bold text-[#2a14b4] bg-[#eff4ff] hover:bg-[#2a14b4] hover:text-white transition-all"
          >
            {t("viewAll")}
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </Link>
        </div>

        {recentResults.length === 0 ? (
          <p className="text-sm text-[#777586] font-body">{t("noResultsYet")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-[#c7c4d7]/20">
                  <th className="text-left py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("studentName")}
                  </th>
                  <th className="text-left py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("testNameCol")}
                  </th>
                  <th className="text-left py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("topicCol")}
                  </th>
                  <th className="text-left py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("languageCol")}
                  </th>
                  <th className="text-right py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("scoreCol")}
                  </th>
                  <th className="text-right py-3 text-sm font-body uppercase tracking-widest text-[#464554] font-extrabold">
                    {t("submittedDate")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c7c4d7]/10">
                {recentResults.map((result: any) => {
                  const score = Math.round(result.score);
                  const initials = (result.user.name as string)
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2);
                  return (
                    <tr
                      key={result.id}
                      className="group hover:bg-[#eff4ff]/30 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e3dfff] flex items-center justify-center">
                            <span className="font-body text-sm text-[#2a14b4]">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="font-body font-medium text-[#121c2a]">{result.user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-[#464554] font-body">{result.practiceTest.title}</td>
                      <td className="py-4 text-[#464554] font-body">{result.practiceTest.topic.title}</td>
                      <td className="py-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-3 py-1 rounded-full">
                          {result.practiceTest.topic.language.name}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`w-2 h-2 rounded-full ${getScoreDot(score)}`} />
                          <span className={`font-body text-lg ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-right text-[#777586] font-body text-xs">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
