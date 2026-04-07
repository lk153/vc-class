"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ModalOverlay from "@/components/ModalOverlay";

type VocabItem = {
  id: string;
  word: string;
  type: string | null;
  pronunciation: string | null;
  meaning: string;
  example: string | null;
};

type Props = {
  vocabulary: VocabItem[];
  learnedIds: string[];
  totalCount: number;
};

const PER_PAGE = 12;

export default function VocabGrid({ vocabulary, learnedIds, totalCount }: Props) {
  const t = useTranslations("student");
  const ct = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [currentLearnedIds, setCurrentLearnedIds] = useState<string[]>(learnedIds);
  const [confirmAction, setConfirmAction] = useState<"learn" | "unlearn" | null>(null);
  const [saving, setSaving] = useState(false);

  const learnedSet = new Set(currentLearnedIds);
  const allLearned = vocabulary.length > 0 && currentLearnedIds.length === vocabulary.length;
  const totalPages = Math.ceil(vocabulary.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const pageItems = vocabulary.slice(start, start + PER_PAGE);

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">dictionary</span>
          </div>
          <h2 className="text-2xl font-body font-bold text-[#121c2a]">
            {t("vocabularyCollection")}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-body uppercase tracking-[0.2em] text-[#777586] font-bold hidden sm:block">
            {t("items", { count: totalCount })}
          </span>
          {/* Mark all — segmented pill */}
          <div className="flex rounded-full bg-[#f0eef6] p-1 no-ripple">
            <button
              type="button"
              onClick={() => { if (allLearned) setConfirmAction("unlearn"); }}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-bold transition-all flex items-center gap-1.5 ${
                !allLearned
                  ? "bg-white text-[#777586] shadow-sm"
                  : "text-[#777586]/50 hover:text-[#777586]"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              {t("notLearned")}
            </button>
            <button
              type="button"
              onClick={() => { if (!allLearned) setConfirmAction("learn"); }}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-bold transition-all flex items-center gap-1.5 ${
                allLearned
                  ? "bg-[#1b6b51] text-white shadow-sm"
                  : "text-[#777586]/50 hover:text-[#777586]"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {t("learned")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 min-h-[720px] content-start">
        {pageItems.map((vocab, idx) => {
          const isLearned = learnedSet.has(vocab.id);
          const globalIdx = start + idx;
          return (
            <div
              key={vocab.id}
              className={`group relative rounded-2xl p-6 transition-all duration-300 border h-[220px] overflow-hidden flex flex-col ${
                isLearned
                  ? "bg-white border-[#a6f2d1]/40 shadow-[0_4px_24px_rgba(18,28,42,0.06)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.1)]"
                  : "bg-white/60 border-[#e2e8f0] shadow-[0_2px_12px_rgba(18,28,42,0.03)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.08)] hover:border-[#c7c4d7]/40"
              }`}
            >
              {/* Top row: number + status */}
              <div className="flex items-center justify-between mb-4">
                <span className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
                  {String(globalIdx + 1).padStart(2, "0")}
                </span>
                {isLearned ? (
                  <span
                    className="material-symbols-outlined text-[18px] text-[#1b6b51]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                ) : (
                  <span className="w-[18px] h-[18px] rounded-full border-2 border-[#d9e3f6]" />
                )}
              </div>

              {/* Word + type */}
              <div className="flex items-baseline gap-2 mb-1">
                <h3 className="text-xl font-body font-bold text-[#121c2a] leading-tight">
                  {vocab.word}
                </h3>
                {vocab.type && (
                  <span className="text-xs font-body text-[#2a14b4]/50 italic">{vocab.type}</span>
                )}
              </div>

              {/* Pronunciation */}
              {vocab.pronunciation && (
                <p className="text-xs font-body text-[#777586] italic mb-2">{vocab.pronunciation}</p>
              )}

              {/* Meaning */}
              <p className="text-sm text-[#464554] leading-relaxed mb-4">{vocab.meaning}</p>

              {/* Example */}
              {vocab.example && (
                <div className="pt-4 border-t border-[#e2e8f0]/60">
                  <p className="text-[10px] font-body uppercase tracking-[0.15em] text-[#2a14b4]/50 font-bold mb-1">
                    {t("example")}
                  </p>
                  <p className="text-xs font-body text-[#464554] italic leading-relaxed">
                    &ldquo;{vocab.example}&rdquo;
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-9 h-9 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-body font-bold transition-all ${
                  page === pageNum
                    ? "bg-[#2a14b4] text-white"
                    : "border border-[#c7c4d7]/30 text-[#464554] hover:bg-white"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-9 h-9 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}
      {/* Confirmation Modal */}
      <ModalOverlay open={!!confirmAction} onClose={() => !saving && setConfirmAction(null)} panelClass="max-w-sm">
        <div className="p-6 md:p-8 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${
            confirmAction === "learn" ? "bg-[#a6f2d1]/30" : "bg-[#fef3c7]"
          }`}>
            <span className={`material-symbols-outlined text-[28px] ${
              confirmAction === "learn" ? "text-[#1b6b51]" : "text-[#f59e0b]"
            }`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {confirmAction === "learn" ? "check_circle" : "restart_alt"}
            </span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {confirmAction === "learn" ? t("learned") : t("notLearned")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-6 leading-relaxed">
            {confirmAction === "learn"
              ? `Mark all ${totalCount} words as learned?`
              : `Reset all ${totalCount} words to not learned?`
            }
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setConfirmAction(null)}
              disabled={saving}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                const learned = confirmAction === "learn";
                try {
                  const res = await fetch("/api/flashcards", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      vocabularyIds: vocabulary.map((v) => v.id),
                      learned,
                    }),
                  });
                  if (res.ok) {
                    setCurrentLearnedIds(learned ? vocabulary.map((v) => v.id) : []);
                    toast.success(learned ? `${totalCount} words marked as learned` : `${totalCount} words reset`);
                    setConfirmAction(null);
                    router.refresh();
                  } else {
                    toast.error("Failed to update");
                  }
                } catch {
                  toast.error("Failed to update");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className={`px-6 py-2.5 rounded-full text-sm font-body font-bold text-white shadow-lg transition-all disabled:opacity-40 flex items-center gap-2 ${
                confirmAction === "learn"
                  ? "bg-[#1b6b51] hover:bg-[#155e45] shadow-[#1b6b51]/15"
                  : "bg-[#f59e0b] hover:bg-[#d97706] shadow-[#f59e0b]/15"
              }`}
            >
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {confirmAction === "learn" ? t("learned") : t("notLearned")}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </section>
  );
}
