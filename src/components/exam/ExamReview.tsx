"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Phase } from "@/hooks/useExamPhases";

type Props = {
  phases: Phase[];
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  goToPhase: (index: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export default function ExamReview({
  phases,
  answers,
  flaggedQuestions,
  goToPhase,
  onSubmit,
  isSubmitting,
}: Props) {
  const t = useTranslations("exam");
  const [confirmed, setConfirmed] = useState(false);

  const contentPhases = phases.filter((p) => p.type === "exercise");

  // Group phases by PART (partTitle)
  type PartSummary = {
    title: string;
    phases: { phase: Phase; phaseIndex: number }[];
    answered: number;
    total: number;
    flagged: number;
    unanswered: number;
  };

  const partMap = new Map<string, PartSummary>();
  contentPhases.forEach((phase, relIdx) => {
    const partKey = phase.partTitle || phase.title;
    if (!partMap.has(partKey)) {
      partMap.set(partKey, { title: partKey, phases: [], answered: 0, total: 0, flagged: 0, unanswered: 0 });
    }
    const part = partMap.get(partKey)!;
    // Find the actual index in the full phases array
    const actualIndex = phases.findIndex((p) => p.id === phase.id);
    part.phases.push({ phase, phaseIndex: actualIndex });
    for (const q of phase.questions) {
      part.total++;
      if (answers[q.id]) part.answered++;
      else part.unanswered++;
      if (flaggedQuestions.has(q.id)) part.flagged++;
    }
  });

  const parts = Array.from(partMap.values());
  const totalAnswered = parts.reduce((sum, p) => sum + p.answered, 0);
  const totalQuestions = parts.reduce((sum, p) => sum + p.total, 0);
  const totalFlagged = parts.reduce((sum, p) => sum + p.flagged, 0);
  const totalUnanswered = totalQuestions - totalAnswered;
  const hasAttentionNeeded = totalUnanswered > 0 || totalFlagged > 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#e3dfff] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-[var(--exam-primary,#5e35f1)]">
              checklist
            </span>
          </div>
          <h2 className="font-body text-2xl font-bold text-[var(--exam-on-surface,#33313a)] mb-2">
            {t("readyForSubmission")}
          </h2>
          <p className="text-sm font-body text-[var(--exam-on-surface-variant,#777586)]">
            {t("reviewProgress")}
          </p>
        </div>

        {/* Part summaries */}
        <div className="space-y-4 mb-8">
          {parts.map((part, i) => {
            const progressPct = part.total > 0 ? (part.answered / part.total) * 100 : 0;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 shadow-[0_10px_20px_rgba(94,53,241,0.04)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-body font-bold text-base text-[var(--exam-on-surface,#33313a)]">
                    {part.title}
                  </h3>
                  <span className="text-xs font-body font-bold text-[var(--exam-on-surface-variant,#777586)]">
                    {part.answered}/{part.total}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-[var(--exam-surface-container,#f1ecf6)] mb-3">
                  <div
                    className="h-full rounded-full exam-cta transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 text-xs font-body">
                  <span className="flex items-center gap-1 text-[#1b6b51]">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {t("answeredCount", { count: part.answered })}
                  </span>
                  {part.flagged > 0 && (
                    <span className="flex items-center gap-1 text-[#f59e0b]">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                      {t("flaggedCount", { count: part.flagged })}
                    </span>
                  )}
                  {part.unanswered > 0 && (
                    <span className="flex items-center gap-1 text-[var(--exam-on-surface-variant,#777586)]">
                      <span className="material-symbols-outlined text-[14px]">radio_button_unchecked</span>
                      {t("unansweredCount", { count: part.unanswered })}
                    </span>
                  )}
                </div>

                {/* Review link */}
                <button
                  onClick={() => goToPhase(part.phases[0].phaseIndex)}
                  className="mt-3 text-xs font-body font-bold text-[var(--exam-primary,#5e35f1)] hover:underline flex items-center gap-1"
                >
                  {t("reviewPart", { part: part.title })}
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Attention required */}
        {hasAttentionNeeded && (
          <div className="bg-[#fef3c7]/50 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#92400e] text-[20px] mt-0.5">warning</span>
            <div>
              <p className="text-sm font-body font-semibold text-[#92400e]">{t("attentionRequired")}</p>
              <p className="text-xs font-body text-[#92400e]/80 mt-0.5">
                {totalUnanswered > 0 && `${totalUnanswered} unanswered`}
                {totalUnanswered > 0 && totalFlagged > 0 && ", "}
                {totalFlagged > 0 && `${totalFlagged} flagged`}
              </p>
            </div>
          </div>
        )}

        {/* Confirmation */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_10px_20px_rgba(94,53,241,0.04)]">
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded accent-[var(--exam-primary,#5e35f1)]"
            />
            <span className="text-sm font-body text-[var(--exam-on-surface,#33313a)] leading-relaxed">
              {t("confirmSubmit")}
            </span>
          </label>

          <button
            onClick={onSubmit}
            disabled={!confirmed || isSubmitting}
            className="w-full py-3.5 rounded-full text-sm font-body font-bold text-white
              exam-cta shadow-lg shadow-[var(--exam-primary,#5e35f1)]/20
              disabled:opacity-40 disabled:cursor-not-allowed transition-all
              flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                {t("submitting")}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                {t("submitExam")}
              </>
            )}
          </button>

          <p className="text-center text-[10px] font-body text-[var(--exam-on-surface-variant,#777586)] mt-3 uppercase tracking-widest">
            {t("questionsAnswered", { answered: totalAnswered, total: totalQuestions })}
          </p>
        </div>
      </div>
    </div>
  );
}
