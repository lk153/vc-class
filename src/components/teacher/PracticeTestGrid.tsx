"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import QuestionEditor from "@/components/teacher/QuestionEditor";
import EditableTitle from "@/components/teacher/EditableTitle";

type Test = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  questionCount: number;
  status?: string;
};

type Question = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: string;
  answer1: string;
  answer2: string | null;
  answer3: string | null;
  answer4: string | null;
  correctAnswer: string;
  timer: number;
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  answer1MediaUrl?: string | null;
  answer1MediaType?: string | null;
  answer2MediaUrl?: string | null;
  answer2MediaType?: string | null;
  answer3MediaUrl?: string | null;
  answer3MediaType?: string | null;
  answer4MediaUrl?: string | null;
  answer4MediaType?: string | null;
  difficulty?: number;
  explanation?: string | null;
  explanationMediaUrl?: string | null;
  explanationMediaType?: string | null;
  audioPlayLimit?: number | null;
};

type TestDetail = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  status: string;
  mode: string;
  shuffleAnswers: boolean;
  showReviewMoment: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  questions: Question[];
};

type Props = {
  tests: Test[];
};

export default function PracticeTestGrid({ tests }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Question management state
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());
  const [qSearch, setQSearch] = useState("");
  const [qTypeFilter, setQTypeFilter] = useState("");
  const [qDiffFilter, setQDiffFilter] = useState("");

  useEffect(() => {
    if (selectedTestId) {
      let cancelled = false;
      setLoading(true);
      fetch(`/api/teacher/practice-tests/${selectedTestId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => { if (!cancelled) setDetail(data); })
        .catch(() => { if (!cancelled) toast.error(t("classUpdateFailed")); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    } else {
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestId]);

  // Body scroll lock + escape key
  useEffect(() => {
    if (selectedTestId) {
      document.body.style.overflow = "hidden";
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSelectedTestId(null);
      };
      window.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKey);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedTestId]);

  const closeModal = useCallback(() => setSelectedTestId(null), []);

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <motion.div
            key={test.id}
            layoutId={`test-card-${test.id}`}
            onClick={() => setSelectedTestId(test.id)}
            className="group bg-white rounded-xl ambient-shadow p-8 transition-colors duration-200 border border-transparent hover:border-[#2a14b4]/10 hover:bg-[#f5f3ff] cursor-pointer"
            style={{ borderRadius: 12 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2a14b4]">quiz</span>
              </div>
              <div className="flex items-center gap-2">
                {test.status && test.status !== "published" && (
                  <span className={`text-[10px] font-body font-bold px-2.5 py-0.5 rounded-full ${
                    test.status === "draft" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#d9e3f6] text-[#777586]"
                  }`}>
                    {test.status === "draft" ? "Draft" : "Archived"}
                  </span>
                )}
                <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                  {tLang(t, test.languageName)}
                </span>
              </div>
            </div>

            <h3 className="font-body font-bold text-2xl text-[#121c2a] mb-1 group-hover:text-[#2a14b4] transition-colors">
              {test.title}
            </h3>
            <p className="text-sm text-[#464554] font-body mb-6">
              {test.topicTitle}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[#c7c4d7]/15">
              <div className="flex gap-6">
                <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                  <span className="material-symbols-outlined text-[14px]">help</span>
                  {test.questionCount} {t("questionsCount")}
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold text-white bg-[#2a14b4] transition-all invisible group-hover:visible"
                onClick={(e) => { e.stopPropagation(); setSelectedTestId(test.id); }}
              >
                {t("viewDetails")}
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Shared Element Modal */}
      <AnimatePresence>
        {selectedTestId && (
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop: blur layer + dark overlay separated for smooth transition */}
            <motion.div
              className="fixed inset-0"
              onClick={closeModal}
              style={{ WebkitBackdropFilter: "var(--blur)" } as React.CSSProperties}
              initial={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
              animate={{ backdropFilter: "blur(8px)", "--blur": "blur(8px)" } as Record<string, string>}
              exit={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              className="fixed inset-0 bg-black/40"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Panel — shared layoutId morphs from the card */}
            <motion.div
              layoutId={`test-card-${selectedTestId}`}
              className="relative z-10 w-full max-w-4xl bg-[#f8f9ff] rounded-2xl shadow-xl my-auto"
              style={{ borderRadius: 16 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
                {/* Close button */}
                <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
                  <button
                    onClick={closeModal}
                    className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <motion.div
                  className="px-6 md:px-8 pb-6 md:pb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-24">
                      <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-3xl">progress_activity</span>
                    </div>
                  ) : detail ? (
                    <div className="space-y-6">
                      {/* Header + Actions */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <EditableTitle testId={detail.id} title={detail.title} />
                          <p className="text-[#777586] font-body mt-1">
                            {detail.topicTitle} &middot; {tLang(t, detail.languageName)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status toggle */}
                          <button
                            onClick={async () => {
                              const newStatus = detail.status === "published" ? "draft" : "published";
                              const res = await fetch("/api/teacher/practice-tests", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: detail.id, title: detail.title, status: newStatus }),
                              });
                              if (res.ok) {
                                toast.success(newStatus === "published" ? "Published" : "Unpublished");
                                router.refresh();
                                setSelectedTestId(null);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold transition-colors ${
                              detail.status === "published"
                                ? "bg-[#a6f2d1]/40 text-[#1b6b51] hover:bg-[#a6f2d1]/60"
                                : "bg-[#fef3c7] text-[#92400e] hover:bg-[#fef3c7]/80"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {detail.status === "published" ? "visibility" : "visibility_off"}
                            </span>
                            {detail.status === "published" ? "Published" : "Draft"}
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/teacher/practice-tests/duplicate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ testId: detail.id }),
                              });
                              if (res.ok) {
                                toast.success("Test duplicated");
                                router.refresh();
                                setSelectedTestId(null);
                              } else {
                                toast.error("Failed to duplicate");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff] hover:text-[#2a14b4] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            Duplicate
                          </button>
                        </div>
                      </div>

                      {/* Test Config */}
                      <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-5">
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Mode */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Mode</span>
                            <div className="flex rounded-full bg-[#f0eef6] p-0.5">
                              {["test", "practice"].map((m) => (
                                <button
                                  key={m}
                                  onClick={async () => {
                                    await fetch("/api/teacher/practice-tests", {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ id: detail.id, title: detail.title, mode: m }),
                                    });
                                    router.refresh();
                                    setSelectedTestId(null);
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-body font-bold transition-colors ${
                                    detail.mode === m ? "bg-[#2a14b4] text-white" : "text-[#777586] hover:text-[#121c2a]"
                                  }`}
                                >
                                  {m === "test" ? "Test" : "Practice"}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Shuffle */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Shuffle</span>
                            <input
                              type="checkbox"
                              checked={detail.shuffleAnswers}
                              onChange={async (e) => {
                                await fetch("/api/teacher/practice-tests", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: detail.id, title: detail.title, shuffleAnswers: e.target.checked }),
                                });
                                router.refresh();
                                setSelectedTestId(null);
                              }}
                              className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                            />
                          </label>
                          {/* Review Moment */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Review</span>
                            <input
                              type="checkbox"
                              checked={detail.showReviewMoment}
                              onChange={async (e) => {
                                await fetch("/api/teacher/practice-tests", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: detail.id, title: detail.title, showReviewMoment: e.target.checked }),
                                });
                                router.refresh();
                                setSelectedTestId(null);
                              }}
                              className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-6">
                        {/* Question header + search/filter */}
                        <div className="flex flex-col gap-3 mb-4">
                          <div className="flex items-center justify-between">
                            <h2 className="font-body font-bold text-xl text-[#121c2a]">
                              {t("questionsLabel")} ({detail.questions.length})
                            </h2>
                          </div>

                          {/* Search + Filters */}
                          {detail.questions.length > 3 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="relative flex-1 min-w-[140px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777586]/50 text-[16px]">search</span>
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={qSearch}
                                  onChange={(e) => setQSearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-1.5 bg-[#f8f9ff] border border-[#c7c4d7]/20 rounded-full text-xs font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none"
                                />
                              </div>
                              {["", "MULTIPLE_CHOICE", "YES_NO", "GAP_FILL"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setQTypeFilter(type)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-body font-bold transition-colors ${
                                    qTypeFilter === type ? "bg-[#2a14b4] text-white" : "bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff]"
                                  }`}
                                >
                                  {type === "" ? "All" : type === "MULTIPLE_CHOICE" ? "MC" : type === "YES_NO" ? "Y/N" : "Fill"}
                                </button>
                              ))}
                              {["", "1", "2", "3"].map((d) => (
                                <button
                                  key={`d${d}`}
                                  onClick={() => setQDiffFilter(d)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-body font-bold transition-colors ${
                                    qDiffFilter === d ? "bg-[#f59e0b] text-white" : "bg-[#f0eef6] text-[#464554] hover:bg-[#fef3c7]"
                                  }`}
                                >
                                  {d === "" ? "★" : "★".repeat(parseInt(d))}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Bulk toolbar */}
                          {selectedQIds.size > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-[#e3dfff]/30 rounded-xl">
                              <span className="text-xs font-body font-bold text-[#2a14b4]">{selectedQIds.size} selected</span>
                              <div className="flex gap-1 ml-auto">
                                <select
                                  onChange={async (e) => {
                                    if (!e.target.value) return;
                                    await fetch("/api/teacher/questions/bulk", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ids: Array.from(selectedQIds), field: "difficulty", value: parseInt(e.target.value) }),
                                    });
                                    toast.success("Difficulty updated");
                                    setSelectedQIds(new Set());
                                    router.refresh();
                                    setSelectedTestId(null);
                                  }}
                                  className="px-2 py-1 rounded-full text-[10px] font-body bg-white border border-[#c7c4d7]/20"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Difficulty</option>
                                  <option value="1">★ Easy</option>
                                  <option value="2">★★ Medium</option>
                                  <option value="3">★★★ Hard</option>
                                </select>
                                <select
                                  onChange={async (e) => {
                                    if (!e.target.value) return;
                                    await fetch("/api/teacher/questions/bulk", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ids: Array.from(selectedQIds), field: "timer", value: parseInt(e.target.value) }),
                                    });
                                    toast.success("Timer updated");
                                    setSelectedQIds(new Set());
                                    router.refresh();
                                    setSelectedTestId(null);
                                  }}
                                  className="px-2 py-1 rounded-full text-[10px] font-body bg-white border border-[#c7c4d7]/20"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Timer</option>
                                  <option value="15">15s</option>
                                  <option value="30">30s</option>
                                  <option value="45">45s</option>
                                  <option value="60">60s</option>
                                </select>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Delete ${selectedQIds.size} question(s)?`)) return;
                                    await fetch("/api/teacher/questions/bulk", {
                                      method: "DELETE",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ ids: Array.from(selectedQIds) }),
                                    });
                                    toast.success("Questions deleted");
                                    setSelectedQIds(new Set());
                                    router.refresh();
                                    setSelectedTestId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-full text-[10px] font-body font-bold text-[#7b0020] bg-[#ffdada]/40 hover:bg-[#ffdada]/60 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Question list with checkboxes */}
                        <div className="space-y-0">
                          {detail.questions
                            .filter((q) => {
                              if (qSearch && !q.content.toLowerCase().includes(qSearch.toLowerCase())) return false;
                              if (qTypeFilter && q.questionType !== qTypeFilter) return false;
                              if (qDiffFilter && (q.difficulty ?? 1) !== parseInt(qDiffFilter)) return false;
                              return true;
                            })
                            .map((q) => (
                              <div key={q.id} className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedQIds.has(q.id)}
                                  onChange={() => setSelectedQIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                                    return next;
                                  })}
                                  className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20 mt-5 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <QuestionEditor question={q} />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
