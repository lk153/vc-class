"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Topic = { id: string; title: string; languageName: string };
type ClassItem = {
  id: string;
  name: string;
  languageName: string;
  studentCount: number;
  assignedTopicIds: string[];
};
type AssignedItem = {
  id: string;
  className: string;
  classLanguageName: string;
  topicTitle: string;
  topicLanguageName: string;
  assignedAt: string;
};

type Props = { topics: Topic[]; classes: ClassItem[]; assigned: AssignedItem[] };

export default function AssignmentPanel({ topics, classes, assigned }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // Pagination for the Assigned list — 9 items per page (matches Topics page)
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Optimistic local removal so the row disappears instantly on unassign,
  // before router.refresh() round-trips.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const visibleAssigned = assigned.filter((a) => !removedIds.has(a.id));
  const totalPages = Math.max(1, Math.ceil(visibleAssigned.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedAssigned = visibleAssigned.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  async function handleUnassign(assignmentId: string, topicTitle: string) {
    setUnassigningId(assignmentId);
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("unassignFailed"));
        return;
      }
      toast.success(t("unassigned", { title: topicTitle }));
      setRemovedIds((prev) => new Set(prev).add(assignmentId));
      router.refresh();
    } catch {
      toast.error(t("unassignFailed"));
    } finally {
      setUnassigningId(null);
    }
  }

  function toggleTopic(id: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllClasses() {
    if (selectedClasses.size === classes.length) {
      setSelectedClasses(new Set());
    } else {
      setSelectedClasses(new Set(classes.map((c) => c.id)));
    }
  }

  async function handleAssign() {
    if (selectedTopics.size === 0 || selectedClasses.size === 0) return;
    setAssigning(true);

    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicIds: [...selectedTopics],
          classIds: [...selectedClasses],
        }),
      });

      if (!res.ok) {
        toast.error(t("assignFailed"));
        return;
      }

      const data = await res.json();
      toast.success(t("assignmentsCreated", { count: data.count }));
      setSelectedTopics(new Set());
      setSelectedClasses(new Set());
      router.refresh();
    } catch {
      toast.error(t("assignFailed"));
    } finally {
      setAssigning(false);
    }
  }

  const classSelectPercent = classes.length > 0 ? (selectedClasses.size / classes.length) * 100 : 0;

  return (
    <div>
      {/* Summary Bar (Glassmorphic) */}
      <div className="glass-card rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] border border-white/40 p-4 sm:p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">menu_book</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#2a14b4] leading-none">{selectedTopics.size}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("topics")}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-[#c7c4d7]/30 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#1b6b51]">school</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#1b6b51] leading-none">{selectedClasses.size}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("classes")}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleAssign}
          disabled={assigning || selectedTopics.size === 0 || selectedClasses.size === 0}
          className="inline-flex items-center gap-3 bg-[#2a14b4] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-body font-bold text-sm uppercase tracking-widest shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none w-full sm:w-auto justify-center"
        >
          <span className={`material-symbols-outlined text-[18px] ${assigning ? "animate-spin" : ""}`}>{assigning ? "progress_activity" : "send"}</span>
          {t("assignTopic")}
        </button>
      </div>

      {/* Two-Pane Layout */}
      <div className="grid gap-10 lg:grid-cols-12">
        {/* Topics (Left) */}
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-body font-bold text-2xl text-[#121c2a] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2a14b4] text-[22px]">menu_book</span>
              {t("topics")}
            </h2>
            <span className="text-xs font-body text-[#777586]">
              {selectedTopics.size} {t("selected")}
            </span>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {topics.map((topic) => {
              const isSelected = selectedTopics.has(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`w-full text-left flex items-center gap-4 p-5 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? "bg-white shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] border-2 border-[#2a14b4]/20"
                      : "bg-white/50 border border-[#c7c4d7]/10 hover:bg-white hover:shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      isSelected ? "text-[#2a14b4]" : "text-[#c7c4d7]"
                    }`}
                    style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {isSelected ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-[#121c2a]">{topic.title}</p>
                    <p className="text-xs text-[#777586] font-body">{tLang(t, topic.languageName)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Classes (Right) */}
        <div className="lg:col-span-5 lg:sticky lg:top-10">
          <div className="bg-[#eff4ff] rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-body font-bold text-2xl text-[#121c2a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2a14b4] text-[22px]">school</span>
                {t("classes")}
              </h2>
              <button
                onClick={selectAllClasses}
                className="text-xs font-body font-bold text-[#2a14b4] hover:underline underline-offset-4"
              >
                {selectedClasses.size === classes.length ? t("deselectAll") : t("selectAll")}
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {classes.length === 0 ? (
                <p className="text-sm text-[#777586] font-body italic">{t("noClassesCreatedYet")}</p>
              ) : (
                classes.map((cls) => {
                  const isSelected = selectedClasses.has(cls.id);
                  return (
                    <button
                      key={cls.id}
                      onClick={() => toggleClass(cls.id)}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? "bg-white shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]"
                          : "hover:bg-white/60"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#e3dfff] flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm text-[#2a14b4]">school</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-[#121c2a] text-sm">{cls.name}</p>
                        <p className="text-xs text-[#777586] font-body truncate">
                          {tLang(t, cls.languageName)} · {cls.studentCount} {t("studentsCount")} · {cls.assignedTopicIds.length} {t("topicsCount")}
                        </p>
                      </div>
                      <span
                        className={`material-symbols-outlined ${
                          isSelected ? "text-[#1b6b51]" : "text-[#c7c4d7]"
                        }`}
                        style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {isSelected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Selection Progress */}
            {classes.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#c7c4d7]/20">
                <div className="flex justify-between text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                  <span>{t("selection")}</span>
                  <span>{selectedClasses.size} {t("selected")}</span>
                </div>
                <div className="h-1 w-full bg-[#d9e3f6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1b6b51] rounded-full transition-all duration-300"
                    style={{ width: `${classSelectPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Assignments — M3 two-line list, paginated 9 per page */}
      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-body font-bold text-2xl text-[#121c2a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4] text-[22px]">assignment_turned_in</span>
            {t("assignedList")}
          </h2>
          <span className="text-xs font-body text-[#777586]">
            {visibleAssigned.length} {t("assigned").toLowerCase()}
          </span>
        </div>

        {visibleAssigned.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] px-6 py-12 text-center">
            <span className="material-symbols-outlined text-[#c7c4d7] text-3xl mb-2 block">assignment</span>
            <p className="text-sm font-body text-[#777586] italic">{t("noAssignmentsYet")}</p>
          </div>
        ) : (
          <>
            {/* M3 list container — one elevated surface, rows divided by subtle lines */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] overflow-hidden">
              <ul className="divide-y divide-[#c7c4d7]/15">
                {paginatedAssigned.map((a) => {
                  const d = new Date(a.assignedAt);
                  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                  return (
                    <li
                      key={a.id}
                      className="group flex items-center gap-4 px-5 py-4 hover:bg-[#f0eef6]/40 transition-colors"
                    >
                      {/* Leading: topic avatar (M3 list leading element) */}
                      <div className="w-11 h-11 rounded-2xl bg-[#e3dfff] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">menu_book</span>
                      </div>

                      {/* Primary + supporting text (M3 two-line list item) */}
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-bold text-[15px] text-[#121c2a] truncate group-hover:text-[#2a14b4] transition-colors">
                          {a.topicTitle}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs font-body text-[#777586]">
                          <span className="material-symbols-outlined text-[14px] shrink-0">school</span>
                          <span className="truncate">{a.className}</span>
                        </div>
                      </div>

                      {/* Trailing chips: language + date */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-body font-bold px-2.5 py-0.5 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51] uppercase tracking-widest">
                          {tLang(t, a.topicLanguageName)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-body text-[#777586]">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {date}
                        </span>
                      </div>

                      {/* Trailing action — M3 icon button (Danger Ghost token) */}
                      <button
                        type="button"
                        onClick={() => handleUnassign(a.id, a.topicTitle)}
                        disabled={unassigningId === a.id}
                        aria-label={t("unassign")}
                        title={t("unassign")}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[#7b0020] bg-[#ffdada]/20 hover:bg-[#ffdada]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed sm:invisible sm:group-hover:visible"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${unassigningId === a.id ? "animate-spin" : ""}`}>
                          {unassigningId === a.id ? "progress_activity" : "link_off"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Pagination — same M3 pattern as Topics / PracticeTests */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const show = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                  const prevShow = p > 1 && (p - 1 === 1 || p - 1 === totalPages || Math.abs(p - 1 - safePage) <= 1);
                  if (!show && !prevShow) return null;
                  if (!show && prevShow) return (
                    <span key={`e${p}`} className="w-8 h-8 flex items-center justify-center text-xs font-body text-[#777586]">…</span>
                  );
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-bold transition-all ${
                        p === safePage
                          ? "bg-[#2a14b4] text-white shadow-[0_1px_3px_rgba(42,20,180,0.3)]"
                          : "text-[#464554] hover:bg-[#f0eef6] hover:text-[#2a14b4]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <span className="ml-3 text-xs font-body text-[#777586]">
                  {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, visibleAssigned.length)} of {visibleAssigned.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
