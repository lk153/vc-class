"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

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
};

type Props = {
  topicId: string;
  practiceTestId: string;
  testTitle: string;
  questions: Question[];
};

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  attempts: number;
};

const OPTION_LABELS = ["A", "B", "C", "D"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PracticeSession({
  topicId,
  practiceTestId,
  testTitle,
  questions,
}: Props) {
  const t = useTranslations("student");
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timer || 30);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [completed, setCompleted] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{ type: "error" | "warning"; message: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showNotice(type: "error" | "warning", message: string) {
    setInlineNotice({ type, message });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setInlineNotice(null), 4000);
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercent = ((currentIndex) / questions.length) * 100;
  const correctSoFar = answers.filter((a) => a.isCorrect).length;
  const accuracyPercent = answers.length > 0 ? Math.round((correctSoFar / answers.length) * 100) : 100;

  // Timer
  useEffect(() => {
    if (feedback || completed) return;
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, feedback, completed]);

  const handleTimeUp = useCallback(() => {
    setFeedback("incorrect");
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedAnswer: "",
        isCorrect: false,
        attempts,
      },
    ]);
    showNotice("error", t("timeUp"));
  }, [currentQuestion, attempts, t]);

  function handleSubmit() {
    if (!selectedAnswer) return;

    const isCorrect =
      selectedAnswer.toLowerCase().trim() ===
      currentQuestion.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      setFeedback("correct");
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selectedAnswer,
          isCorrect: true,
          attempts,
        },
      ]);
    } else {
      if (attempts < 3) {
        setAttempts((a) => a + 1);
        setSelectedAnswer("");
        showNotice("warning", t("tryAgain") + " — " + t("attemptsLeft", { count: 3 - attempts }));
        return;
      }
      setFeedback("incorrect");
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selectedAnswer,
          isCorrect: false,
          attempts,
        },
      ]);
    }
  }

  function handleNext() {
    if (isLastQuestion) {
      finishTest();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setFeedback(null);
    setAttempts(1);
    setTimeLeft(questions[nextIndex].timer);
  }

  async function finishTest() {
    setCompleted(true);
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const totalQuestions = questions.length;
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
      showNotice("error", "Failed to save results");
    }
  }

  // ── Completed State ──
  if (completed) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="font-body min-h-[70vh] flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <span className="material-symbols-outlined text-7xl text-[#2a14b4] mb-6 block">
            emoji_events
          </span>
          <h1 className="font-headline text-5xl italic text-[#121c2a] mb-3">
            {t("assessmentComplete") || "Assessment Complete"}
          </h1>
          <p className="text-6xl font-headline text-[#2a14b4] mb-4">{score}%</p>

          <div className="flex justify-center gap-12 mb-10">
            <div className="text-center">
              <span className="block text-3xl font-headline text-[#1b6b51]">{correctCount}</span>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#464554]">
                {t("correct")}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-headline text-[#7b0020]">
                {questions.length - correctCount}
              </span>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#464554]">
                {t("incorrect")}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-10 py-4 rounded-full font-body font-bold uppercase tracking-widest text-sm transition-all hover:shadow-lg hover:shadow-[#2a14b4]/20 active:scale-95"
          >
            {t("reviewTopic")}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const answerOptions = [
    currentQuestion.answer1,
    currentQuestion.answer2,
    currentQuestion.answer3,
    currentQuestion.answer4,
  ].filter(Boolean) as string[];

  // ── Active Question State ──
  return (
    <div className="font-body relative">
      {/* Inline Notification */}
      {inlineNotice && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl ambient-shadow backdrop-blur-xl border ${
              inlineNotice.type === "error"
                ? "bg-[#ffdada]/90 border-[#7b0020]/10 text-[#7b0020]"
                : "bg-[#e3dfff]/90 border-[#2a14b4]/10 text-[#2a14b4]"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {inlineNotice.type === "error" ? "error" : "warning"}
            </span>
            <span className="font-body font-semibold text-sm tracking-wide">
              {inlineNotice.message}
            </span>
            <button
              onClick={() => setInlineNotice(null)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Module Header */}
      <div className="mb-12">
        <span className="font-body text-xs uppercase tracking-widest text-[#2a14b4] font-bold mb-2 block">
          {testTitle}
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-[#121c2a] tracking-tight">
          {t("moduleAssessment") || "Module Assessment"}
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-start">
        {/* Left Column: Question */}
        <section className="w-full lg:w-3/5">
          <div className="bg-[#eff4ff] p-8 md:p-12 rounded-xl relative overflow-hidden group">
            {/* Accent blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2a14b4]/5 rounded-full -mr-20 -mt-20 blur-3xl transition-all group-hover:bg-[#2a14b4]/10" />

            <div className="relative z-10">
              <label className="font-body text-[10px] uppercase tracking-[0.2em] text-[#777586] font-bold block mb-8">
                Question {String(currentIndex + 1).padStart(2, "0")} of {String(questions.length).padStart(2, "0")}
              </label>

              <h2 className="font-headline italic text-4xl md:text-5xl text-[#121c2a] leading-snug mb-8">
                {currentQuestion.content}
              </h2>

              {/* Feedback */}
              {feedback && (
                <div
                  className={`rounded-xl p-6 ${
                    feedback === "correct"
                      ? "bg-[#a6f2d1]/30 text-[#1b6b51]"
                      : "bg-[#ffdada]/40 text-[#7b0020]"
                  }`}
                >
                  {feedback === "correct" ? (
                    <span className="flex items-center gap-3 font-body font-bold">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      {t("correct")}!
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center gap-3 font-body font-bold mb-1">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          cancel
                        </span>
                        {t("incorrect")}
                      </span>
                      <p className="font-headline italic text-lg ml-9">
                        {t("correctAnswerIs") || "Answer"}: {currentQuestion.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Controls */}
        <aside className="w-full lg:w-2/5 lg:sticky lg:top-32 space-y-8">
          {/* Status Dashboard */}
          <div className="bg-[#eff4ff] p-8 rounded-xl border border-[#c7c4d7]/10">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-[#777586] mb-1">
                  {t("timeRemaining") || "Time Remaining"}
                </span>
                <span className={`text-2xl font-headline italic ${timeLeft <= 5 ? "text-[#7b0020]" : "text-[#2a14b4]"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-widest text-[#777586] mb-1">
                  {t("accuracy") || "Accuracy"}
                </span>
                <span className="text-2xl font-headline italic text-[#1b6b51]">
                  {accuracyPercent}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#777586] font-bold">
                <span>{t("progress")}</span>
                <span>{Math.round(progressPercent)}% {t("complete") || "Complete"}</span>
              </div>
              <div className="h-1 w-full bg-[#d9e3f6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
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
                placeholder={t("typeAnswer") || "Type your answer..."}
                className="w-full px-6 py-5 rounded-full bg-white border border-[#c7c4d7]/20 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 focus:border-[#2a14b4]/40 disabled:opacity-50 font-body text-lg text-[#121c2a] placeholder:text-[#777586]"
                onKeyDown={(e) => e.key === "Enter" && !feedback && handleSubmit()}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {answerOptions.map((option, i) => {
                let btnClass =
                  "w-full text-left p-6 rounded-full flex items-center justify-between transition-all duration-200 active:scale-95 ";

                if (feedback) {
                  if (option === currentQuestion.correctAnswer) {
                    btnClass += "bg-[#a6f2d1]/30 border-2 border-[#1b6b51]/30";
                  } else if (option === selectedAnswer) {
                    btnClass += "bg-[#ffdada]/30 border-2 border-[#7b0020]/30 opacity-70";
                  } else {
                    btnClass += "bg-white border border-[#c7c4d7]/20 opacity-40";
                  }
                } else if (selectedAnswer === option) {
                  btnClass += "bg-[#2a14b4]/5 border-2 border-[#2a14b4]/40";
                } else {
                  btnClass +=
                    "bg-white border border-[#c7c4d7]/20 hover:border-[#2a14b4]/40 hover:bg-[#2a14b4]/5 group";
                }

                return (
                  <button
                    key={i}
                    onClick={() => !feedback && setSelectedAnswer(option)}
                    disabled={!!feedback}
                    className={btnClass}
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className={`w-10 h-10 flex items-center justify-center rounded-full font-headline italic transition-colors ${
                          feedback && option === currentQuestion.correctAnswer
                            ? "bg-[#1b6b51] text-white"
                            : selectedAnswer === option && !feedback
                            ? "bg-[#2a14b4] text-white"
                            : "bg-[#dee9fc] text-[#464554] group-hover:bg-[#2a14b4] group-hover:text-white"
                        }`}
                      >
                        {OPTION_LABELS[i]}
                      </span>
                      <span className="font-body text-lg font-medium text-[#121c2a]">
                        {option}
                      </span>
                    </div>
                    {selectedAnswer === option && !feedback && (
                      <span className="material-symbols-outlined text-[#2a14b4]">check_circle</span>
                    )}
                    {feedback && option === currentQuestion.correctAnswer && (
                      <span
                        className="material-symbols-outlined text-[#1b6b51]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
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
                disabled={!selectedAnswer}
                className="w-full bg-[#2a14b4] text-white h-16 rounded-full font-body font-bold tracking-tight hover:shadow-lg hover:shadow-[#2a14b4]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {t("submitAnswer") || "Submit Answer"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full bg-[#121c2a] text-white h-16 rounded-full font-body font-bold tracking-tight hover:opacity-90 active:scale-95 transition-all"
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
