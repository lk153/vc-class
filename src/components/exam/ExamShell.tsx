"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useExamPhases } from "@/hooks/useExamPhases";
import { useExamSession } from "@/hooks/useExamSession";
import ExamHeader from "./ExamHeader";
import ExamFooter from "./ExamFooter";
import ExamPhase from "./ExamPhase";
import ExamReview from "./ExamReview";
import type { Section, ExamQuestion } from "@/hooks/useExamPhases";

type Props = {
  topicId: string;
  practiceTestId: string;
  testTitle: string;
  questions: ExamQuestion[];
  sections: Section[];
  totalTime?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
};

export default function ExamShell({
  topicId,
  practiceTestId,
  testTitle,
  questions,
  sections,
  totalTime = 2700,
  shuffleQuestions = false,
  shuffleAnswers = false,
}: Props) {
  const router = useRouter();
  const t = useTranslations("exam");

  // Build phases from section tree
  const phases = useExamPhases(sections, questions, shuffleQuestions, practiceTestId);

  // Core session state machine
  const session = useExamSession({ practiceTestId, phases, totalTime });

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (session.status !== "DOING") return;
      if (e.key === "ArrowRight" && !session.isReviewPhase) session.nextPhase();
      if (e.key === "ArrowLeft" && !session.isFirstPhase) session.prevPhase();
    },
    [session]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Compute question range for footer
  function getQuestionRange(): string {
    const phase = session.currentPhase;
    if (!phase || phase.type === "review") return "";
    const qs = phase.questions;
    if (qs.length === 0) return "";
    const first = qs[0].questionNumber;
    const last = qs[qs.length - 1].questionNumber;
    const total = phases
      .filter((p) => p.type === "exercise")
      .reduce((sum, p) => sum + p.questions.length, 0);
    return `Q ${first}–${last} of ${total}`;
  }

  // Total answered count across all phases
  const totalQuestions = phases
    .filter((p) => p.type === "exercise")
    .reduce((sum, p) => sum + p.questions.length, 0);
  const answeredCount = Object.keys(session.answers).filter((k) => session.answers[k]).length;

  // ── Loading state ──
  if (session.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--exam-surface,#fdf8fe)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--exam-primary,#5e35f1)] animate-spin block mb-4">
            progress_activity
          </span>
          <p className="text-sm font-body text-[var(--exam-on-surface-variant,#777586)]">
            {t("loadingExam")}
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (session.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--exam-surface,#fdf8fe)]">
        <div className="text-center max-w-sm">
          <span className="material-symbols-outlined text-4xl text-[#7b0020] block mb-4">error</span>
          <p className="text-base font-body font-semibold text-[var(--exam-on-surface,#33313a)] mb-2">
            {t("failedToLoad")}
          </p>
          <p className="text-sm font-body text-[var(--exam-on-surface-variant,#777586)] mb-6">
            {t("checkConnection")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white exam-cta"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted state ──
  if (session.submitResult) {
    const score = session.submitResult.score;
    const isExcellent = score >= 80;
    const isGood = score >= 50 && score < 80;

    const mood = session.submitResult.status !== "GRADED"
      ? { icon: "hourglass_top", title: t("examSubmitted"), desc: t("awaitingReview"), color: "text-[#1e40af]", bg: "bg-[#dbeafe]" }
      : isExcellent
      ? { icon: "emoji_events", title: t("examSubmitted"), desc: `${session.submitResult.correctCount} / ${session.submitResult.totalQuestions} ${t("correct")}`, color: "text-[#1b6b51]", bg: "bg-[#a6f2d1]/20" }
      : isGood
      ? { icon: "trending_up", title: t("examSubmitted"), desc: `${session.submitResult.correctCount} / ${session.submitResult.totalQuestions} ${t("correct")}`, color: "text-[#2a14b4]", bg: "bg-[#e3dfff]" }
      : { icon: "fitness_center", title: t("examSubmitted"), desc: `${session.submitResult.correctCount} / ${session.submitResult.totalQuestions} ${t("correct")}`, color: "text-[#92400e]", bg: "bg-[#fef3c7]" };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--exam-surface,#fdf8fe)]">
        <div className="text-center max-w-md px-6">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl ${mood.bg} flex items-center justify-center mx-auto mb-6`}>
            <span className={`material-symbols-outlined text-[40px] ${mood.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {mood.icon}
            </span>
          </div>

          <h1 className="font-body text-2xl font-bold text-[var(--exam-on-surface,#33313a)] mb-3">
            {mood.title}
          </h1>

          {session.submitResult.status === "GRADED" && (
            <p className={`text-5xl font-body font-bold ${mood.color} mb-2`}>
              {score}%
            </p>
          )}

          <p className="text-base font-body text-[var(--exam-on-surface-variant,#777586)] mb-8">
            {mood.desc}
          </p>

          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="px-10 py-3.5 rounded-full font-body font-bold text-sm text-white exam-cta
              shadow-lg shadow-[var(--exam-primary,#5e35f1)]/20 uppercase tracking-widest"
          >
            {t("backToTopic")}
          </button>
        </div>
      </div>
    );
  }

  // ── GRADING / GRADED (returned from API on resume) ──
  if (session.status === "GRADING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--exam-surface,#fdf8fe)]">
        <div className="text-center max-w-sm px-6">
          <span className="material-symbols-outlined text-5xl text-[#2563eb] block mb-4">hourglass_top</span>
          <h2 className="font-body text-xl font-bold text-[var(--exam-on-surface,#33313a)] mb-2">
            {t("awaitingGrade")}
          </h2>
          <p className="text-sm font-body text-[var(--exam-on-surface-variant,#777586)] mb-6">
            {t("submittedAwaitingReview")}
          </p>
          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="px-8 py-3 rounded-full text-sm font-body font-bold text-white exam-cta"
          >
            {t("backToTopic")}
          </button>
        </div>
      </div>
    );
  }

  // ── Active exam: DOING ──
  const currentPhase = session.currentPhase;

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--exam-surface,#fdf8fe)]"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }}
      onCut={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }}
      onPaste={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }}
      style={{ userSelect: "none" }}
    >
      <ExamHeader
        breadcrumb={currentPhase?.breadcrumb || [testTitle]}
        timeRemaining={session.timeRemaining}
        isTimeWarning={session.isTimeWarning}
        isTimeCritical={session.isTimeCritical}
        saveStatus={session.saveStatus}
        lastSavedAt={session.lastSavedAt}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        phases={phases}
        currentPhaseIndex={session.currentPhaseIndex}
        answers={session.answers}
        flaggedQuestions={session.flaggedQuestions}
        goToPhase={session.goToPhase}
      />

      {/* Content area */}
      {currentPhase?.type === "review" ? (
        <ExamReview
          phases={phases}
          answers={session.answers}
          flaggedQuestions={session.flaggedQuestions}
          goToPhase={session.goToPhase}
          onSubmit={session.submit}
          isSubmitting={session.isSubmitting}
        />
      ) : currentPhase ? (
        <ExamPhase
          phase={currentPhase}
          answers={session.answers}
          flaggedQuestions={session.flaggedQuestions}
          onAnswer={session.setAnswer}
          onToggleFlag={session.toggleFlag}
          shuffleAnswers={shuffleAnswers}
          shuffleSeed={practiceTestId}
        />
      ) : null}

      {session.status === "DOING" && (
        <ExamFooter
          onPrevious={session.prevPhase}
          onNext={session.nextPhase}
          isFirstPhase={session.isFirstPhase}
          isLastContentPhase={session.isLastContentPhase}
          isReviewPhase={session.isReviewPhase}
          questionRange={getQuestionRange()}
        />
      )}
    </div>
  );
}
