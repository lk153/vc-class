"use client";

import { useEffect, useRef } from "react";
import AudioPlayer from "@/components/student/AudioPlayer";
import { useAudioManager } from "@/hooks/useAudioManager";
import QuestionRenderer from "./QuestionRenderer";
import type { Phase } from "@/hooks/useExamPhases";

type Props = {
  phase: Phase;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onAnswer: (questionId: string, value: string) => void;
  onToggleFlag: (questionId: string) => void;
  shuffleAnswers?: boolean;
  shuffleSeed?: string;
};

export default function ExamPhase({
  phase,
  answers,
  flaggedQuestions,
  onAnswer,
  onToggleFlag,
  shuffleAnswers = false,
  shuffleSeed = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { play: playAudio } = useAudioManager();

  // Scroll to top on phase change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase.id]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      {/* Phase title */}
      <div className="mb-6">
        <h2 className="font-body text-xl font-bold text-[var(--exam-on-surface,#33313a)] mb-1">
          {phase.title}
        </h2>
        {phase.sectionDescription && (
          <p className="text-sm font-body text-[var(--exam-on-surface-variant,#777586)] leading-relaxed">
            {phase.sectionDescription}
          </p>
        )}
      </div>

      {/* Section-level media (pinned) */}
      {phase.sectionMedia && phase.sectionMedia.type === "audio" && (
        <div className="mb-6 max-w-md">
          <AudioPlayer src={phase.sectionMedia.url} onPlay={(el) => playAudio(el)} />
        </div>
      )}
      {phase.sectionMedia && phase.sectionMedia.type === "image" && (
        <img src={phase.sectionMedia.url} alt="" className="max-w-md rounded-xl mb-6" />
      )}

      {/* Questions */}
      <div className="space-y-6">
        {phase.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            answer={answers[q.id] || ""}
            onAnswer={(val) => onAnswer(q.id, val)}
            isFlagged={flaggedQuestions.has(q.id)}
            onToggleFlag={() => onToggleFlag(q.id)}
            disabled={false}
            shuffleAnswers={shuffleAnswers}
            shuffleSeed={shuffleSeed}
          />
        ))}
      </div>
    </div>
  );
}
