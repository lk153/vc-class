"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Vocab = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  sortOrder: number;
};

type Props = {
  topicId: string;
  vocabulary: Vocab[];
};

export default function VocabularyManager({ topicId, vocabulary }: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teacher/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          word: formData.get("word"),
          meaning: formData.get("meaning"),
          example: formData.get("example") || null,
          sortOrder: vocabulary.length,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to add word");
        return;
      }

      toast.success("Word added");
      setShowAdd(false);
      router.refresh();
    } catch {
      toast.error("Failed to add word");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, vocabId: string) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teacher/vocabulary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vocabId,
          word: formData.get("word"),
          meaning: formData.get("meaning"),
          example: formData.get("example") || null,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to update word");
        return;
      }

      toast.success("Word updated");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Failed to update word");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vocabId: string) {
    try {
      const res = await fetch("/api/teacher/vocabulary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vocabId }),
      });

      if (!res.ok) {
        toast.error("Failed to delete word");
        return;
      }

      toast.success("Word deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete word");
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">
          {t("vocabulary")} ({vocabulary.length})
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("addWord")}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="word" required placeholder={t("word")} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input name="meaning" required placeholder={t("meaning")} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input name="example" placeholder={t("example")} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-muted px-3 py-1">
              {ct("cancel")}
            </button>
            <button type="submit" disabled={saving} className="bg-primary text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50">
              {ct("save")}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vocabulary.map((vocab) =>
          editingId === vocab.id ? (
            <form
              key={vocab.id}
              onSubmit={(e) => handleUpdate(e, vocab.id)}
              className="md:col-span-2 border border-border rounded-lg p-4 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="word" defaultValue={vocab.word} required className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input name="meaning" defaultValue={vocab.meaning} required className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <input name="example" defaultValue={vocab.example || ""} className="px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditingId(null)} className="text-sm text-muted px-3 py-1">
                  {ct("cancel")}
                </button>
                <button type="submit" disabled={saving} className="bg-primary text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50">
                  {ct("save")}
                </button>
              </div>
            </form>
          ) : (
            <div key={vocab.id} className="py-3 px-4 flex items-start justify-between gap-3 border-2 border-[#c7c4d7]/40 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{vocab.word}</p>
                <p className="text-sm text-muted">{vocab.meaning}</p>
                {vocab.example && (
                  <p className="text-xs text-muted italic mt-0.5 truncate">{vocab.example}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingId(vocab.id)}
                  className="text-muted hover:text-primary p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(vocab.id)}
                  className="text-muted hover:text-error p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
