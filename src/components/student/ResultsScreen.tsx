"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

type AnswerRecord = {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  attempts: number;
  timeSpent?: number;
};

type Question = {
  id: string;
  questionNumber: number;
  content: string;
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  correctAnswer: string;
  difficulty?: number;
};

type Props = {
  topicId: string;
  questions: Question[];
  answers: AnswerRecord[];
  streak: number;
  speedBonusCount: number;
};

export default function ResultsScreen({ topicId, questions, answers, streak, speedBonusCount }: Props) {
  const t = useTranslations("student");
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = questions.length;
  const score = Math.round((correctCount / totalCount) * 100);

  // Difficulty breakdown
  const byDifficulty = [1, 2, 3].map((d) => {
    const qs = questions.filter((q) => (q.difficulty ?? 1) === d);
    const correct = qs.filter((q) => answers.find((a) => a.questionId === q.id)?.isCorrect).length;
    return { level: d, total: qs.length, correct };
  }).filter((d) => d.total > 0);

  // Most challenging: incorrect or slowest
  const incorrect = answers
    .filter((a) => !a.isCorrect)
    .map((a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return q ? { ...q, selectedAnswer: a.selectedAnswer, timeSpent: a.timeSpent } : null;
    })
    .filter(Boolean) as (Question & { selectedAnswer: string; timeSpent?: number })[];

  const diffLabel = (d: number) => d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
  const diffColor = (d: number) => d === 1 ? "text-[#1b6b51]" : d === 2 ? "text-[#f59e0b]" : "text-[#7b0020]";
  const diffBg = (d: number) => d === 1 ? "bg-[#a6f2d1]/30" : d === 2 ? "bg-[#fef3c7]" : "bg-[#ffdada]/30";

  useEffect(() => {
    if (score >= 80) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <div className="font-body min-h-[70vh] flex flex-col items-center px-6 py-10">
      <motion.div
        className="max-w-xl w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Confetti */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 40 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ["#2a14b4", "#f59e0b", "#1b6b51", "#7b0020", "#4338ca", "#a6f2d1"][i % 6],
                }}
                initial={{ top: "-5%", rotate: 0, opacity: 1 }}
                animate={{
                  top: "105%",
                  rotate: Math.random() * 720 - 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.8,
                  ease: "easeIn",
                }}
              />
            ))}
          </div>
        )}

        {/* Score */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
          >
            <span className="material-symbols-outlined text-7xl text-[#2a14b4] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>
              {score >= 80 ? "emoji_events" : score >= 50 ? "thumb_up" : "school"}
            </span>
          </motion.div>
          <h1 className="font-body text-4xl text-[#121c2a] mb-2">{t("assessmentComplete")}</h1>
          <motion.p
            className="text-6xl font-body font-bold text-[#2a14b4]"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", damping: 10 }}
          >
            {score}%
          </motion.p>
          <p className="text-sm font-body text-[#777586] mt-2">
            {score >= 80 ? t("excellentWork") : score >= 50 ? t("goodEffort") : t("keepLearning")}
          </p>
        </div>

        {/* Correct / Incorrect */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center bg-[#a6f2d1]/20 rounded-2xl px-6 py-4">
            <span className="block text-3xl font-body font-bold text-[#1b6b51]">{correctCount}</span>
            <span className="text-[10px] font-body uppercase tracking-widest text-[#464554] font-bold">{t("correct")}</span>
          </div>
          <div className="text-center bg-[#ffdada]/20 rounded-2xl px-6 py-4">
            <span className="block text-3xl font-body font-bold text-[#7b0020]">{totalCount - correctCount}</span>
            <span className="text-[10px] font-body uppercase tracking-widest text-[#464554] font-bold">{t("incorrect")}</span>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        {byDifficulty.length > 1 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {byDifficulty.map((d) => (
              <div key={d.level} className={`${diffBg(d.level)} rounded-2xl p-4 text-center`}>
                <p className={`font-body font-bold text-lg ${diffColor(d.level)}`}>{d.correct}/{d.total}</p>
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{diffLabel(d.level)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Streak + Speed Bonus Stats */}
        {(streak > 0 || speedBonusCount > 0) && (
          <div className="flex justify-center gap-6 mb-8">
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#fef3c7] border border-[#f59e0b]/20">
                <span className="material-symbols-outlined text-[16px] text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="font-body font-bold text-sm text-[#92400e]">{t("bestStreak", { count: streak })}</span>
              </div>
            )}
            {speedBonusCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e3dfff] border border-[#2a14b4]/10">
                <span className="material-symbols-outlined text-[16px] text-[#2a14b4]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="font-body font-bold text-sm text-[#2a14b4]">{t("speedCount", { count: speedBonusCount })}</span>
              </div>
            )}
          </div>
        )}

        {/* Most Challenging */}
        {incorrect.length > 0 && (
          <div className="mb-8">
            <h3 className="font-body font-bold text-sm text-[#121c2a] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#7b0020]">trending_up</span>
              {t("mostChallenging")}
            </h3>
            <div className="space-y-2">
              {incorrect.slice(0, 3).map((q) => (
                <div key={q.id} className="flex items-center gap-3 bg-white rounded-2xl border border-[#c7c4d7]/15 p-3">
                  {/* Thumbnail */}
                  {q.contentMediaUrl && q.contentMediaType === "image" ? (
                    <img src={q.contentMediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : q.contentMediaType === "audio" ? (
                    <div className="w-10 h-10 rounded-lg bg-[#a6f2d1]/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[#1b6b51]">headphones</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                      <span className="font-body font-bold text-xs text-[#2a14b4]">Q{q.questionNumber}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-[#121c2a] truncate">{q.content}</p>
                    <p className="text-xs font-body text-[#777586]">
                      <span className="text-[#7b0020]">{q.selectedAnswer || "—"}</span>
                      {" → "}
                      <span className="text-[#1b6b51] font-medium">{q.correctAnswer}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-8 py-4 rounded-full font-body font-bold uppercase tracking-widest text-xs transition-all"
          >
            {t("reviewTopic")}
          </button>
          <button
            onClick={() => router.refresh()}
            className="bg-[#121c2a] hover:bg-[#121c2a]/90 text-white px-8 py-4 rounded-full font-body font-bold uppercase tracking-widest text-xs transition-all"
          >
            {t("retakeAssessment")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
