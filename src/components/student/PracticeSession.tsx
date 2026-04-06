"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import AudioPlayer from "@/components/student/AudioPlayer";
import CircularTimer from "@/components/student/CircularTimer";
import AnswerFeedback from "@/components/student/AnswerFeedback";
import StreakCounter from "@/components/student/StreakCounter";
import QuestionTransition from "@/components/student/QuestionTransition";
import { useAudioManager } from "@/hooks/useAudioManager";
import { useMediaPreloader } from "@/hooks/useMediaPreloader";
import { useSessionDraft } from "@/hooks/useSessionDraft";
import ResultsScreen from "@/components/student/ResultsScreen";

type Question = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: "YES_NO" | "MULTIPLE_CHOICE" | "GAP_FILL";
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

type Props = {
  topicId: string;
  practiceTestId: string;
  testTitle: string;
  questions: Question[];
  testMode?: string;
  shuffleAnswers?: boolean;
  showReviewMoment?: boolean;
};

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  attempts: number;
  timeSpent?: number;
};

type AnswerOption = {
  text: string;
  mediaUrl: string | null;
  mediaType: string | null;
};

const OPTION_LABELS = ["A", "B", "C", "D"];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PracticeSession({
  topicId,
  practiceTestId,
  testTitle,
  questions,
  testMode = "test",
  shuffleAnswers = false,
  showReviewMoment = true,
}: Props) {
  const t = useTranslations("student");
  const router = useRouter();
  const { play: playAudio, stopAll } = useAudioManager();

  const isPracticeMode = testMode === "practice";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timer || 30);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [completed, setCompleted] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{ type: "error" | "warning"; message: string } | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [speedBonus, setSpeedBonus] = useState(false);
  const [speedBonusCount, setSpeedBonusCount] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const questionStartTime = useRef(Date.now());
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requeuedIds = useRef<Set<string>>(new Set());
  const { saveDraft, clearDraft } = useSessionDraft(practiceTestId);

  // Question queue for re-queue support (practice mode)
  const [questionQueue, setQuestionQueue] = useState<Question[]>(questions);

  const currentQuestion = questionQueue[currentIndex];
  const nextQuestion = currentIndex + 1 < questionQueue.length ? questionQueue[currentIndex + 1] : null;
  const isLastQuestion = currentIndex === questionQueue.length - 1;
  const progressPercent = (currentIndex / questionQueue.length) * 100;
  const correctSoFar = answers.filter((a) => a.isCorrect).length;
  const accuracyPercent = answers.length > 0 ? Math.round((correctSoFar / answers.length) * 100) : 100;

  // Preload next question's media
  useMediaPreloader(nextQuestion);

  // Build answer options with media, optionally shuffled
  const answerOptions: AnswerOption[] = useMemo(() => {
    if (!currentQuestion) return [];
    const raw: AnswerOption[] = [
      { text: currentQuestion.answer1, mediaUrl: currentQuestion.answer1MediaUrl ?? null, mediaType: currentQuestion.answer1MediaType ?? null },
      ...(currentQuestion.answer2 ? [{ text: currentQuestion.answer2, mediaUrl: currentQuestion.answer2MediaUrl ?? null, mediaType: currentQuestion.answer2MediaType ?? null }] : []),
      ...(currentQuestion.answer3 ? [{ text: currentQuestion.answer3, mediaUrl: currentQuestion.answer3MediaUrl ?? null, mediaType: currentQuestion.answer3MediaType ?? null }] : []),
      ...(currentQuestion.answer4 ? [{ text: currentQuestion.answer4, mediaUrl: currentQuestion.answer4MediaUrl ?? null, mediaType: currentQuestion.answer4MediaType ?? null }] : []),
    ];
    return shuffleAnswers ? shuffleArray(raw) : raw;
  }, [currentQuestion, shuffleAnswers]);

  const hasImageAnswers = answerOptions.some((a) => a.mediaType === "image");
  const hasAudioAnswers = answerOptions.some((a) => a.mediaType === "audio");

  function showNotice(type: "error" | "warning", message: string) {
    setInlineNotice({ type, message });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setInlineNotice(null), 4000);
  }

  // Check media readiness on question change
  useEffect(() => {
    if (!currentQuestion) return;
    const hasMedia = currentQuestion.contentMediaUrl || answerOptions.some((a) => a.mediaUrl);
    if (!hasMedia) {
      setMediaReady(true);
      return;
    }

    setMediaReady(false);
    let loaded = 0;
    const urls: string[] = [];
    if (currentQuestion.contentMediaUrl && currentQuestion.contentMediaType === "image") urls.push(currentQuestion.contentMediaUrl);
    answerOptions.forEach((a) => { if (a.mediaUrl && a.mediaType === "image") urls.push(a.mediaUrl!); });

    if (urls.length === 0) { setMediaReady(true); return; }
    const total = urls.length;
    let cancelled = false;

    function check() { loaded++; if (!cancelled && loaded >= total) setMediaReady(true); }
    urls.forEach((url) => { const img = new Image(); img.onload = check; img.onerror = check; img.src = url; });

    // Fallback: mark ready after 5s even if images fail
    const fallback = setTimeout(() => { if (!cancelled) setMediaReady(true); }, 5000);
    return () => { cancelled = true; clearTimeout(fallback); };
  }, [currentIndex]);

  // Timer — only ticks when media is ready and not in practice mode
  useEffect(() => {
    if (feedback || completed || !mediaReady || isPracticeMode) return;
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, feedback, completed, mediaReady, isPracticeMode]);

  // Stop audio on question change
  useEffect(() => {
    stopAll();
    questionStartTime.current = Date.now();
  }, [currentIndex, stopAll]);

  const handleTimeUp = useCallback(() => {
    setFeedback("incorrect");
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedAnswer: "",
        isCorrect: false,
        attempts,
        timeSpent: Math.round((Date.now() - questionStartTime.current) / 1000),
      },
    ]);
    showNotice("error", t("timeUp"));
  }, [currentQuestion, attempts, t]);

  function handleSubmit() {
    if (!selectedAnswer) return;

    const isCorrect =
      selectedAnswer.toLowerCase().trim() ===
      currentQuestion.correctAnswer.toLowerCase().trim();

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);

    if (isCorrect) {
      setFeedback("correct");
      setStreak((s) => { const next = s + 1; setMaxStreak((m) => Math.max(m, next)); return next; });
      if (timeSpent <= 5) { setSpeedBonusCount((c) => c + 1); setSpeedBonus(true); setTimeout(() => setSpeedBonus(false), 1500); }
      setAnswers((prev) => [
        ...prev,
        { questionId: currentQuestion.id, selectedAnswer, isCorrect: true, attempts, timeSpent },
      ]);
    } else {
      const maxAttempts = isPracticeMode ? 5 : 3;
      if (attempts < maxAttempts) {
        setAttempts((a) => a + 1);
        setSelectedAnswer("");
        showNotice("warning", t("tryAgain") + " — " + t("attemptsLeft", { count: maxAttempts - attempts }));
        return;
      }
      setFeedback("incorrect");
      setStreak(0);
      setAnswers((prev) => [
        ...prev,
        { questionId: currentQuestion.id, selectedAnswer, isCorrect: false, attempts, timeSpent },
      ]);
      // Re-queue wrong answers in practice mode (max 1 re-queue per question)
      if (isPracticeMode && !requeuedIds.current.has(currentQuestion.id)) {
        requeuedIds.current.add(currentQuestion.id);
        const insertAt = Math.min(currentIndex + 4, questionQueue.length);
        setQuestionQueue((q) => [...q.slice(0, insertAt), currentQuestion, ...q.slice(insertAt)]);
      }
    }
  }

  function handleNext() {
    stopAll();
    if (isLastQuestion) {
      finishTest();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setFeedback(null);
    setAttempts(1);
    setTimeLeft(questionQueue[nextIndex].timer);
    setMediaReady(false);
    // Save draft for resume
    saveDraft({ currentIndex: nextIndex, answers, streak, startedAt: Date.now() });
  }

  async function finishTest() {
    setCompleted(true);
    clearDraft();
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const totalQuestions = questionQueue.length;
    const score = (correctCount / totalQuestions) * 100;

    try {
      await fetch(`/api/practice/${practiceTestId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalQuestions,
          correctCount,
          incorrectCount: totalQuestions - correctCount,
          score,
          answers,
        }),
      });
    } catch {
      // silent
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (completed) return;
    function handleKey(e: KeyboardEvent) {
      if (feedback) {
        if (e.key === "Enter") handleNext();
        return;
      }
      const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < answerOptions.length && currentQuestion.questionType !== "GAP_FILL") {
        setSelectedAnswer(answerOptions[idx].text);
      }
      if (e.key === "Enter" && selectedAnswer && currentQuestion.questionType === "GAP_FILL") {
        handleSubmit();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [feedback, completed, answerOptions, selectedAnswer, currentQuestion]);

  // ── Completed State ──
  if (completed) {
    return (
      <ResultsScreen
        topicId={topicId}
        questions={questionQueue}
        answers={answers}
        streak={maxStreak}
        speedBonusCount={speedBonusCount}
      />
    );
  }

  if (!currentQuestion) return null;

  const diffStars = currentQuestion.difficulty ?? 1;

  // ── Active Question State ──
  return (
    <div className="font-body relative">
      {/* Inline Notification */}
      {inlineNotice && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl ambient-shadow backdrop-blur-xl border ${
            inlineNotice.type === "error"
              ? "bg-[#ffdada]/90 border-[#7b0020]/10 text-[#7b0020]"
              : "bg-[#e3dfff]/90 border-[#2a14b4]/10 text-[#2a14b4]"
          }`}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {inlineNotice.type === "error" ? "error" : "warning"}
            </span>
            <span className="font-body font-semibold text-sm">{inlineNotice.message}</span>
            <button onClick={() => setInlineNotice(null)} className="ml-2 opacity-60 hover:opacity-100">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Answer Feedback (sound + haptic) */}
      <AnswerFeedback result={feedback} />

      {/* Streak Counter */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
        <StreakCounter streak={streak} />
      </div>

      {/* Speed Bonus */}
      {speedBonus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#fef3c7] border border-[#f59e0b]/20 shadow-lg">
          <span className="material-symbols-outlined text-[16px] text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span className="font-body font-bold text-xs text-[#92400e]">{t("speedBonus")}</span>
        </div>
      )}

      {/* Image Preview Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
        </div>
      )}

      {/* Module Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-body text-xs uppercase tracking-widest text-[#2a14b4] font-bold">{testTitle}</span>
          {isPracticeMode && (
            <span className="text-[10px] font-body font-bold px-2.5 py-0.5 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">{t("practiceMode")}</span>
          )}
        </div>
        <h1 className="font-body text-5xl md:text-6xl text-[#121c2a] tracking-tight">{t("moduleAssessment")}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-start">
        {/* Left Column: Question */}
        <section className="w-full lg:w-3/5">
          <QuestionTransition questionIndex={currentIndex} contentMediaType={currentQuestion.contentMediaType}>
          <div className="bg-[#eff4ff] p-8 md:p-12 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2a14b4]/5 rounded-full -mr-20 -mt-20 blur-3xl" />

            <div className="relative z-10">
              {/* Question label + difficulty */}
              <div className="flex items-center gap-3 mb-8">
                <label className="font-body text-[10px] uppercase tracking-[0.2em] text-[#777586] font-bold">
                  {t("questionOf", { current: String(currentIndex + 1).padStart(2, "0"), total: String(questionQueue.length).padStart(2, "0") })}
                </label>
                <span className="flex items-center gap-px">
                  {[1, 2, 3].map((s) => (
                    <span key={s} className={`material-symbols-outlined text-[10px] ${s <= diffStars ? "text-[#f59e0b]" : "text-[#d9e3f6]"}`}
                      style={{ fontVariationSettings: s <= diffStars ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  ))}
                </span>
                {/* Media type badge */}
                {currentQuestion.contentMediaType && (
                  <span className={`text-[10px] font-body font-bold px-2 py-0.5 rounded-full ${
                    currentQuestion.contentMediaType === "audio" ? "bg-[#a6f2d1]/40 text-[#1b6b51]"
                    : currentQuestion.contentMediaType === "video" ? "bg-[#ffdada]/40 text-[#7b0020]"
                    : "bg-[#e3dfff] text-[#2a14b4]"
                  }`}>
                    {currentQuestion.contentMediaType === "audio" ? t("listening") : currentQuestion.contentMediaType === "video" ? t("video") : t("visual")}
                  </span>
                )}
                {/* Bookmark */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const qid = currentQuestion.id;
                    const isBookmarked = bookmarkedIds.has(qid);
                    setBookmarkedIds((prev) => {
                      const next = new Set(prev);
                      if (isBookmarked) next.delete(qid); else next.add(qid);
                      return next;
                    });
                    fetch("/api/student/bookmarks", {
                      method: isBookmarked ? "DELETE" : "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ questionId: qid }),
                    }).catch(() => {});
                  }}
                  className="ml-auto no-ripple"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] transition-colors ${bookmarkedIds.has(currentQuestion.id) ? "text-[#f59e0b]" : "text-[#c7c4d7] hover:text-[#f59e0b]"}`}
                    style={{ fontVariationSettings: bookmarkedIds.has(currentQuestion.id) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    bookmark
                  </span>
                </button>
              </div>

              {/* Question text */}
              <h2 className="font-body text-3xl md:text-4xl text-[#121c2a] leading-snug mb-6">{currentQuestion.content}</h2>

              {/* Content media */}
              {currentQuestion.contentMediaUrl && currentQuestion.contentMediaType === "image" && (
                <div className="mb-6 rounded-xl overflow-hidden bg-[#121c2a]/5">
                  <img src={currentQuestion.contentMediaUrl} alt="" className="w-full max-h-[300px] object-contain" />
                </div>
              )}
              {currentQuestion.contentMediaUrl && currentQuestion.contentMediaType === "audio" && (
                <div className="mb-6">
                  <AudioPlayer
                    src={currentQuestion.contentMediaUrl}
                    playLimit={currentQuestion.audioPlayLimit}
                    onPlay={(el) => playAudio(el)}
                  />
                </div>
              )}
              {currentQuestion.contentMediaUrl && currentQuestion.contentMediaType === "video" && (
                <div className="mb-6 rounded-xl overflow-hidden bg-[#121c2a]">
                  <video src={currentQuestion.contentMediaUrl} controls className="w-full max-h-[300px]" />
                </div>
              )}

              {/* Loading indicator for media */}
              {!mediaReady && (
                <div className="flex items-center gap-3 text-[#777586] mb-6">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span className="text-sm font-body">{t("loadingMedia")}</span>
                </div>
              )}

              {/* Feedback + review moment */}
              {feedback && (
                <div className={`rounded-xl p-6 ${
                  feedback === "correct" ? "bg-[#a6f2d1]/30 text-[#1b6b51]" : "bg-[#ffdada]/40 text-[#7b0020]"
                }`}>
                  {feedback === "correct" ? (
                    <span className="flex items-center gap-3 font-body font-bold">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {t("correct")}!
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center gap-3 font-body font-bold mb-1">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                        {t("incorrect")}
                      </span>
                      <p className="font-body text-lg ml-9">{t("correctAnswerIs")}: {currentQuestion.correctAnswer}</p>
                    </div>
                  )}
                  {/* Explanation */}
                  {showReviewMoment && currentQuestion.explanation && (
                    <div className="mt-4 pt-4 border-t border-current/10">
                      <p className="font-body text-sm opacity-80">{currentQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </QuestionTransition>
        </section>

        {/* Right Column: Controls */}
        <aside className="w-full lg:w-2/5 lg:sticky lg:top-32 space-y-8">
          {/* Status Dashboard */}
          <div className="bg-[#eff4ff] p-6 rounded-xl border border-[#c7c4d7]/10">
            <div className="flex items-center justify-between mb-6">
              {/* Timer */}
              {!isPracticeMode ? (
                <CircularTimer timeLeft={timeLeft} totalTime={currentQuestion.timer} paused={!mediaReady} />
              ) : (
                <div className="flex items-center gap-2 text-[#1b6b51]">
                  <span className="material-symbols-outlined text-[20px]">self_improvement</span>
                  <span className="text-xs font-body font-bold uppercase tracking-widest">{t("practiceMode")}</span>
                </div>
              )}
              {/* Accuracy */}
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-widest text-[#777586] mb-1">{t("accuracy")}</span>
                <span className="text-2xl font-body text-[#1b6b51]">{accuracyPercent}%</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#777586] font-bold">
                <span>{t("progress")}</span>
                <span>{Math.round(progressPercent)}% {t("complete")}</span>
              </div>
              <div className="h-1 w-full bg-[#d9e3f6] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Answer Options */}
          {currentQuestion.questionType === "GAP_FILL" ? (
            <div>
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={!!feedback}
                placeholder={t("typeAnswer")}
                className="w-full px-6 py-5 rounded-full bg-white border border-[#c7c4d7]/20 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 disabled:opacity-50 font-body text-lg text-[#121c2a] placeholder:text-[#777586]"
                onKeyDown={(e) => e.key === "Enter" && !feedback && handleSubmit()}
              />
            </div>
          ) : hasImageAnswers ? (
            /* ── Image Answer Grid ── */
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              {answerOptions.map((option, i) => {
                let cardClass = "rounded-xl overflow-hidden border-2 transition-all cursor-pointer ";
                if (feedback) {
                  if (option.text === currentQuestion.correctAnswer) cardClass += "border-[#1b6b51] ring-2 ring-[#1b6b51]/20";
                  else if (option.text === selectedAnswer) cardClass += "border-[#7b0020] ring-2 ring-[#7b0020]/20 opacity-70";
                  else cardClass += "border-[#c7c4d7]/20 opacity-40";
                } else if (selectedAnswer === option.text) {
                  cardClass += "border-[#2a14b4] ring-2 ring-[#2a14b4]/20";
                } else {
                  cardClass += "border-[#c7c4d7]/20 hover:border-[#2a14b4]/40";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !feedback && setSelectedAnswer(option.text)}
                    disabled={!!feedback}
                    className={cardClass}
                  >
                    {option.mediaUrl && option.mediaType === "image" && (
                      <div
                        className="aspect-square bg-[#f0eef6] overflow-hidden relative"
                        onContextMenu={(e) => { e.preventDefault(); setPreviewImage(option.mediaUrl); }}
                      >
                        <img src={option.mediaUrl} alt={option.text} className="w-full h-full object-cover" />
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-white text-[14px]">zoom_in</span>
                        </span>
                      </div>
                    )}
                    <div className="p-3 flex items-center gap-2 bg-white">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-body font-bold ${
                        feedback && option.text === currentQuestion.correctAnswer ? "bg-[#1b6b51] text-white"
                        : selectedAnswer === option.text && !feedback ? "bg-[#2a14b4] text-white"
                        : "bg-[#dee9fc] text-[#464554]"
                      }`}>
                        {OPTION_LABELS[i]}
                      </span>
                      <span className="font-body text-sm font-medium text-[#121c2a] truncate">{option.text}</span>
                      {feedback && option.text === currentQuestion.correctAnswer && (
                        <span className="material-symbols-outlined text-[#1b6b51] text-[16px] ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : hasAudioAnswers ? (
            /* ── Audio Answer List ── */
            <div className="space-y-3">
              {answerOptions.map((option, i) => {
                let rowClass = "w-full rounded-xl p-4 flex items-center gap-3 transition-all border-2 ";
                if (feedback) {
                  if (option.text === currentQuestion.correctAnswer) rowClass += "border-[#1b6b51]/30 bg-[#a6f2d1]/10";
                  else if (option.text === selectedAnswer) rowClass += "border-[#7b0020]/30 bg-[#ffdada]/10 opacity-70";
                  else rowClass += "border-transparent bg-white opacity-40";
                } else if (selectedAnswer === option.text) {
                  rowClass += "border-[#2a14b4]/40 bg-[#2a14b4]/5";
                } else {
                  rowClass += "border-transparent bg-white hover:border-[#c7c4d7]/30";
                }

                return (
                  <button key={i} type="button" onClick={() => !feedback && setSelectedAnswer(option.text)} disabled={!!feedback} className={rowClass}>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-body font-bold shrink-0 ${
                      feedback && option.text === currentQuestion.correctAnswer ? "bg-[#1b6b51] text-white"
                      : selectedAnswer === option.text && !feedback ? "bg-[#2a14b4] text-white"
                      : "bg-[#dee9fc] text-[#464554]"
                    }`}>{OPTION_LABELS[i]}</span>
                    <div className="flex-1 min-w-0">
                      {option.mediaUrl && option.mediaType === "audio" && (
                        <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                          <AudioPlayer src={option.mediaUrl} compact onPlay={(el) => playAudio(el)} />
                        </div>
                      )}
                      <span className="font-body text-sm text-[#121c2a]">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Text Answer List (default) ── */
            <div className="space-y-4">
              {answerOptions.map((option, i) => {
                let btnClass = "w-full text-left p-6 rounded-full flex items-center justify-between transition-all duration-200 ";
                if (feedback) {
                  if (option.text === currentQuestion.correctAnswer) btnClass += "bg-[#a6f2d1]/30 border-2 border-[#1b6b51]/30";
                  else if (option.text === selectedAnswer) btnClass += "bg-[#ffdada]/30 border-2 border-[#7b0020]/30 opacity-70";
                  else btnClass += "bg-white border border-[#c7c4d7]/20 opacity-40";
                } else if (selectedAnswer === option.text) {
                  btnClass += "bg-[#2a14b4]/5 border-2 border-[#2a14b4]/40";
                } else {
                  btnClass += "bg-white border border-[#c7c4d7]/20 hover:border-[#2a14b4]/40 hover:bg-[#2a14b4]/5 group";
                }

                return (
                  <button key={i} onClick={() => !feedback && setSelectedAnswer(option.text)} disabled={!!feedback} className={btnClass}>
                    <div className="flex items-center gap-6">
                      <span className={`w-10 h-10 flex items-center justify-center rounded-full font-body transition-colors ${
                        feedback && option.text === currentQuestion.correctAnswer ? "bg-[#1b6b51] text-white"
                        : selectedAnswer === option.text && !feedback ? "bg-[#2a14b4] text-white"
                        : "bg-[#dee9fc] text-[#464554] group-hover:bg-[#2a14b4] group-hover:text-white"
                      }`}>{OPTION_LABELS[i]}</span>
                      <span className="font-body text-lg font-medium text-[#121c2a]">{option.text}</span>
                    </div>
                    {selectedAnswer === option.text && !feedback && (
                      <span className="material-symbols-outlined text-[#2a14b4]">check_circle</span>
                    )}
                    {feedback && option.text === currentQuestion.correctAnswer && (
                      <span className="material-symbols-outlined text-[#1b6b51]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4">
            {!feedback ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || !mediaReady}
                className="w-full bg-[#2a14b4] text-white h-16 rounded-full font-body font-bold tracking-tight hover:shadow-lg hover:shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("submitAnswer")}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full bg-[#121c2a] text-white h-16 rounded-full font-body font-bold tracking-tight hover:opacity-90 transition-all"
              >
                {isLastQuestion ? t("results") : t("nextQuestion")}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
