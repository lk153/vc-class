"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import ModalOverlay from "@/components/ModalOverlay";
import AudioPlayer from "@/components/student/AudioPlayer";
import { useAudioManager } from "@/hooks/useAudioManager";
import ReorderWords from "@/components/student/ReorderWords";
import CueWriting from "@/components/student/CueWriting";
import TrueFalseList from "@/components/student/TrueFalseList";
import MatchingPairs from "@/components/student/MatchingPairs";
import PronunciationQ from "@/components/student/PronunciationQ";
import WordBank from "@/components/student/WordBank";

type Section = {
  id: string;
  parentId: string | null;
  level: "PART" | "GROUP" | "EXERCISE";
  title: string;
  description: string | null;
  sortOrder: number;
  mediaUrl: string | null;
  mediaType: string | null;
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
  sectionId: string | null;
  advancedData: string | null;
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  difficulty?: number;
};

type Props = {
  topicId: string;
  practiceTestId: string;
  testTitle: string;
  questions: Question[];
  sections: Section[];
  totalTime?: number; // total exam time in seconds, default 45 minutes
};

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function ExamSession({
  topicId,
  practiceTestId,
  testTitle,
  questions,
  sections,
  totalTime = 2700,
}: Props) {
  const t = useTranslations("student");
  const ct = useTranslations("common");
  const router = useRouter();
  const { play: playAudio, stopAll } = useAudioManager();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.filter((q) => !q.advancedData || q.questionType !== "CLOZE_PASSAGE").length;

  // Timer
  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, submitted]);

  // Auto-save to localStorage (only on answer changes, not every timer tick)
  useEffect(() => {
    if (submitted) return;
    const timer = setTimeout(() => {
      localStorage.setItem(`exam-${practiceTestId}`, JSON.stringify({ answers, timeLeft }));
    }, 500);
    return () => clearTimeout(timer);
  }, [answers, practiceTestId, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`exam-${practiceTestId}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.answers) setAnswers(data.answers);
        if (data.timeLeft) setTimeLeft(data.timeLeft);
      }
    } catch {}
  }, [practiceTestId]);

  function isQuestionCorrect(q: Question, answer: string): boolean {
    if (!answer) return false;
    if (q.questionType === "WORD_BANK" && q.advancedData) {
      try {
        const adv = JSON.parse(q.advancedData);
        const filled: Record<string, string> = JSON.parse(answer);
        return adv.sentences.every((s: { answer: string }, i: number) =>
          (filled[i] || "").toLowerCase().trim() === s.answer.toLowerCase().trim()
        );
      } catch { return false; }
    }
    if (q.questionType === "MATCHING" && q.advancedData) {
      try {
        const adv = JSON.parse(q.advancedData);
        const pairs: number[][] = JSON.parse(answer);
        return JSON.stringify(pairs.sort()) === JSON.stringify(adv.correctPairs.sort());
      } catch { return false; }
    }
    if (q.questionType === "REORDER_WORDS" && q.advancedData) {
      try {
        const adv = JSON.parse(q.advancedData);
        return answer === adv.correctOrder.join(",");
      } catch { return false; }
    }
    return answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    stopAll();
    localStorage.removeItem(`exam-${practiceTestId}`);

    const answerRecords = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] || "",
      isCorrect: isQuestionCorrect(q, answers[q.id] || ""),
      attempts: 1,
      timeSpent: null,
    }));

    const correctCount = answerRecords.filter((a) => a.isCorrect).length;
    const score = (correctCount / questions.length) * 100;

    try {
      await fetch(`/api/practice/${practiceTestId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalQuestions: questions.length,
          correctCount,
          incorrectCount: questions.length - correctCount,
          score,
          answers: answerRecords,
        }),
      });
    } catch {}

    setShowResults(true);
  }, [submitted, answers, questions, practiceTestId, stopAll]);

  function scrollToQuestion(id: string) {
    questionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Build section tree
  function getChildren(parentId: string | null) {
    return sections.filter((s) => s.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function getQuestionsForSection(sectionId: string) {
    return questions.filter((q) => q.sectionId === sectionId).sort((a, b) => a.questionNumber - b.questionNumber);
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Results view
  if (showResults) {
    const correctCount = questions.filter((q) => isQuestionCorrect(q, answers[q.id] || "")).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="font-body min-h-[70vh] flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <span className="material-symbols-outlined text-7xl text-[#2a14b4] mb-6 block">emoji_events</span>
          <h1 className="font-body text-5xl text-[#121c2a] mb-3">{t("assessmentComplete")}</h1>
          <p className="text-6xl font-body font-bold text-[#2a14b4] mb-4">{score}%</p>
          <p className="text-lg font-body text-[#777586] mb-8">{correctCount} / {questions.length} {t("correct")}</p>
          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-10 py-4 rounded-full font-body font-bold uppercase tracking-widest text-sm transition-all"
          >
            {t("reviewTopic")}
          </button>
        </div>
      </div>
    );
  }

  // Render a question
  function renderQuestion(q: Question) {
    const selected = answers[q.id] || "";
    const opts = [q.answer1, q.answer2, q.answer3, q.answer4].filter(Boolean) as string[];
    return (
      <div
        key={q.id}
        ref={(el) => { questionRefs.current[q.id] = el; }}
        className={`py-5 ${submitted && selected ? (isQuestionCorrect(q, selected) ? "" : "bg-[#ffdada]/10 -mx-4 px-4 rounded-xl") : ""}`}
      >
        <div className="flex gap-4">
          <span className="font-body font-bold text-base text-[#121c2a] shrink-0 w-8">{q.questionNumber}.</span>
          <div className="flex-1">
            <p className="font-body text-base text-[#121c2a] leading-relaxed mb-3 font-medium">{q.content}</p>

            {/* Content media */}
            {q.contentMediaUrl && q.contentMediaType === "image" && (
              <img src={q.contentMediaUrl} alt="" className="max-w-xs rounded-lg mb-3" />
            )}
            {q.contentMediaUrl && q.contentMediaType === "audio" && (
              <div className="mb-3 max-w-md">
                <AudioPlayer src={q.contentMediaUrl} onPlay={(el) => playAudio(el)} compact />
              </div>
            )}

            {/* Answer input — type-specific renderer */}
            {(() => {
              const adv = q.advancedData ? (() => { try { return JSON.parse(q.advancedData); } catch { return null; } })() : null;

              // REORDER_WORDS
              if (q.questionType === "REORDER_WORDS" && adv?.fragments) {
                return <ReorderWords fragments={adv.fragments} value={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} correctOrder={adv.correctOrder} showResult={submitted} />;
              }

              // CUE_WRITING
              if (q.questionType === "CUE_WRITING" && adv?.cues) {
                return <CueWriting cues={adv.cues} hint={adv.hint} value={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} />;
              }

              // PRONUNCIATION
              if (q.questionType === "PRONUNCIATION" && adv?.underlinedParts) {
                return <PronunciationQ answers={opts} underlinedParts={adv.underlinedParts} selected={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} correctAnswer={q.correctAnswer} showResult={submitted} />;
              }

              // STRESS (same as PRONUNCIATION but without underlined parts)
              if (q.questionType === "STRESS") {
                return <PronunciationQ answers={opts} underlinedParts={adv?.stressPositions?.map(() => "") || []} selected={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} correctAnswer={q.correctAnswer} showResult={submitted} />;
              }

              // MATCHING
              if (q.questionType === "MATCHING" && adv?.columnA && adv?.columnB) {
                return <MatchingPairs columnA={adv.columnA} columnB={adv.columnB} value={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} correctPairs={adv.correctPairs} showResult={submitted} />;
              }

              // WORD_BANK
              if (q.questionType === "WORD_BANK" && adv?.wordBank && adv?.sentences) {
                return <WordBank wordBank={adv.wordBank} sentences={adv.sentences} allowReuse={adv.allowReuse} value={selected} onChange={(v) => setAnswer(q.id, v)} disabled={submitted} showResult={submitted} />;
              }

              // GAP_FILL or CUE_WRITING fallback
              if (q.questionType === "GAP_FILL" || q.questionType === "CUE_WRITING") {
                return (
                  <input type="text" value={selected} onChange={(e) => setAnswer(q.id, e.target.value)} disabled={submitted}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#e2e8f0] text-base font-body focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4]/30 outline-none disabled:opacity-50 transition-colors"
                  />
                );
              }

              // Default: MCQ / TRUE_FALSE
              return (
              <div className="space-y-2.5 ml-1">
                {opts.map((opt, i) => {
                  const isCorrectOpt = submitted && opt.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                  const isWrongSelected = submitted && selected === opt && !isCorrectOpt;
                  const isSelected = selected === opt && !submitted;

                  return (
                  <button
                    key={i}
                    onClick={() => !submitted && setAnswer(q.id, opt)}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-4 transition-all border ${
                      isCorrectOpt
                        ? "bg-[#a6f2d1]/20 border-[#1b6b51]/30"
                        : isWrongSelected
                        ? "bg-[#ffdada]/20 border-[#7b0020]/30"
                        : isSelected
                        ? "bg-[#2a14b4]/5 border-[#2a14b4]/40"
                        : submitted
                        ? "bg-white/50 border-[#c7c4d7]/10 opacity-40"
                        : "bg-white border-[#e2e8f0] hover:border-[#2a14b4]/30 hover:bg-[#2a14b4]/[0.02]"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body font-bold shrink-0 ${
                      isCorrectOpt ? "bg-[#1b6b51] text-white"
                      : isWrongSelected ? "bg-[#7b0020] text-white"
                      : isSelected ? "bg-[#2a14b4] text-white"
                      : "bg-[#e3dfff] text-[#2a14b4]"
                    }`}>{OPTION_LABELS[i]}</span>
                    <span className={`text-[15px] font-body ${
                      isCorrectOpt ? "text-[#1b6b51] font-semibold"
                      : isWrongSelected ? "text-[#7b0020] font-medium"
                      : isSelected ? "text-[#2a14b4] font-semibold"
                      : "text-[#121c2a]"
                    }`}>{opt}</span>
                    {isCorrectOpt && <span className="material-symbols-outlined text-[#1b6b51] text-[18px] ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                    {isWrongSelected && <span className="material-symbols-outlined text-[#7b0020] text-[18px] ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>}
                    {isSelected && <span className="material-symbols-outlined text-[#2a14b4] text-[18px] ml-auto">check_circle</span>}
                  </button>
                  );
                })}
              </div>
              );
            })()}

            {/* Show correct answer after submit if wrong */}
            {submitted && selected && selected.toLowerCase().trim() !== q.correctAnswer.toLowerCase().trim() && (
              <p className="text-sm font-body text-[#1b6b51] mt-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="font-semibold">{q.correctAnswer}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render section tree
  function renderSection(section: Section) {
    const children = getChildren(section.id);
    const sectionQuestions = getQuestionsForSection(section.id);

    // Compute question range for EXERCISE level
    let questionRange = "";
    if (section.level === "EXERCISE" && sectionQuestions.length > 0) {
      const first = sectionQuestions[0].questionNumber;
      const last = sectionQuestions[sectionQuestions.length - 1].questionNumber;
      questionRange = first === last ? `Question ${first}` : `Questions ${first}–${last}`;
    }

    return (
      <div key={section.id}>
        {section.level === "PART" && (
          <h3 className="font-body text-xl font-bold text-[#2a14b4] mt-10 mb-4 pb-2 border-b-2 border-[#2a14b4]/20">
            {section.title}
          </h3>
        )}
        {section.level === "GROUP" && (
          <h4 className="font-body text-base font-bold text-[#1b6b51] mt-6 mb-3 uppercase tracking-wider">
            {section.title}
          </h4>
        )}
        {section.level === "EXERCISE" && (
          <div className="mt-5 mb-3 flex items-baseline gap-3 flex-wrap">
            <p className="text-sm font-body text-[#464554] italic">{section.title}</p>
            {questionRange && (
              <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#2a14b4] bg-[#e3dfff] px-2.5 py-0.5 rounded-full">
                {questionRange}
              </span>
            )}
          </div>
        )}
        {section.description && section.level !== "EXERCISE" && (
          <p className="text-sm font-body text-[#777586] mb-3 -mt-1">{section.description}</p>
        )}
        {/* Section-level media */}
        {section.mediaUrl && section.mediaType === "audio" && (
          <div className="mb-4 max-w-md">
            <AudioPlayer src={section.mediaUrl} onPlay={(el) => playAudio(el)} />
          </div>
        )}
        {section.mediaUrl && section.mediaType === "image" && (
          <img src={section.mediaUrl} alt="" className="max-w-md rounded-xl mb-4" />
        )}
        {/* Questions in this section */}
        {sectionQuestions.map((q) => renderQuestion(q))}
        {/* Child sections */}
        {children.map((child) => renderSection(child))}
      </div>
    );
  }

  const rootSections = getChildren(null);
  const unsectionedQuestions = questions.filter((q) => !q.sectionId);

  return (
    <div className="font-body flex gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#f8f9ff]/95 backdrop-blur-sm pb-4 mb-4 border-b border-[#c7c4d7]/15">
          <div className="flex items-center justify-between">
            <h1 className="font-body font-bold text-2xl text-[#121c2a]">{testTitle}</h1>
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-body font-bold text-sm ${
                timeLeft <= 300 ? "bg-[#ffdada] text-[#7b0020] animate-pulse" : "bg-[#e3dfff] text-[#2a14b4]"
              }`}>
                <span className="material-symbols-outlined text-[16px]">timer</span>
                {formatTime(timeLeft)}
              </div>
              {/* Progress */}
              <span className="text-xs font-body text-[#777586]">
                {answeredCount} / {questions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Sections */}
        {rootSections.map((section) => renderSection(section))}

        {/* Unsectioned questions (legacy) */}
        {unsectionedQuestions.length > 0 && (
          <div>
            {unsectionedQuestions.map((q) => renderQuestion(q))}
          </div>
        )}

        {/* Submit */}
        {!submitted && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-12 py-4 rounded-full font-body font-bold uppercase tracking-widest text-sm shadow-lg shadow-[#2a14b4]/20 transition-all"
            >
              {t("submit")}
            </button>
          </div>
        )}
      </div>

      {/* Sidebar — Question Navigator */}
      <aside className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-24 bg-white rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-4">
          <p className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q) => {
              const isAnswered = !!answers[q.id];
              const isCorrect = submitted && isAnswered && isQuestionCorrect(q, answers[q.id]);
              const isWrong = submitted && isAnswered && !isCorrect;

              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-body font-bold transition-all ${
                    isWrong
                      ? "bg-[#ffdada] text-[#7b0020]"
                      : isCorrect
                      ? "bg-[#a6f2d1] text-[#1b6b51]"
                      : isAnswered
                      ? "bg-[#2a14b4] text-white"
                      : "bg-[#f0eef6] text-[#777586] hover:bg-[#e3dfff]"
                  }`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="mt-3 pt-3 border-t border-[#c7c4d7]/15">
              <p className="text-xs font-body text-[#1b6b51] font-bold">
                {questions.filter((q) => isQuestionCorrect(q, answers[q.id] || "")).length} / {questions.length}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Submit Confirmation Modal */}
      <ModalOverlay open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} panelClass="max-w-md">
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#e3dfff] flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#2a14b4]">task_alt</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {t("submit")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-2 leading-relaxed">
            {t("questionOf", {
              current: String(answeredCount),
              total: String(questions.length),
            })}
          </p>
          {answeredCount < questions.length && (
            <p className="text-xs font-body text-[#f59e0b] mb-6 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {questions.length - answeredCount} unanswered
            </p>
          )}
          {answeredCount === questions.length && <div className="mb-6" />}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowSubmitConfirm(false)}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
            >
              {ct("cancel")}
            </button>
            <button
              onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#2a14b4] hover:bg-[#4338ca] shadow-lg shadow-[#2a14b4]/15 transition-all"
            >
              {t("submit")}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
