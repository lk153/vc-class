"use client";

import { useTranslations } from "next-intl";
import AudioPlayer from "@/components/student/AudioPlayer";
import { useAudioManager } from "@/hooks/useAudioManager";
import ReorderWords from "@/components/student/ReorderWords";
import CueWriting from "@/components/student/CueWriting";
import TrueFalseList from "@/components/student/TrueFalseList";
import MatchingPairs from "@/components/student/MatchingPairs";
import PronunciationQ from "@/components/student/PronunciationQ";
import WordBank from "@/components/student/WordBank";
import FlagButton from "./FlagButton";
import { useMemo } from "react";
import type { ExamQuestion } from "@/hooks/useExamPhases";

const OPTION_LABELS = ["A", "B", "C", "D"];

type Props = {
  question: ExamQuestion;
  answer: string;
  onAnswer: (value: string) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  disabled: boolean;
  shuffleAnswers?: boolean;
  shuffleSeed?: string;
};

export default function QuestionRenderer({
  question: q,
  answer,
  onAnswer,
  isFlagged,
  onToggleFlag,
  disabled,
  shuffleAnswers = false,
  shuffleSeed = "",
}: Props) {
  const t = useTranslations("exam");
  const { play: playAudio } = useAudioManager();
  const rawOpts = [q.answer1, q.answer2, q.answer3, q.answer4].filter(Boolean) as string[];

  // Deterministic shuffle of answer options per question
  // Deps use length + individual elements for efficient comparison without JSON.stringify overhead
  const opts = useMemo(() => {
    if (!shuffleAnswers || rawOpts.length <= 1) return rawOpts;
    const seed = shuffleSeed + q.id;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const result = [...rawOpts];
    for (let i = result.length - 1; i > 0; i--) {
      hash = ((hash << 5) - hash + i) | 0;
      const j = Math.abs(hash) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, [shuffleAnswers, shuffleSeed, q.id, rawOpts.length, rawOpts[0], rawOpts[1], rawOpts[2], rawOpts[3]]); // eslint-disable-line react-hooks/exhaustive-deps

  const adv = q.advancedData
    ? (() => {
        try { return JSON.parse(q.advancedData); } catch { return null; }
      })()
    : null;

  function renderAnswerInput() {
    // REORDER_WORDS
    if (q.questionType === "REORDER_WORDS" && adv?.fragments) {
      return (
        <ReorderWords
          fragments={adv.fragments}
          value={answer}
          onChange={onAnswer}
          disabled={disabled}
          correctOrder={adv.correctOrder}
          showResult={false}
        />
      );
    }

    // CUE_WRITING
    if (q.questionType === "CUE_WRITING" && adv?.cues) {
      return (
        <CueWriting
          cues={adv.cues}
          hint={adv.hint}
          value={answer}
          onChange={onAnswer}
          disabled={disabled}
        />
      );
    }

    // PRONUNCIATION
    if (q.questionType === "PRONUNCIATION" && adv?.underlinedParts) {
      return (
        <PronunciationQ
          answers={opts}
          underlinedParts={adv.underlinedParts}
          selected={answer}
          onChange={onAnswer}
          disabled={disabled}
          correctAnswer=""
          showResult={false}
        />
      );
    }

    // STRESS
    if (q.questionType === "STRESS") {
      return (
        <PronunciationQ
          answers={opts}
          underlinedParts={adv?.stressPositions?.map(() => "") || []}
          selected={answer}
          onChange={onAnswer}
          disabled={disabled}
          correctAnswer=""
          showResult={false}
        />
      );
    }

    // MATCHING
    if (q.questionType === "MATCHING" && adv?.columnA && adv?.columnB) {
      return (
        <MatchingPairs
          columnA={adv.columnA}
          columnB={adv.columnB}
          value={answer}
          onChange={onAnswer}
          disabled={disabled}
          correctPairs={adv.correctPairs}
          showResult={false}
        />
      );
    }

    // WORD_BANK
    if (q.questionType === "WORD_BANK" && adv?.wordBank && adv?.sentences) {
      return (
        <WordBank
          wordBank={adv.wordBank}
          sentences={adv.sentences}
          allowReuse={adv.allowReuse}
          value={answer}
          onChange={onAnswer}
          disabled={disabled}
          showResult={false}
        />
      );
    }

    // GAP_FILL or CUE_WRITING fallback
    if (q.questionType === "GAP_FILL" || q.questionType === "CUE_WRITING") {
      return (
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          disabled={disabled}
          placeholder={t("typeYourAnswer")}
          className="w-full px-4 py-3.5 rounded-xl bg-white text-base font-body
            focus:ring-2 focus:ring-[var(--exam-primary,#5e35f1)]/20 focus:outline-none
            disabled:opacity-50 transition-colors exam-ghost-border"
        />
      );
    }

    // Default: MCQ / TRUE_FALSE
    return (
      <div className="space-y-2.5">
        {opts.map((opt, i) => {
          const isSelected = answer === opt;
          return (
            <button
              key={i}
              onClick={() => !disabled && onAnswer(opt)}
              disabled={disabled}
              className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-4 transition-all ${
                isSelected
                  ? "bg-[var(--exam-primary,#5e35f1)]/5 exam-ghost-border"
                  : "bg-[var(--exam-surface,#fdf8fe)] hover:bg-[var(--exam-surface-low,#f7f2fa)] exam-ghost-border"
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body font-bold shrink-0 ${
                  isSelected
                    ? "bg-[var(--exam-primary,#5e35f1)] text-white"
                    : "bg-[#e3dfff] text-[var(--exam-primary,#5e35f1)]"
                }`}
              >
                {OPTION_LABELS[i]}
              </span>
              <span
                className={`text-[15px] font-body ${
                  isSelected
                    ? "text-[var(--exam-primary,#5e35f1)] font-semibold"
                    : "text-[var(--exam-on-surface,#33313a)]"
                }`}
              >
                {opt}
              </span>
              {isSelected && (
                <span className="material-symbols-outlined text-[var(--exam-primary,#5e35f1)] text-[18px] ml-auto">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="py-5 relative">
      {/* Flag button */}
      <div className="absolute top-4 right-0">
        <FlagButton isFlagged={isFlagged} onToggle={onToggleFlag} />
      </div>

      <div className="flex gap-4 pr-12">
        <span className="font-body font-bold text-base text-[var(--exam-on-surface,#33313a)] shrink-0 w-8">
          {q.questionNumber}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-body text-base text-[var(--exam-on-surface,#33313a)] leading-relaxed mb-3 font-medium">
            {q.content}
          </p>

          {/* Content media */}
          {q.contentMediaUrl && q.contentMediaType === "image" && (
            <img src={q.contentMediaUrl} alt="" className="max-w-xs rounded-lg mb-3" />
          )}
          {q.contentMediaUrl && q.contentMediaType === "audio" && (
            <div className="mb-3 max-w-md">
              <AudioPlayer src={q.contentMediaUrl} onPlay={(el) => playAudio(el)} compact />
            </div>
          )}

          {/* Answer input */}
          {renderAnswerInput()}
        </div>
      </div>
    </div>
  );
}
