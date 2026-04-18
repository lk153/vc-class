"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tLang } from "@/lib/i18n/tLang";
import StudentDetailModal from "@/components/teacher/StudentDetailModal";
import ModalOverlay from "@/components/ModalOverlay";

type AssignedTopic = {
  id: string;
  assignmentId: string;
  title: string;
  languageName: string;
  createdBy: string;
  assignedAt: string;
};

type ClassTopicGroup = {
  className: string;
  topics: AssignedTopic[];
};

type Student = {
  id: string;
  name: string;
  email: string;
  status: string;
  languageId: string | null;
  languageName: string;
  topicCount: number;
  classTopics: ClassTopicGroup[];
  createdAt: string;
};

export default function StudentTable({ students }: { students: Student[] }) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const allSelected = students.length > 0 && selectedIds.size === students.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map((s) => s.id)));
  }
  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        toast.error(t("studentDeleteFailed"));
        return;
      }
      const { deleted } = await res.json();
      toast.success(t("studentDeleteSuccess", { count: deleted }));
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      router.refresh();
    } catch {
      toast.error(t("studentDeleteFailed"));
    } finally {
      setBulkDeleting(false);
    }
  }

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "ACTIVE").length;

  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="relative bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">group</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#121c2a] leading-none">{totalStudents}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("totalEnrolled")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2a14b4]/10"><div className="h-full w-full bg-[#2a14b4] rounded-full" /></div>
        </div>
        <div className="relative bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#1b6b51]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-body font-bold text-2xl text-[#1b6b51] leading-none">{activeStudents}</p>
                <span className="w-2 h-2 rounded-full bg-[#1b6b51] animate-pulse" />
              </div>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("active")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1b6b51]/10"><div className="h-full w-full bg-[#1b6b51] rounded-full" /></div>
        </div>
        <div className="relative bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#d9e3f6] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#777586]">person_off</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#777586] leading-none">{totalStudents - activeStudents}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("inactive")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#777586]/10"><div className="h-full w-full bg-[#777586] rounded-full" /></div>
        </div>
        <div className="relative bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">menu_book</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#2a14b4] leading-none">
                {totalStudents > 0
                  ? (students.reduce((sum, s) => sum + s.topicCount, 0) / totalStudents).toFixed(1)
                  : "0"}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("avgTopics")}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2a14b4]/10"><div className="h-full w-full bg-[#2a14b4] rounded-full" /></div>
        </div>
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-[#ffdada]/20 rounded-2xl">
          <span className="text-sm font-body font-medium text-[#7b0020]">
            {selectedIds.size} {t("selected")}
          </span>
          <button
            type="button"
            onClick={() => setShowBulkDelete(true)}
            className="inline-flex items-center gap-2 bg-[#7b0020] text-white px-5 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#7b0020]/15 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {t("bulkDeleteStudents")} ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {students.length === 0 ? (
          <div className="bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] px-6 py-12 text-center text-[#777586]">
            {t("noStudentsYet")}
          </div>
        ) : (
          students.map((s) => {
            const isInactive = s.status !== "ACTIVE";
            const initials = s.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2);

            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStudent(s)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStudent(s); } }}
                className={`w-full text-left bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-4 cursor-pointer hover:bg-[#e3dfff]/50 transition-colors duration-200 ${
                  selectedIds.has(s.id) ? "bg-[#e3dfff]/30" : ""
                } ${isInactive ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20 shrink-0"
                  />
                  <div className={`w-10 h-10 rounded-full bg-[#e3dfff] flex items-center justify-center shrink-0 ${isInactive ? "grayscale" : ""}`}>
                    <span className="font-body text-sm text-[#2a14b4]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-[#121c2a] truncate">{s.name}</p>
                    <p className="text-xs text-[#777586] font-body truncate">{s.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-body font-bold shrink-0 ${
                      s.status === "ACTIVE"
                        ? "bg-[#a6f2d1]/40 text-[#1b6b51]"
                        : "bg-[#d9e3f6] text-[#777586]"
                    }`}
                  >
                    {s.status === "ACTIVE" ? t("active") : t("inactive")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#464554] font-body">
                  <span>{t("joinedDate", { date: (() => { const d = new Date(s.createdAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })() })}</span>
                  {s.languageName && <span>• {tLang(t, s.languageName)}</span>}
                  <span className="ml-auto font-body text-sm text-[#2a14b4]">{s.topicCount} {t("topicsCount")}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#c7c4d7]/20">
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                />
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("studentName")}</th>
              <th className="px-6 py-4 text-left text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("emailCol")}</th>
              <th className="px-6 py-4 text-left text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("statusCol")}</th>
              <th className="px-6 py-4 text-left text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("languageCol")}</th>
              <th className="px-6 py-4 text-center text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("topics")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c7c4d7]/10">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#777586]">
                  {t("noStudentsYet")}
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const isInactive = s.status !== "ACTIVE";
                const initials = s.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2);

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={`transition-colors duration-200 cursor-pointer ${
                      selectedIds.has(s.id) ? "bg-[#e3dfff]/30" : "hover:bg-[#e3dfff]/50"
                    } ${isInactive ? "opacity-60" : ""}`}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-[#e3dfff] flex items-center justify-center shrink-0 ${isInactive ? "grayscale" : ""}`}>
                          <span className="font-body text-sm text-[#2a14b4]">{initials}</span>
                        </div>
                        <div>
                          <p className="font-body font-medium text-[#121c2a]">{s.name}</p>
                          <p className="text-xs text-[#777586] font-body">
                            {t("joinedDate", { date: (() => { const d = new Date(s.createdAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })() })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#464554] font-body">{s.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-[#a6f2d1]/40 text-[#1b6b51]"
                            : "bg-[#d9e3f6] text-[#777586]"
                        }`}
                      >
                        {s.status === "ACTIVE" ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#464554] font-body">{tLang(t, s.languageName)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-body text-lg text-[#2a14b4]">{s.topicCount}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onDeleted={() => {
            setSelectedStudent(null);
            router.refresh();
          }}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <ModalOverlay
        open={showBulkDelete}
        onClose={() => !bulkDeleting && setShowBulkDelete(false)}
        panelClass="max-w-md"
      >
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffdada]/40 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#7b0020]">delete_forever</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {t("studentDeleteConfirmTitle")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-8 leading-relaxed">
            {t("studentDeleteConfirmMessage", { count: selectedIds.size })}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setShowBulkDelete(false)}
              disabled={bulkDeleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#7b0020] hover:bg-[#5c0017] shadow-lg shadow-[#7b0020]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkDeleting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {ct("delete")}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
