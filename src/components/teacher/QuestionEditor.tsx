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
  const ct = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
        toast.error("Failed to save");
        return;
      }

      toast.success("Question updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted">Q{question.questionNumber}</span>
          <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
            {question.questionType}
          </span>
        </div>
        <input
          name="content"
          defaultValue={question.content}
          required
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Question content"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="answer1" defaultValue={question.answer1} required placeholder="Answer 1" className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input name="answer2" defaultValue={question.answer2 || ""} placeholder="Answer 2" className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input name="answer3" defaultValue={question.answer3 || ""} placeholder="Answer 3" className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input name="answer4" defaultValue={question.answer4 || ""} placeholder="Answer 4" className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="correctAnswer" defaultValue={question.correctAnswer} required placeholder="Correct answer" className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Timer (s):</label>
            <input
              name="timer"
              type="number"
              defaultValue={question.timer}
              min={5}
              max={300}
              className="w-24 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted px-3 py-1">
            {ct("cancel")}
          </button>
          <button type="submit" disabled={saving} className="bg-primary text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50">
            {ct("save")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted">Q{question.questionNumber}</span>
          <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
            {question.questionType}
          </span>
          <span className="text-xs text-muted">{question.timer}s</span>
        </div>
        <p className="text-sm font-medium text-foreground">{question.content}</p>
        <p className="text-xs text-muted mt-1">
          {[question.answer1, question.answer2, question.answer3, question.answer4]
            .filter(Boolean)
            .join(" | ")}{" "}
          → <span className="text-success font-medium">{question.correctAnswer}</span>
        </p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="text-muted hover:text-primary p-1"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    </div>
  );
}
