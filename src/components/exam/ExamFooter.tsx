"use client";

import { useTranslations } from "next-intl";

type Props = {
  onPrevious: () => void;
  onNext: () => void;
  isFirstPhase: boolean;
  isLastContentPhase: boolean;
  isReviewPhase: boolean;
  questionRange: string; // e.g. "Q 1-5 of 40"
};

export default function ExamFooter({
  onPrevious,
  onNext,
  isFirstPhase,
  isLastContentPhase,
  isReviewPhase,
  questionRange,
}: Props) {
  const t = useTranslations("exam");
  return (
    <div
      className="sticky bottom-0 z-30 exam-glass"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Previous */}
        <button
          onClick={onPrevious}
          disabled={isFirstPhase}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium
            text-[var(--exam-on-surface-variant,#777586)]
            hover:bg-[var(--exam-surface-low,#f7f2fa)] hover:text-[var(--exam-on-surface,#33313a)]
            disabled:opacity-30 disabled:cursor-not-allowed transition-all min-w-[44px] min-h-[44px]"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="hidden sm:inline">{t("previous")}</span>
        </button>

        {/* Center: question range */}
        <span className="text-xs font-body font-bold text-[var(--exam-on-surface-variant,#777586)] uppercase tracking-widest">
          {questionRange}
        </span>

        {/* Next / Review */}
        {!isReviewPhase ? (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-bold text-white
              exam-cta shadow-lg shadow-[var(--exam-primary,#5e35f1)]/15
              hover:opacity-90 transition-all min-w-[44px] min-h-[44px]"
          >
            <span className="hidden sm:inline">
              {isLastContentPhase ? t("review") : t("next")}
            </span>
            <span className="material-symbols-outlined text-[18px]">
              {isLastContentPhase ? "checklist" : "arrow_forward"}
            </span>
          </button>
        ) : (
          <div className="w-[100px]" /> // Spacer to keep center aligned on review phase
        )}
      </div>
    </div>
  );
}
