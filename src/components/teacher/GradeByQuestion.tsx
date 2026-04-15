"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Submission = {
  studentAnswerId: string;
  studentName: string;
  studentId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  teacherOverride: boolean | null;
  teacherScore: number | null;
  teacherComment: string | null;
  sessionId: string | null;
  sessionStatus: string | null;
  attemptNumber: number;
};

type QuestionData = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: string;
  correctAnswer: string;
};

type Props = {
  testId: string;
  onClose: () => void;
};

export default function GradeByQuestion({ testId, onClose }: Props) {
  const t = useTranslations("teacher");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [testTitle, setTestTitle] = useState("");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Record<string, { override?: boolean; score?: number; comment?: string; saving?: boolean }>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teacher/practice-tests/${testId}/answers-by-question?questionNumber=${questionNumber}`
      );
      if (res.ok) {
        const data = await res.json();
        setQuestion(data.question);
        setTotalQuestions(data.totalQuestions);
        setTestTitle(data.testTitle);
        setSubmissions(data.submissions);
        setGrades({});
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [testId, questionNumber]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard shortcuts: left/right for navigation, 0-5 for scoring (when focused)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && questionNumber > 1) setQuestionNumber((n) => n - 1);
      if (e.key === "ArrowRight" && questionNumber < totalQuestions) setQuestionNumber((n) => n + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [questionNumber, totalQuestions]);

  async function saveGrade(studentAnswerId: string, sessionId: string | null) {
    const grade = grades[studentAnswerId];
    if (!grade) return;
    if (!sessionId) {
      toast.error("Cannot save: no exam session found for this result");
      return;
    }

    setGrades((prev) => ({ ...prev, [studentAnswerId]: { ...prev[studentAnswerId], saving: true } }));
    try {
      const res = await fetch(`/api/exam-session/${sessionId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grades: [{
            studentAnswerId,
            teacherOverride: grade.override,
            teacherScore: grade.score,
            teacherComment: grade.comment || undefined,
          }],
        }),
      });
      if (res.ok) {
        toast.success("Grade saved");
        fetchData();
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setGrades((prev) => ({ ...prev, [studentAnswerId]: { ...prev[studentAnswerId], saving: false } }));
    }
  }

  const isCueWriting = question?.questionType === "CUE_WRITING";

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#c7c4d7]/15 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-body font-bold text-lg text-[#121c2a]">Grade by Question</h2>
            <p className="text-xs font-body text-[#777586]">{testTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-body font-bold text-[#2a14b4]">
              Q{questionNumber} / {totalQuestions}
            </span>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f0eef6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-[#777586]">close</span>
            </button>
          </div>
        </div>

        {/* Question info */}
        {question && !loading && (
          <div className="px-6 py-4 bg-[#f8f9ff] border-b border-[#c7c4d7]/15 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">
                  {question.questionType.replace(/_/g, " ")} | {submissions.length} submissions
                </span>
                <p className="font-body text-base text-[#121c2a] font-medium mt-1">
                  {question.content}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#1b6b51]">
                  Correct answer
                </span>
                <p className="text-sm font-body font-bold text-[#1b6b51] mt-0.5">{question.correctAnswer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">progress_activity</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-body text-[#777586]">No submissions for this question</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const grade = grades[sub.studentAnswerId] || {};
                const effectiveCorrect = sub.teacherOverride ?? sub.isCorrect;
                return (
                  <div
                    key={sub.studentAnswerId}
                    className={`rounded-2xl p-4 ${
                      sub.teacherOverride === null && isCueWriting
                        ? "bg-[#fef3c7]/20 border-l-3 border-l-[#f59e0b]"
                        : "bg-[#f8f9ff]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#e3dfff] flex items-center justify-center text-[10px] font-bold text-[#2a14b4]">
                          {sub.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-body font-semibold text-[#121c2a]">{sub.studentName}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] ${
                        effectiveCorrect ? "text-[#1b6b51]" : "text-[#7b0020]"
                      }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {effectiveCorrect ? "check_circle" : "cancel"}
                      </span>
                    </div>

                    <p className="text-sm font-body text-[#464554] mb-3 bg-white rounded-lg p-3">
                      {sub.selectedAnswer || <span className="text-[#c7c4d7] italic">No answer</span>}
                    </p>

                    {/* Existing teacher feedback */}
                    {sub.teacherComment && !grade.comment && (
                      <p className="text-xs font-body text-[#777586] italic mb-2">
                        Previous: {sub.teacherComment}
                      </p>
                    )}

                    {/* Grading controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setGrades((p) => ({ ...p, [sub.studentAnswerId]: { ...p[sub.studentAnswerId], override: true } }))}
                        className={`px-3 py-1 rounded-full text-xs font-body font-bold ${
                          grade.override === true ? "bg-[#1b6b51] text-white" : "bg-[#a6f2d1]/30 text-[#1b6b51]"
                        }`}
                      >
                        Correct
                      </button>
                      <button
                        onClick={() => setGrades((p) => ({ ...p, [sub.studentAnswerId]: { ...p[sub.studentAnswerId], override: false } }))}
                        className={`px-3 py-1 rounded-full text-xs font-body font-bold ${
                          grade.override === false ? "bg-[#7b0020] text-white" : "bg-[#ffdada]/30 text-[#7b0020]"
                        }`}
                      >
                        Incorrect
                      </button>

                      {isCueWriting && (
                        <div className="flex items-center gap-1">
                          <input
                            type="range"
                            min="0" max="100" step="10"
                            value={(grade.score ?? (sub.teacherScore != null ? sub.teacherScore * 100 : 0))}
                            onChange={(e) => setGrades((p) => ({
                              ...p, [sub.studentAnswerId]: { ...p[sub.studentAnswerId], score: Number(e.target.value) / 100 }
                            }))}
                            className="w-20 accent-[#2a14b4]"
                          />
                          <span className="text-xs font-body font-bold text-[#2a14b4] w-8">
                            {Math.round((grade.score ?? sub.teacherScore ?? 0) * 100)}%
                          </span>
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Comment..."
                        value={grade.comment ?? sub.teacherComment ?? ""}
                        onChange={(e) => setGrades((p) => ({
                          ...p, [sub.studentAnswerId]: { ...p[sub.studentAnswerId], comment: e.target.value }
                        }))}
                        className="flex-1 min-w-[120px] px-2 py-1 rounded-lg border border-[#c7c4d7]/20 text-xs font-body focus:outline-none focus:ring-1 focus:ring-[#2a14b4]/20"
                      />

                      <button
                        onClick={() => saveGrade(sub.studentAnswerId, sub.sessionId)}
                        disabled={grade.saving || (grade.override === undefined && !grade.comment && grade.score === undefined)}
                        className="px-3 py-1 rounded-full text-xs font-body font-bold text-white bg-[#2a14b4] disabled:opacity-40 flex items-center gap-1"
                      >
                        {grade.saving ? (
                          <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[12px]">save</span>
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-3 border-t border-[#c7c4d7]/15 flex items-center justify-between shrink-0">
          <button
            onClick={() => setQuestionNumber((n) => Math.max(1, n - 1))}
            disabled={questionNumber <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-body font-medium text-[#777586] hover:bg-[#f0eef6] disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Q{questionNumber - 1}
          </button>
          <span className="text-xs font-body text-[#777586]">
            Use ← → arrow keys to navigate
          </span>
          <button
            onClick={() => setQuestionNumber((n) => Math.min(totalQuestions, n + 1))}
            disabled={questionNumber >= totalQuestions}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-body font-medium text-[#777586] hover:bg-[#f0eef6] disabled:opacity-30"
          >
            Q{questionNumber + 1}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
