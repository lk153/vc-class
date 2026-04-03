"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ModalOverlay from "@/components/ModalOverlay";

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

type ModalState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; vocab: Vocab };

export default function VocabularyManager({ topicId, vocabulary }: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [saving, setSaving] = useState(false);


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
        toast.error(t("wordAddFailed"));
        return;
      }

      toast.success(t("wordAdded"));
      setModal({ mode: "closed" });
      router.refresh();
    } catch {
      toast.error(t("wordAddFailed"));
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
        toast.error(t("wordUpdateFailed"));
        return;
      }

      toast.success(t("wordUpdated"));
      setModal({ mode: "closed" });
      router.refresh();
    } catch {
      toast.error(t("wordUpdateFailed"));
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
        toast.error(t("wordDeleteFailed"));
        return;
      }

      toast.success(t("wordDeleted"));
      router.refresh();
    } catch {
      toast.error(t("wordDeleteFailed"));
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/30 bg-[#f8f9ff] text-sm font-body text-[#121c2a] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4] transition-colors";

  const labelClass =
    "block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1.5";

  function closeModal() {
    setModal({ mode: "closed" });
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">dictionary</span>
          </div>
          <div>
            <h2 className="font-body font-bold text-xl text-[#121c2a]">{t("vocabulary")}</h2>
            <p className="text-xs font-body text-[#777586]">{vocabulary.length} {t("wordsCount")}</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-5 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/15 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("addWord")}
        </button>
      </div>

      {/* Vocabulary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vocabulary.map((vocab) => (
          <div
            key={vocab.id}
            onClick={() => setModal({ mode: "edit", vocab })}
            className="group bg-white rounded-xl border border-[#c7c4d7]/20 p-5 hover:border-[#2a14b4]/15 hover:bg-[#f5f3ff] transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-body font-bold text-[#121c2a] text-base mb-1">{vocab.word}</p>
                <p className="text-sm text-[#464554] font-body leading-relaxed">{vocab.meaning}</p>
                {vocab.example && (
                  <p className="text-xs text-[#777586] font-body mt-2 leading-relaxed">
                    <span className="text-[#2a14b4]/60">&ldquo;</span>
                    {vocab.example}
                    <span className="text-[#2a14b4]/60">&rdquo;</span>
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] group-hover:text-[#2a14b4]">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(vocab.id); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:text-[#7b0020] hover:bg-[#ffdada]/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ModalOverlay open={modal.mode !== "closed"} onClose={closeModal} panelClass="max-w-xl">
        <div className="bg-[#f8f9ff] rounded-2xl">
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 md:px-8 pb-6 md:pb-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px] text-[#2a14b4]">
                    {modal.mode === "add" ? "add_circle" : "edit"}
                  </span>
                </div>
                <h3 className="font-body font-bold text-xl text-[#121c2a]">
                  {modal.mode === "add" ? t("addNewWord") : t("editWord")}
                </h3>
              </div>

              {/* Form */}
              <form
                onSubmit={
                  modal.mode === "add"
                    ? handleAdd
                    : (e) => handleUpdate(e, (modal as { mode: "edit"; vocab: Vocab }).vocab.id)
                }
                className="space-y-5"
              >
                <div>
                  <label className={labelClass}>{t("word")}</label>
                  <input
                    name="word"
                    required
                    defaultValue={modal.mode === "edit" ? modal.vocab.word : ""}
                    placeholder={t("word")}
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("meaning")}</label>
                  <textarea
                    name="meaning"
                    required
                    defaultValue={modal.mode === "edit" ? modal.vocab.meaning : ""}
                    placeholder={t("meaning")}
                    rows={3}
                    className={inputClass + " resize-none"}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("example")}</label>
                  <input
                    name="example"
                    defaultValue={modal.mode === "edit" ? (modal.vocab.example || "") : ""}
                    placeholder={t("example")}
                    className={inputClass}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
                  >
                    {ct("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2a14b4] text-white px-6 py-2.5 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${saving ? "animate-spin" : ""}`}>{saving ? "progress_activity" : "save"}</span>
                    {ct("save")}
                  </button>
                </div>
              </form>
            </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
