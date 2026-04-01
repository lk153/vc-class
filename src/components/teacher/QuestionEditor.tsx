"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
};

export default function QuestionEditor({ question }: { question: Question }) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586] text-sm";

  const labelClass =
    "block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teacher/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          content: formData.get("content"),
          answer1: formData.get("answer1"),
          answer2: formData.get("answer2") || null,
          answer3: formData.get("answer3") || null,
          answer4: formData.get("answer4") || null,
          correctAnswer: formData.get("correctAnswer"),
          timer: parseInt(formData.get("timer") as string) || 30,
        }),
      });

      if (!res.ok) {
        toast.error(t("questionSaveFailed"));
        return;
      }

      toast.success(t("questionSaved"));
      setEditing(false);
      router.refresh();
    } catch {
      toast.error(t("questionSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="bg-[#f8f9ff] rounded-xl border border-[#2a14b4]/10 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
            {question.questionNumber}
          </span>
          <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#e3dfff] text-[#2a14b4]">
            {question.questionType}
          </span>
        </div>

        {/* Question content */}
        <div>
          <label className={labelClass}>{t("questionContent")}</label>
          <input
            name="content"
            defaultValue={question.content}
            required
            className={inputClass}
          />
        </div>

        {/* Answers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t("answer1")}</label>
            <input name="answer1" defaultValue={question.answer1} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("answer2")}</label>
            <input name="answer2" defaultValue={question.answer2 || ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("answer3")}</label>
            <input name="answer3" defaultValue={question.answer3 || ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("answer4")}</label>
            <input name="answer4" defaultValue={question.answer4 || ""} className={inputClass} />
          </div>
        </div>

        {/* Correct answer + Timer */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t("correctAnswerLabel")}</label>
            <input name="correctAnswer" defaultValue={question.correctAnswer} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("timerLabel")}</label>
            <input
              name="timer"
              type="number"
              defaultValue={question.timer}
              min={5}
              max={300}
              className={`${inputClass} w-32`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-5 py-2 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
          >
            {ct("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2 rounded-full font-body font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#2a14b4]/20 inline-flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-[16px] ${saving ? "animate-spin" : ""}`}>{saving ? "progress_activity" : "save"}</span>
            {ct("save")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex items-start justify-between py-4 border-b border-[#c7c4d7]/15 last:border-0 last:pb-0 hover:bg-[#f5f3ff] -mx-6 px-6 transition-colors duration-200 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-7 h-7 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
            {question.questionNumber}
          </span>
          <span className="text-[10px] font-body font-bold px-2.5 py-0.5 rounded-full bg-[#e3dfff] text-[#2a14b4]">
            {question.questionType}
          </span>
          <span className="text-xs text-[#777586] font-body">{question.timer}s</span>
        </div>
        <p className="text-sm font-body font-medium text-[#121c2a] mb-1">{question.content}</p>
        <p className="text-xs text-[#777586] font-body">
          {[question.answer1, question.answer2, question.answer3, question.answer4]
            .filter(Boolean)
            .join(" | ")}{" "}
          <span className="text-[#777586]">&rarr;</span>{" "}
          <span className="text-[#1b6b51] font-medium">{question.correctAnswer}</span>
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:text-[#2a14b4] hover:bg-[#e3dfff] transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-3"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    </div>
  );
}
