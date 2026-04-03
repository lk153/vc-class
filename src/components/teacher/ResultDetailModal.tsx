"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { toast } from "sonner";
import ModalOverlay from "@/components/ModalOverlay";

type Answer = {
  id: string;
  questionNumber: number;
  content: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type Comment = {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
};

type ResultDetail = {
  id: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  student: { name: string; email: string };
  testName: string;
  topicName: string;
  language: string;
  answers: Answer[];
  comments: Comment[];
};

type Props = {
  resultId: string;
  onClose: () => void;
};

export default function ResultDetailModal({ resultId, onClose }: Props) {
  const t = useTranslations("teacher");
  const [data, setData] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/student-results/${resultId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);


  async function handlePostFeedback() {
    if (!feedbackContent.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/teacher/student-results/${resultId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: feedbackContent.trim() }),
      });
      if (!res.ok) {
        toast.error(t("commentFailed"));
        return;
      }
      toast.success(t("commentPosted"));
      setFeedbackContent("");
      fetchDetail();
    } catch {
      toast.error(t("commentFailed"));
    } finally {
      setPosting(false);
    }
  }

  const initials = data
    ? data.student.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <ModalOverlay open={true} onClose={onClose} panelClass="max-w-4xl">
      <div className="bg-[#f8f9ff] max-h-[90vh] overflow-y-auto rounded-2xl">
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-3xl">
              progress_activity
            </span>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-[#777586]">{t("noResults")}</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pr-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#e3dfff] flex items-center justify-center text-base font-bold text-[#2a14b4] shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="font-body font-bold text-2xl text-[#121c2a] truncate">
                    {data.student.name}
                  </h2>
                  <p className="text-sm font-body text-[#777586] truncate">{data.student.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-3 py-1.5 rounded-full w-fit shrink-0">
                {tLang(t, data.language)}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                  {t("testNameCol")}
                </p>
                <p className="font-body font-bold text-base text-[#121c2a] font-semibold truncate">
                  {data.testName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                  {t("topicCol")}
                </p>
                <p className="font-body font-bold text-base text-[#121c2a] font-semibold truncate">
                  {data.topicName}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                  {t("scoreCol")}
                </p>
                <p
                  className={`font-body font-bold text-2xl ${
                    data.score >= 80
                      ? "text-[#1b6b51]"
                      : data.score >= 50
                      ? "text-[#2a14b4]"
                      : "text-[#7b0020]"
                  }`}
                >
                  {Math.round(data.score)}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                  {t("submittedDate")}
                </p>
                <p className="font-body font-bold text-base text-[#121c2a]">
                  {(() => { const d = new Date(data.completedAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })()}
                </p>
              </div>
            </div>

            {/* Answer Details */}
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#c7c4d7]/15">
                <h3 className="font-body font-bold text-lg text-[#121c2a] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2a14b4] text-[20px]">fact_check</span>
                  {t("answerDetails")}
                  <span className="text-sm font-body font-normal text-[#777586] ml-1">
                    {data.correctCount}/{data.totalQuestions} {t("correctCol").toLowerCase()}
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-[#eff4ff]/50 text-[10px] font-bold uppercase tracking-[0.1em] text-[#464554]/70">
                      <th className="px-5 py-2.5 w-10">#</th>
                      <th className="px-5 py-2.5">{t("question")}</th>
                      <th className="px-5 py-2.5">{t("studentAnswer")}</th>
                      <th className="px-5 py-2.5">{t("correctAnswer")}</th>
                      <th className="px-5 py-2.5 text-center">{t("resultCol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c7c4d7]/10">
                    {data.answers.map((a) => (
                      <tr
                        key={a.id}
                        className={`transition-colors ${
                          a.isCorrect ? "hover:bg-[#a6f2d1]/10" : "hover:bg-[#ffdada]/10"
                        }`}
                      >
                        <td className="px-5 py-3 text-sm font-body text-[#777586]">
                          Q{a.questionNumber}
                        </td>
                        <td className="px-5 py-3 text-sm font-body text-[#121c2a]">
                          {a.content}
                        </td>
                        <td className="px-5 py-3 text-sm font-body font-medium">
                          <span className={a.isCorrect ? "text-[#1b6b51]" : "text-[#7b0020]"}>
                            {a.selectedAnswer}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-body text-[#1b6b51] font-medium">
                          {a.correctAnswer}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {a.isCorrect ? (
                            <span className="material-symbols-outlined text-[#1b6b51] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-[#7b0020] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              cancel
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher Feedback */}
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-5">
              <h3 className="font-body font-bold text-lg text-[#121c2a] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2a14b4] text-[20px]">chat</span>
                {t("teacherFeedback")}
              </h3>

              {data.comments.length > 0 && (
                <div className="space-y-3 mb-5">
                  {data.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-b border-[#c7c4d7]/15 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-[#e3dfff] flex items-center justify-center text-[10px] font-bold text-[#2a14b4]">
                          {comment.userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-body font-semibold text-[#121c2a]">
                          {comment.userName}
                        </span>
                        <span className="text-xs font-body text-[#777586]">
                          {(() => { const d = new Date(comment.createdAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; })()}
                        </span>
                      </div>
                      <p className="text-sm font-body text-[#464554] pl-8">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  rows={3}
                  placeholder={t("addFeedback") + "..."}
                  className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePostFeedback}
                    disabled={posting || !feedbackContent.trim()}
                    className="bg-[#2a14b4] text-white px-5 py-2 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${posting ? "animate-spin" : ""}`}>{posting ? "progress_activity" : "send"}</span>
                    {t("addFeedback")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
