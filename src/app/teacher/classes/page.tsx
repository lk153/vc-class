import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

function formatSchedule(schedule: string): string {
  try {
    const sessions = JSON.parse(schedule);
    if (Array.isArray(sessions)) {
      return sessions
        .filter((s: { day?: string; startTime?: string; endTime?: string }) => s.day && s.startTime && s.endTime)
        .map((s: { day: string; startTime: string; endTime: string }) => `${s.day} ${s.startTime}–${s.endTime}`)
        .join(" | ");
    }
  } catch { /* legacy text */ }
  return schedule;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  SCHEDULING: { label: "Scheduling", bg: "bg-[#d9e3f6]", text: "text-[#464554]" },
  ACTIVE: { label: "Active", bg: "bg-[#a6f2d1]/40", text: "text-[#1b6b51]" },
  ENDED: { label: "Ended", bg: "bg-[#ffdada]/40", text: "text-[#7b0020]" },
  ARCHIVED: { label: "Archived", bg: "bg-[#d9e3f6]/50", text: "text-[#777586]" },
};

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      language: true,
      _count: { select: { enrollments: true, topicAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = classes.filter((c) => c.status === "ACTIVE").length;
  const totalStudents = classes.reduce((sum, c) => sum + c._count.enrollments, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-2">
            {t("classes")}
          </h1>
          <p className="text-lg font-headline italic text-[#464554] opacity-80">
            Manage your classes and student enrollments.
          </p>
        </div>
        <Link
          href="/teacher/classes/create"
          className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("createClass")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">school</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#121c2a] leading-none">{classes.length}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Total Classes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#1b6b51]">verified</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-headline text-2xl text-[#1b6b51] leading-none">{activeCount}</p>
              {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-[#1b6b51] animate-pulse" />}
            </div>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Active Classes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">group</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#2a14b4] leading-none">{totalStudents}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">Total Enrolled</p>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#eff4ff] flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[#2a14b4] text-3xl">school</span>
          </div>
          <h2 className="font-headline text-2xl text-[#121c2a] mb-2">{t("noClasses")}</h2>
          <p className="text-[#777586] font-body mb-6">{t("noClassesDescription")}</p>
          <Link
            href="/teacher/classes/create"
            className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t("createClass")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const status = statusConfig[cls.status] || statusConfig.SCHEDULING;
            const weeks = Math.ceil(
              (new Date(cls.endDate).getTime() - new Date(cls.startDate).getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            );

            return (
              <Link
                key={cls.id}
                href={`/teacher/classes/${cls.id}`}
                className="group bg-white rounded-xl ambient-shadow p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_30px_60px_rgba(18,28,42,0.1)] block border border-transparent hover:border-[#2a14b4]/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#2a14b4]">school</span>
                  </div>
                  <span className={`text-[10px] font-body font-bold uppercase tracking-widest px-3 py-1 rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="font-headline text-xl text-[#121c2a] mb-1 group-hover:text-[#2a14b4] transition-colors line-clamp-2">
                  {cls.name}
                </h3>
                <p className="text-sm text-[#464554] font-body mb-4">
                  {cls.language.name} · {cls.level}
                </p>

                <div className="space-y-2 text-xs text-[#777586] font-body mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {formatSchedule(cls.schedule)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">date_range</span>
                    {weeks} weeks
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#c7c4d7]/15">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {cls._count.enrollments}/{cls.maxStudents}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                      <span className="material-symbols-outlined text-[14px]">menu_book</span>
                      {cls._count.topicAssignments} topics
                    </div>
                  </div>
                  <span className="text-xs font-body text-[#2a14b4] opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
