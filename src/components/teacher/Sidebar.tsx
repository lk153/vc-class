"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/teacher", icon: "dashboard", labelKey: "teacher.dashboard" },
  { href: "/teacher/classes", icon: "school", labelKey: "teacher.classes" },
  { href: "/teacher/students", icon: "group", labelKey: "teacher.students" },
  { href: "/teacher/topics", icon: "menu_book", labelKey: "teacher.topics" },
  { href: "/teacher/assignments", icon: "assignment", labelKey: "teacher.assignments" },
  { href: "/teacher/practice-tests", icon: "quiz", labelKey: "teacher.practiceTests" },
  { href: "/teacher/media", icon: "perm_media", labelKey: "teacher.media" },
  { href: "/teacher/student-results", icon: "assessment", labelKey: "teacher.studentResults" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function TeacherSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#eff4ff] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-6 pt-8 pb-6 flex items-start justify-between">
          <div>
            <Link href="/teacher" className="text-2xl font-body text-[#4338ca]">
              {t("common.appName")}
            </Link>
            <p className="text-[10px] font-body uppercase tracking-[0.2em] text-[#464554] opacity-60 mt-1">
              {t("teacher.teacherPortal")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#777586] hover:text-[#121c2a] transition-colors mt-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Create New Topic */}
        <div className="px-4 mb-4">
          <Link
            href="/teacher/topics"
            onClick={onClose}
            className="w-full py-3 bg-[#2a14b4] text-white rounded-full font-body font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2a14b4]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t("teacher.createNewTopic")}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/teacher"
                ? pathname === "/teacher"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-body transition-all duration-300 ${
                  isActive
                    ? "bg-white rounded-r-full text-[#2a14b4] font-bold shadow-sm"
                    : "text-[#121c2a] hover:text-[#2a14b4] rounded-r-full"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
