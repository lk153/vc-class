"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import QuestionEditor from "@/components/teacher/QuestionEditor";
import EditableTitle from "@/components/teacher/EditableTitle";
import TestSectionBuilder from "@/components/teacher/TestSectionBuilder";
import ModalOverlay from "@/components/ModalOverlay";

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
  sectionId?: string | null;
  advancedData?: string | null;
  parentQuestionId?: string | null;
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
  sections: {
    id: string;
    parentId: string | null;
    level: "PART" | "GROUP" | "EXERCISE";
    title: string;
    description: string | null;
    sortOrder: number;
    mediaUrl: string | null;
    mediaType: string | null;
  }[];
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
  const [qPage, setQPage] = useState(1);
  const Q_PER_PAGE = 10;
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const closeModal = useCallback(() => { setSelectedTestId(null); router.refresh(); }, [router]);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refetchDetail() {
    if (!detail) return;
    setRefreshing(true);
    try {
      const r = await fetch(`/api/teacher/practice-tests/${detail.id}`);
      if (r.ok) setDetail(await r.json());
    } catch {} finally {
      setRefreshing(false);
    }
  }

  async function updateTest(field: string, data: Record<string, unknown>) {
    setSavingField(field);
    try {
      const res = await fetch("/api/teacher/practice-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail?.id, title: detail?.title, ...data }),
      });
      if (res.ok) {
        toast.success("Updated");
        await refetchDetail();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingField(null);
    }
  }

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
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#c7c4d7] hover:text-[#7b0020] hover:bg-[#ffdada]/30 transition-all invisible group-hover:visible"
                  onClick={(e) => { e.stopPropagation(); setDeleteTestId(test.id); }}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold text-white bg-[#2a14b4] transition-all invisible group-hover:visible"
                  onClick={(e) => { e.stopPropagation(); setSelectedTestId(test.id); }}
                >
                  {t("viewDetails")}
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </button>
              </div>
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
              className="relative z-10 w-full max-w-6xl bg-[#f8f9ff] rounded-2xl shadow-xl my-auto"
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
                            onClick={() => updateTest("status", { status: detail.status === "published" ? "draft" : "published" })}
                            disabled={savingField === "status"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold transition-colors disabled:opacity-50 ${
                              detail.status === "published"
                                ? "bg-[#a6f2d1]/40 text-[#1b6b51] hover:bg-[#a6f2d1]/60"
                                : "bg-[#fef3c7] text-[#92400e] hover:bg-[#fef3c7]/80"
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[14px] ${savingField === "status" ? "animate-spin" : ""}`}>
                              {savingField === "status" ? "progress_activity" : detail.status === "published" ? "visibility" : "visibility_off"}
                            </span>
                            {detail.status === "published" ? "Published" : "Draft"}
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={async () => {
                              setSavingField("duplicate");
                              try {
                                const res = await fetch("/api/teacher/practice-tests/duplicate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ testId: detail.id }),
                                });
                                if (res.ok) toast.success("Test duplicated");
                                else toast.error("Failed to duplicate");
                              } catch { toast.error("Failed to duplicate"); }
                              finally { setSavingField(null); }
                            }}
                            disabled={savingField === "duplicate"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff] hover:text-[#2a14b4] transition-colors disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[14px] ${savingField === "duplicate" ? "animate-spin" : ""}`}>
                              {savingField === "duplicate" ? "progress_activity" : "content_copy"}
                            </span>
                            Duplicate
                          </button>
                        </div>
                      </div>

                      {/* Test Settings */}
                      <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-5">
                        <div className="flex items-center gap-6">
                          {/* Mode — read-only display */}
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px] text-[#2a14b4]">
                                {detail.mode === "test" ? "timer" : "self_improvement"}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Mode</p>
                              <p className="text-sm font-body font-bold text-[#121c2a]">
                                {detail.mode === "test" ? "Test" : "Practice"}
                              </p>
                            </div>
                          </div>

                          <div className="w-px h-10 bg-[#c7c4d7]/20 shrink-0" />

                          {/* Shuffle — toggle */}
                          <label className="flex items-center gap-3 cursor-pointer group flex-1">
                            <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0 group-hover:bg-[#e3dfff] transition-colors">
                              <span className="material-symbols-outlined text-[18px] text-[#777586] group-hover:text-[#2a14b4] transition-colors">shuffle</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Shuffle</p>
                              <p className="text-xs font-body text-[#777586]">Randomize answer order</p>
                            </div>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={detail.shuffleAnswers}
                                onChange={(e) => updateTest("shuffle", { shuffleAnswers: e.target.checked })}
                                disabled={savingField === "shuffle"}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-6 bg-[#c7c4d7]/30 rounded-full peer-checked:bg-[#2a14b4] transition-colors" />
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform ${savingField === "shuffle" ? (detail.shuffleAnswers ? "toggle-loading-active" : "toggle-loading") : ""}`} />
                            </div>
                          </label>

                          <div className="w-px h-10 bg-[#c7c4d7]/20 shrink-0" />

                          {/* Review — toggle */}
                          <label className="flex items-center gap-3 cursor-pointer group flex-1">
                            <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0 group-hover:bg-[#e3dfff] transition-colors">
                              <span className="material-symbols-outlined text-[18px] text-[#777586] group-hover:text-[#2a14b4] transition-colors">rate_review</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Review</p>
                              <p className="text-xs font-body text-[#777586]">Show answer after each question</p>
                            </div>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={detail.showReviewMoment}
                                onChange={(e) => updateTest("review", { showReviewMoment: e.target.checked })}
                                disabled={savingField === "review"}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-6 bg-[#c7c4d7]/30 rounded-full peer-checked:bg-[#2a14b4] transition-colors" />
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform ${savingField === "review" ? (detail.showReviewMoment ? "toggle-loading-active" : "toggle-loading") : ""}`} />
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Test Structure (Sections) */}
                      <TestSectionBuilder testId={detail.id} sections={detail.sections || []} />

                      {/* Questions */}
                      <div className="relative bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] overflow-hidden">
                        {/* Loading progress bar */}
                        {refreshing && (
                          <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden z-10">
                            <div className="absolute h-full bg-[#2a14b4] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
                          </div>
                        )}
                        {/* Header bar */}
                        <div className="px-6 py-4 border-b border-[#c7c4d7]/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#e3dfff] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">help</span>
                              </div>
                              <h2 className="font-body font-bold text-lg text-[#121c2a]">
                                {t("questionsLabel")}
                              </h2>
                              <span className="text-xs font-body font-bold px-2.5 py-0.5 rounded-full bg-[#f0eef6] text-[#2a14b4]">
                                {detail.questions.length}
                              </span>
                            </div>
                          </div>

                          {/* Search + type filters + difficulty filters */}
                          {detail.questions.length > 3 && (
                            <div className="flex items-center gap-3">
                              <div className="relative flex-1 min-w-[120px] max-w-[240px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777586]/40 text-[16px]">search</span>
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={qSearch}
                                  onChange={(e) => { setQSearch(e.target.value); setQPage(1); }}
                                  className="w-full pl-9 pr-3 py-2 bg-[#f8f9ff] border border-[#c7c4d7]/15 rounded-xl text-xs font-body focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4]/30 outline-none transition-colors"
                                />
                              </div>
                              <div className="h-5 w-px bg-[#c7c4d7]/20" />
                              <div className="flex gap-1">
                                {[
                                  { val: "", label: "All" },
                                  { val: "MULTIPLE_CHOICE", label: "MC" },
                                  { val: "TRUE_FALSE", label: "T/F" },
                                  { val: "GAP_FILL", label: "Fill" },
                                  { val: "REORDER_WORDS", label: "Reorder" },
                                  { val: "WORD_BANK", label: "Bank" },
                                ].map(({ val, label }) => (
                                  <button
                                    key={val}
                                    onClick={() => { setQTypeFilter(val); setQPage(1); }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-body font-bold transition-all ${
                                      qTypeFilter === val
                                        ? "bg-[#2a14b4] text-white shadow-sm"
                                        : "text-[#777586] hover:bg-[#f0eef6] hover:text-[#464554]"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <div className="h-5 w-px bg-[#c7c4d7]/20" />
                              <div className="flex gap-1">
                                {["", "1", "2", "3"].map((d) => (
                                  <button
                                    key={`d${d}`}
                                    onClick={() => { setQDiffFilter(d); setQPage(1); }}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-body font-bold transition-all ${
                                      qDiffFilter === d
                                        ? "bg-[#f59e0b] text-white shadow-sm"
                                        : "text-[#c7c4d7] hover:bg-[#fef3c7] hover:text-[#f59e0b]"
                                    }`}
                                  >
                                    {d === "" ? (
                                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ) : (
                                      <span>{d}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bulk toolbar */}
                        {selectedQIds.size > 0 && (
                          <div className="flex items-center gap-3 px-6 py-3 bg-[#2a14b4]/5 border-b border-[#2a14b4]/10">
                            <input
                              type="checkbox"
                              checked={selectedQIds.size === detail.questions.length}
                              onChange={() => {
                                if (selectedQIds.size === detail.questions.length) setSelectedQIds(new Set());
                                else setSelectedQIds(new Set(detail.questions.map((q) => q.id)));
                              }}
                              className="w-4 h-4 rounded border-[#2a14b4]/30 text-[#2a14b4] focus:ring-[#2a14b4]/20"
                            />
                            <span className="text-xs font-body font-bold text-[#2a14b4]">{selectedQIds.size} selected</span>
                            <div className="flex gap-2 ml-auto">
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
                                  await refetchDetail();
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-body bg-white border border-[#c7c4d7]/20 text-[#464554]"
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
                                  await refetchDetail();
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-body bg-white border border-[#c7c4d7]/20 text-[#464554]"
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
                                  await refetchDetail();
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-body font-bold text-[#7b0020] bg-white border border-[#7b0020]/20 hover:bg-[#ffdada]/30 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Question list */}
                        {(() => {
                          const filtered = detail.questions.filter((q) => {
                            if (qSearch && !q.content.toLowerCase().includes(qSearch.toLowerCase())) return false;
                            if (qTypeFilter && q.questionType !== qTypeFilter) return false;
                            if (qDiffFilter && (q.difficulty ?? 1) !== parseInt(qDiffFilter)) return false;
                            return true;
                          });
                          const totalQPages = Math.ceil(filtered.length / Q_PER_PAGE);
                          const safeQPage = Math.min(qPage, totalQPages || 1);
                          const pageItems = filtered.slice((safeQPage - 1) * Q_PER_PAGE, safeQPage * Q_PER_PAGE);

                          return (
                            <>
                              <div className="p-4 space-y-3">
                                {pageItems.map((q) => (
                                  <div
                                    key={q.id}
                                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                      selectedQIds.has(q.id)
                                        ? "border-[#2a14b4]/20 bg-[#2a14b4]/[0.02]"
                                        : "border-[#c7c4d7]/10 hover:border-[#c7c4d7]/25 hover:bg-[#f8f9ff]"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedQIds.has(q.id)}
                                      onChange={() => setSelectedQIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                                        return next;
                                      })}
                                      className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20 mt-1 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <QuestionEditor question={q} onSave={(updated) => {
                                        setDetail((prev) => prev ? {
                                          ...prev,
                                          questions: prev.questions.map((pq) => pq.id === updated.id ? updated : pq),
                                        } : prev);
                                      }} />
                                    </div>
                                  </div>
                                ))}
                                {pageItems.length === 0 && (
                                  <div className="py-8 text-center">
                                    <span className="material-symbols-outlined text-[#c7c4d7] text-3xl mb-2">search_off</span>
                                    <p className="text-sm font-body text-[#777586]">No questions match your filters</p>
                                  </div>
                                )}
                              </div>

                              {/* Pagination */}
                              {totalQPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-3 border-t border-[#c7c4d7]/10 bg-[#f8f9ff]/50">
                                  <p className="text-xs font-body text-[#777586]">
                                    {(safeQPage - 1) * Q_PER_PAGE + 1}–{Math.min(safeQPage * Q_PER_PAGE, filtered.length)} of {filtered.length}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setQPage((p) => Math.max(1, p - 1))}
                                      disabled={safeQPage <= 1}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                    </button>
                                    {Array.from({ length: Math.min(totalQPages, 5) }, (_, i) => {
                                      let pn: number;
                                      if (totalQPages <= 5) pn = i + 1;
                                      else if (safeQPage <= 3) pn = i + 1;
                                      else if (safeQPage >= totalQPages - 2) pn = totalQPages - 4 + i;
                                      else pn = safeQPage - 2 + i;
                                      return (
                                        <button
                                          key={pn}
                                          onClick={() => setQPage(pn)}
                                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-body font-bold transition-all ${
                                            safeQPage === pn
                                              ? "bg-[#2a14b4] text-white"
                                              : "text-[#464554] hover:bg-white"
                                          }`}
                                        >
                                          {pn}
                                        </button>
                                      );
                                    })}
                                    <button
                                      onClick={() => setQPage((p) => Math.min(totalQPages, p + 1))}
                                      disabled={safeQPage >= totalQPages}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Test Confirmation Modal */}
      <ModalOverlay open={!!deleteTestId} onClose={() => !deleting && setDeleteTestId(null)} panelClass="max-w-md">
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffdada]/40 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#7b0020]">delete_forever</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            Delete Test
          </h3>
          <p className="text-sm font-body text-[#464554] mb-2 leading-relaxed">
            Are you sure you want to delete this test?
          </p>
          <p className="text-xs font-body text-[#7b0020] mb-6">
            All questions, sections, and student results will be permanently removed.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDeleteTestId(null)}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch("/api/teacher/practice-tests", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: deleteTestId }),
                  });
                  if (res.ok) {
                    toast.success("Test deleted");
                    setDeleteTestId(null);
                    router.refresh();
                  } else {
                    toast.error("Failed to delete test");
                  }
                } catch {
                  toast.error("Failed to delete test");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#7b0020] hover:bg-[#5c0017] shadow-lg shadow-[#7b0020]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              Delete
            </button>
          </div>
        </div>
      </ModalOverlay>
    </>
  );
}
