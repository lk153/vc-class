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
import Tooltip from "@/components/Tooltip";
import ChipDropdown from "@/components/ChipDropdown";

// ── Numeric input sub-components: local draft state, save on blur ──

function TimeLimitInput({ value, onSave, saving }: { value: number; onSave: (minutes: number) => void; saving: boolean }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  function handleBlur() {
    const parsed = parseInt(draft);
    // If empty or not a number, revert to server value — don't save
    if (isNaN(parsed) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(1, Math.min(300, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onSave(clamped);
  }

  return (
    <div className="flex items-center gap-3 bg-[#f8f9ff] rounded-2xl px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined text-[18px] ${saving ? "text-[#2a14b4] animate-spin" : "text-[#777586]"}`}>
          {saving ? "progress_activity" : "timer"}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] flex items-center gap-1">
          Time Limit
          <Tooltip content="Total duration for the exam in minutes. The timer starts when the student begins and auto-submits when it reaches zero." position="top" maxWidth="max-w-[12rem]" />
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="number"
            min="1"
            max="300"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            disabled={saving}
            className="w-16 px-2 py-0.5 rounded-lg border border-[#c7c4d7]/30 text-sm font-body font-bold text-[#121c2a] focus:ring-1 focus:ring-[#2a14b4]/20 outline-none disabled:opacity-50"
          />
          <span className="text-xs font-body text-[#777586]">min</span>
        </div>
      </div>
    </div>
  );
}

function MaxAttemptsInput({ value, onSave, saving }: { value: number; onSave: (val: number) => void; saving: boolean }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  function handleBlur() {
    const parsed = parseInt(draft);
    // If empty or not a number, revert to server value — don't save
    if (isNaN(parsed) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(0, Math.min(99, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onSave(clamped);
  }

  return (
    <div className="flex items-center gap-3 bg-[#f8f9ff] rounded-2xl px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined text-[18px] ${saving ? "text-[#2a14b4] animate-spin" : "text-[#777586]"}`}>
          {saving ? "progress_activity" : "replay"}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] flex items-center gap-1">
          Attempts
          <Tooltip content="How many times a student can take this exam. Set to 0 for unlimited retakes. Each attempt is tracked separately with its own score." position="top" maxWidth="max-w-[12rem]" />
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="number"
            min="0"
            max="99"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            disabled={saving}
            className="w-16 px-2 py-0.5 rounded-lg border border-[#c7c4d7]/30 text-sm font-body font-bold text-[#121c2a] focus:ring-1 focus:ring-[#2a14b4]/20 outline-none disabled:opacity-50"
          />
          <span className="text-xs font-body text-[#777586]">{parseInt(draft) === 0 ? "unlimited" : "max"}</span>
        </div>
      </div>
    </div>
  );
}

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
  shuffleQuestions: boolean;
  showReviewMoment: boolean;
  totalTime: number;
  maxAttempts: number;
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

  const fieldLabels: Record<string, string> = {
    status: "Test status",
    shuffle: "Shuffle answers",
    shuffleQuestions: "Shuffle questions",
    review: "Instant review",
    totalTime: "Time limit",
    maxAttempts: "Max attempts",
  };

  async function updateTest(field: string, data: Record<string, unknown>) {
    setSavingField(field);
    const label = fieldLabels[field] || "Setting";
    try {
      const res = await fetch("/api/teacher/practice-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail?.id, title: detail?.title, ...data }),
      });
      if (res.ok) {
        toast.success(`${label} saved successfully`);
        await refetchDetail();
      } else {
        toast.error(`Failed to save ${label.toLowerCase()}`);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingField(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tests.map((test) => {
          const statusConfig = {
            ACTIVE:   { label: "Active",   icon: "check_circle", color: "bg-[#1b6b51]/10 text-[#1b6b51]" },
            DRAFT:    { label: "Draft",    icon: "edit_note",    color: "bg-[#92400e]/10 text-[#92400e]" },
            INACTIVE: { label: "Inactive", icon: "block",        color: "bg-[#777586]/10 text-[#777586]" },
          }[test.status || "DRAFT"] || { label: test.status, icon: "help", color: "bg-[#777586]/10 text-[#777586]" };

          return (
          <motion.div
            key={test.id}
            layoutId={`test-card-${test.id}`}
            onClick={() => setSelectedTestId(test.id)}
            className={`group relative rounded-2xl p-5 cursor-pointer flex flex-col
              transition-all duration-200
              bg-[var(--color-card,#fff)]
              shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]
              hover:shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)]
              hover:-translate-y-0.5
              ${test.status === "INACTIVE" ? "opacity-70" : ""}`}
          >
            {/* Status indicator — top-left colored bar */}
            <div className={`absolute top-0 left-6 right-6 h-[3px] rounded-b-full ${
              test.status === "ACTIVE" ? "bg-[#1b6b51]" :
              test.status === "INACTIVE" ? "bg-[#777586]/40" :
              "bg-[#f59e0b]"
            }`} />

            <div className="flex items-start justify-between mb-3 mt-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                test.status === "ACTIVE" ? "bg-[#e3dfff]" :
                test.status === "INACTIVE" ? "bg-[#f0eef6]" :
                "bg-[#fef3c7]/60"
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${
                  test.status === "ACTIVE" ? "text-[#2a14b4]" :
                  test.status === "INACTIVE" ? "text-[#777586]" :
                  "text-[#92400e]"
                }`}>quiz</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Status badge — always shown */}
                <span className={`inline-flex items-center gap-1 text-[9px] font-body font-bold px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
                {/* Language badge */}
                <span className="text-[9px] font-body font-bold px-2 py-0.5 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                  {tLang(t, test.languageName)}
                </span>
              </div>
            </div>

            <h3 className={`font-body font-bold text-base mb-0.5 line-clamp-2 transition-colors ${
              test.status === "INACTIVE"
                ? "text-[#777586]"
                : "text-[#121c2a] group-hover:text-[#2a14b4]"
            }`}>
              {test.title}
            </h3>
            <p className="text-xs text-[#464554] font-body mb-auto">
              {test.topicTitle}
            </p>

            <div className="flex items-center justify-between pt-3 mt-4 border-t border-[#c7c4d7]/10">
              <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                <span className="material-symbols-outlined text-[14px]">help</span>
                {test.questionCount} {t("questionsCount")}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#7b0020] bg-[#ffdada]/20 hover:bg-[#ffdada]/40 transition-all invisible group-hover:visible"
                  onClick={(e) => { e.stopPropagation(); setDeleteTestId(test.id); }}
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-body font-bold text-white bg-[#2a14b4] transition-all invisible group-hover:visible"
                  onClick={(e) => { e.stopPropagation(); setSelectedTestId(test.id); }}
                >
                  {t("viewDetails")}
                  <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </motion.div>
          );
        })}
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
              className="relative z-10 w-full max-w-6xl bg-[#f8f9ff] rounded-2xl shadow-[0_8px_24px_3px_rgba(0,0,0,0.12),0_4px_8px_0_rgba(0,0,0,0.08)] my-auto"
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
                          {/* Status cycle: DRAFT → ACTIVE → INACTIVE → DRAFT */}
                          <button
                            onClick={() => {
                              const next = detail.status === "DRAFT" ? "ACTIVE" : detail.status === "ACTIVE" ? "INACTIVE" : "DRAFT";
                              updateTest("status", { status: next });
                            }}
                            disabled={savingField === "status"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold transition-colors disabled:opacity-50 ${
                              detail.status === "ACTIVE"
                                ? "bg-[#a6f2d1]/40 text-[#1b6b51] hover:bg-[#a6f2d1]/60"
                                : detail.status === "INACTIVE"
                                ? "bg-[#e5e0ed]/50 text-[#777586] hover:bg-[#e5e0ed]/80"
                                : "bg-[#fef3c7] text-[#92400e] hover:bg-[#fef3c7]/80"
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[14px] ${savingField === "status" ? "animate-spin" : ""}`}>
                              {savingField === "status" ? "progress_activity" : detail.status === "ACTIVE" ? "visibility" : detail.status === "INACTIVE" ? "visibility_off" : "edit"}
                            </span>
                            {detail.status === "ACTIVE" ? "Active" : detail.status === "INACTIVE" ? "Inactive" : "Draft"}
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
                      <div className="bg-white rounded-2xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-5 space-y-5">
                        {/* ── Row 1: Mode + Timing ── */}
                        <div>
                          <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#2a14b4] mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">settings</span>
                            General
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Mode — read-only */}
                            <div className="flex items-center gap-3 bg-[#f8f9ff] rounded-2xl px-4 py-3">
                              <div className="w-9 h-9 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px] text-[#2a14b4]">
                                  {detail.mode === "test" ? "assignment" : "self_improvement"}
                                </span>
                              </div>
                              <div>
                                <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Mode</p>
                                <p className="text-sm font-body font-bold text-[#121c2a]">
                                  {detail.mode === "test" ? "Test" : "Practice"}
                                </p>
                              </div>
                            </div>

                            {/* Time Limit — local draft, save on blur */}
                            <TimeLimitInput
                              value={Math.round(detail.totalTime / 60)}
                              onSave={(minutes) => updateTest("totalTime", { totalTime: minutes * 60 })}
                              saving={savingField === "totalTime"}
                            />

                            {/* Max Attempts — local draft, save on blur */}
                            <MaxAttemptsInput
                              value={detail.maxAttempts}
                              onSave={(val) => updateTest("maxAttempts", { maxAttempts: val })}
                              saving={savingField === "maxAttempts"}
                            />
                          </div>
                        </div>

                        {/* ── Row 2: Behavior Toggles ── */}
                        <div>
                          <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#2a14b4] mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">tune</span>
                            Behavior
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Shuffle Answers */}
                            <label className="flex items-center gap-3 cursor-pointer group bg-[#f8f9ff] rounded-2xl px-4 py-3 hover:bg-[#f0eef6] transition-colors relative">
                              <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0 group-hover:bg-[#e3dfff] transition-colors">
                                <span className="material-symbols-outlined text-[18px] text-[#777586] group-hover:text-[#2a14b4] transition-colors">swap_horiz</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] flex items-center gap-1">
                                  Shuffle Answers
                                  <Tooltip content="Randomizes the order of A/B/C/D answer options for each question. The correct answer stays mapped correctly." position="top" maxWidth="max-w-[12rem]" />
                                </p>
                                <p className="text-[11px] font-body text-[#777586] truncate">A, B, C, D options reordered</p>
                              </div>
                              <div className="relative shrink-0">
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

                            {/* Shuffle Questions */}
                            <label className="flex items-center gap-3 cursor-pointer group bg-[#f8f9ff] rounded-2xl px-4 py-3 hover:bg-[#f0eef6] transition-colors relative">
                              <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0 group-hover:bg-[#e3dfff] transition-colors">
                                <span className="material-symbols-outlined text-[18px] text-[#777586] group-hover:text-[#2a14b4] transition-colors">reorder</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] flex items-center gap-1">
                                  Shuffle Questions
                                  <Tooltip content="Randomizes the order of questions within each section. Each student sees a different sequence to prevent copying." position="top" maxWidth="max-w-[12rem]" />
                                </p>
                                <p className="text-[11px] font-body text-[#777586] truncate">Different order per student</p>
                              </div>
                              <div className="relative shrink-0">
                                <input
                                  type="checkbox"
                                  checked={detail.shuffleQuestions}
                                  onChange={(e) => updateTest("shuffleQuestions", { shuffleQuestions: e.target.checked })}
                                  disabled={savingField === "shuffleQuestions"}
                                  className="sr-only peer"
                                />
                                <div className="w-10 h-6 bg-[#c7c4d7]/30 rounded-full peer-checked:bg-[#2a14b4] transition-colors" />
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform ${savingField === "shuffleQuestions" ? (detail.shuffleQuestions ? "toggle-loading-active" : "toggle-loading") : ""}`} />
                              </div>
                            </label>

                            {/* Instant Review */}
                            <label className="flex items-center gap-3 cursor-pointer group bg-[#f8f9ff] rounded-2xl px-4 py-3 hover:bg-[#f0eef6] transition-colors relative">
                              <div className="w-9 h-9 rounded-lg bg-[#f0eef6] flex items-center justify-center shrink-0 group-hover:bg-[#e3dfff] transition-colors">
                                <span className="material-symbols-outlined text-[18px] text-[#777586] group-hover:text-[#2a14b4] transition-colors">rate_review</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] flex items-center gap-1">
                                  Instant Review
                                  <Tooltip content="Shows the correct answer immediately after the student answers each question. Only applies to Practice mode." position="top" maxWidth="max-w-[12rem]" />
                                </p>
                                <p className="text-[11px] font-body text-[#777586] truncate">Show answer after each question</p>
                              </div>
                              <div className="relative shrink-0">
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
                      </div>

                      {/* Test Structure (Sections) */}
                      <TestSectionBuilder testId={detail.id} sections={detail.sections || []} />

                      {/* Questions — M3 Surface Container */}
                      <div className="relative rounded-2xl bg-[var(--color-card,#fff)] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] overflow-hidden">
                        {/* Loading progress bar */}
                        {refreshing && (
                          <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden z-10">
                            <div className="absolute h-full bg-[#2a14b4] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
                          </div>
                        )}

                        {/* Header */}
                        <div className="px-5 py-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px] text-[#2a14b4]">help</span>
                              </div>
                              <h2 className="font-body font-bold text-base text-[#121c2a]">
                                {t("questionsLabel")}
                              </h2>
                              <span className="text-[11px] font-body font-bold px-2 py-0.5 rounded-full bg-[#e3dfff] text-[#2a14b4]">
                                {detail.questions.length}
                              </span>
                            </div>
                          </div>

                          {/* Filters — M3 Filter Chips + Search */}
                          {detail.questions.length > 3 && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Search */}
                              <div className="relative flex-1 min-w-[120px] max-w-[260px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777586]/40 text-[16px]">search</span>
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={qSearch}
                                  onChange={(e) => { setQSearch(e.target.value); setQPage(1); }}
                                  className="w-full pl-9 pr-3 py-2 bg-[#f7f2fa] rounded-full text-xs font-body
                                    focus:ring-2 focus:ring-[#2a14b4]/20 outline-none transition-colors
                                    border border-transparent focus:border-[#2a14b4]/20"
                                />
                              </div>

                              {/* Type chips — M3 segmented style */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {[
                                  { val: "", label: "All", icon: "checklist" },
                                  { val: "MULTIPLE_CHOICE", label: "MC", icon: "radio_button_checked" },
                                  { val: "TRUE_FALSE", label: "T/F", icon: "check_box" },
                                  { val: "GAP_FILL", label: "Fill", icon: "edit" },
                                  { val: "REORDER_WORDS", label: "Reorder", icon: "swap_vert" },
                                  { val: "WORD_BANK", label: "Bank", icon: "view_module" },
                                ].map(({ val, label, icon }) => (
                                  <button
                                    key={val}
                                    onClick={() => { setQTypeFilter(val); setQPage(1); }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-body font-bold transition-all ${
                                      qTypeFilter === val
                                        ? "bg-[#2a14b4] text-white shadow-[0_1px_3px_rgba(42,20,180,0.3)]"
                                        : "bg-[#f7f2fa] text-[#777586] hover:bg-[#e3dfff] hover:text-[#2a14b4]"
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[12px]">{icon}</span>
                                    {label}
                                  </button>
                                ))}
                              </div>

                              {/* Difficulty — M3 icon buttons */}
                              <div className="flex items-center gap-0.5 bg-[#f7f2fa] rounded-full p-0.5">
                                {["", "1", "2", "3"].map((d) => (
                                  <button
                                    key={`d${d}`}
                                    onClick={() => { setQDiffFilter(d); setQPage(1); }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-body font-bold transition-all ${
                                      qDiffFilter === d
                                        ? "bg-[#f59e0b] text-white shadow-sm"
                                        : "text-[#777586] hover:bg-[#fef3c7] hover:text-[#f59e0b]"
                                    }`}
                                    title={d === "" ? "All difficulties" : `Difficulty ${d}`}
                                  >
                                    {d === "" ? (
                                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ) : d}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bulk actions — always visible: set difficulty / timer for selected */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#c7c4d7]/8">
                            <input
                              type="checkbox"
                              checked={selectedQIds.size > 0 && selectedQIds.size === detail.questions.length}
                              onChange={() => {
                                if (selectedQIds.size === detail.questions.length) setSelectedQIds(new Set());
                                else setSelectedQIds(new Set(detail.questions.map((q) => q.id)));
                              }}
                              className="w-4 h-4 rounded-sm border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                            />
                            <span className="text-[11px] font-body text-[#777586]">
                              {selectedQIds.size > 0 ? (
                                <span className="font-bold text-[#2a14b4]">{selectedQIds.size} selected</span>
                              ) : (
                                "Select questions"
                              )}
                            </span>

                            <div className="flex items-center gap-1.5 ml-auto">
                              {/* Difficulty dropdown */}
                              <ChipDropdown
                                label="Difficulty"
                                icon="star"
                                disabled={selectedQIds.size === 0}
                                options={[
                                  { value: "1", label: "Easy", icon: "star" },
                                  { value: "2", label: "Medium", icon: "star_half" },
                                  { value: "3", label: "Hard", icon: "stars" },
                                ]}
                                onSelect={async (value) => {
                                  if (selectedQIds.size === 0) { toast.error("Select questions first"); return; }
                                  await fetch("/api/teacher/questions/bulk", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ids: Array.from(selectedQIds), field: "difficulty", value: parseInt(value) }),
                                  });
                                  toast.success("Difficulty updated");
                                  setSelectedQIds(new Set());
                                  await refetchDetail();
                                }}
                              />

                              {/* Timer dropdown */}
                              <ChipDropdown
                                label="Timer"
                                icon="timer"
                                disabled={selectedQIds.size === 0}
                                options={[
                                  { value: "15", label: "15 seconds", icon: "timer" },
                                  { value: "30", label: "30 seconds", icon: "timer" },
                                  { value: "45", label: "45 seconds", icon: "timer" },
                                  { value: "60", label: "60 seconds", icon: "timer" },
                                ]}
                                onSelect={async (value) => {
                                  if (selectedQIds.size === 0) { toast.error("Select questions first"); return; }
                                  await fetch("/api/teacher/questions/bulk", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ids: Array.from(selectedQIds), field: "timer", value: parseInt(value) }),
                                  });
                                  toast.success("Timer updated");
                                  setSelectedQIds(new Set());
                                  await refetchDetail();
                                }}
                              />

                              {/* Delete — only enabled when selected */}
                              <button
                                onClick={async () => {
                                  if (selectedQIds.size === 0) { toast.error("Select questions first"); return; }
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
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body font-bold transition-all ${
                                  selectedQIds.size > 0
                                    ? "text-[#7b0020] bg-[#ffdada]/30 hover:bg-[#ffdada]/50"
                                    : "text-[#c7c4d7] bg-[#f7f2fa] cursor-not-allowed"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">delete</span>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Question list — M3 Elevated Cards */}
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
                              <div className="px-5 py-4 space-y-3">
                                {pageItems.map((q) => (
                                  <div
                                    key={q.id}
                                    className={`flex items-start gap-3 p-4 rounded-2xl transition-all ${
                                      selectedQIds.has(q.id)
                                        ? "bg-[#e3dfff]/20 shadow-[0_1px_3px_1px_rgba(42,20,180,0.08),0_1px_2px_0_rgba(42,20,180,0.06)] ring-1 ring-[#2a14b4]/10"
                                        : "bg-[var(--color-card,#fff)] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)]"
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
                                      className="w-4 h-4 rounded-sm border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20 mt-1 shrink-0"
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
                                  <div className="py-12 text-center">
                                    <span className="material-symbols-outlined text-[#c7c4d7] text-4xl mb-3 block">search_off</span>
                                    <p className="text-sm font-body text-[#777586]">No questions match your filters</p>
                                  </div>
                                )}
                              </div>

                              {/* Pagination — M3 style */}
                              {totalQPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-[#c7c4d7]/8 bg-[#f7f2fa]/30">
                                  <p className="text-[11px] font-body text-[#777586]">
                                    {(safeQPage - 1) * Q_PER_PAGE + 1}–{Math.min(safeQPage * Q_PER_PAGE, filtered.length)} of {filtered.length}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setQPage((p) => Math.max(1, p - 1))}
                                      disabled={safeQPage <= 1}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#464554] hover:bg-[#e3dfff]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-bold transition-all ${
                                            safeQPage === pn
                                              ? "bg-[#2a14b4] text-white shadow-[0_1px_3px_rgba(42,20,180,0.3)]"
                                              : "text-[#464554] hover:bg-[#e3dfff]/50"
                                          }`}
                                        >
                                          {pn}
                                        </button>
                                      );
                                    })}
                                    <button
                                      onClick={() => setQPage((p) => Math.min(totalQPages, p + 1))}
                                      disabled={safeQPage >= totalQPages}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#464554] hover:bg-[#e3dfff]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
