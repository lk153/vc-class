"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Phase } from "@/hooks/useExamPhases";

type Props = {
  breadcrumb: string[];
  timeRemaining: number;
  isTimeWarning: boolean;
  isTimeCritical: boolean;
  saveStatus: "saved" | "saving" | "error" | "idle";
  lastSavedAt: Date | null;
  answeredCount: number;
  totalQuestions: number;
  // Question palette
  phases: Phase[];
  currentPhaseIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  goToPhase: (index: number) => void;
};

export default function ExamHeader({
  breadcrumb,
  timeRemaining,
  isTimeWarning,
  isTimeCritical,
  saveStatus,
  lastSavedAt,
  answeredCount,
  totalQuestions,
  phases,
  currentPhaseIndex,
  answers,
  flaggedQuestions,
  goToPhase,
}: Props) {
  const t = useTranslations("exam");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function formatSaveStatus() {
    if (saveStatus === "saving") return t("saving");
    if (saveStatus === "error") return t("offline");
    if (saveStatus === "saved" && lastSavedAt) {
      const ago = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
      if (ago < 5) return t("saved");
      if (ago < 60) return t("savedAgo", { seconds: ago });
      return t("savedMinAgo", { minutes: Math.floor(ago / 60) });
    }
    return "";
  }

  // Build flat question list from phases for palette
  const allQuestions = phases
    .filter((p) => p.type === "exercise")
    .flatMap((p, phaseIdx) =>
      p.questions.map((q) => ({
        id: q.id,
        number: q.questionNumber,
        phaseIndex: phaseIdx,
        answered: !!answers[q.id],
        flagged: flaggedQuestions.has(q.id),
      }))
    );

  return (
    <div className="sticky top-0 z-30 bg-[var(--exam-surface,#fdf8fe)]">
      {/* Progress bar */}
      <div className="h-1 bg-[var(--exam-surface-highest,#e5e0ed)]">
        <div
          className="h-full exam-cta transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: breadcrumb + palette toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center
              hover:bg-[var(--exam-surface-low,#f7f2fa)] transition-colors shrink-0"
            title={t("questionPalette")}
          >
            <span className="material-symbols-outlined text-[20px] text-[var(--exam-on-surface-variant,#777586)]">
              grid_view
            </span>
          </button>
          {/* Desktop: full breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-sm font-body text-[var(--exam-on-surface-variant,#777586)] min-w-0">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <span className="text-[var(--exam-surface-highest,#e5e0ed)]">/</span>}
                <span className={i === breadcrumb.length - 1 ? "text-[var(--exam-on-surface,#33313a)] font-semibold truncate" : "truncate"}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
          {/* Mobile: last crumb only */}
          <span className="md:hidden text-sm font-body font-semibold text-[var(--exam-on-surface,#33313a)] truncate">
            {breadcrumb[breadcrumb.length - 1]}
          </span>
        </div>

        {/* Right: save status + timer */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Save indicator */}
          <span className={`text-xs font-body hidden sm:inline ${
            saveStatus === "error" ? "text-[#7b0020]" : "text-[var(--exam-on-surface-variant,#777586)]"
          }`}>
            {saveStatus === "error" && (
              <span className="material-symbols-outlined text-[12px] mr-1 align-middle">cloud_off</span>
            )}
            {formatSaveStatus()}
          </span>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-body font-bold text-sm transition-colors ${
              isTimeCritical
                ? "bg-[#ffdada] text-[#7b0020] animate-pulse"
                : isTimeWarning
                ? "bg-[#fef3c7] text-[#92400e] animate-pulse"
                : "bg-[#e3dfff] text-[var(--exam-primary,#5e35f1)]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timer</span>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Question palette panel */}
      {paletteOpen && (
        <div className="absolute top-full left-0 right-0 z-40 px-4 md:px-8 pb-4">
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(94,53,241,0.08)] p-5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[var(--exam-on-surface-variant,#777586)]">
                {t("questions")}
              </p>
              <button onClick={() => setPaletteOpen(false)} className="text-[var(--exam-on-surface-variant,#777586)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {allQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { goToPhase(q.phaseIndex); setPaletteOpen(false); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-body font-bold transition-all ${
                    q.flagged
                      ? "bg-[#fef3c7] text-[#92400e] ring-1 ring-[#f59e0b]/30"
                      : q.answered
                      ? "bg-[var(--exam-primary,#5e35f1)] text-white"
                      : "bg-[var(--exam-surface-container,#f1ecf6)] text-[var(--exam-on-surface-variant,#777586)] hover:bg-[#e3dfff]"
                  }`}
                  title={`Q${q.number}${q.flagged ? " (flagged)" : ""}${q.answered ? " (answered)" : ""}`}
                >
                  {q.number}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--exam-surface-highest,#e5e0ed)]/30">
              <span className="flex items-center gap-1.5 text-[10px] font-body text-[var(--exam-on-surface-variant,#777586)]">
                <span className="w-3 h-3 rounded bg-[var(--exam-primary,#5e35f1)]" /> {t("answered")}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-body text-[var(--exam-on-surface-variant,#777586)]">
                <span className="w-3 h-3 rounded bg-[#fef3c7] ring-1 ring-[#f59e0b]/30" /> {t("flagged")}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-body text-[var(--exam-on-surface-variant,#777586)]">
                <span className="w-3 h-3 rounded bg-[var(--exam-surface-container,#f1ecf6)]" /> {t("unanswered")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
