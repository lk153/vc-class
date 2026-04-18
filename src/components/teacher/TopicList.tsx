"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import ModalOverlay from "@/components/ModalOverlay";
import { RequiredMark, RequiredFieldsHint } from "@/components/RequiredMark";

type Topic = {
  id: string;
  title: string;
  description: string | null;
  languageName: string;
  languageId: string;
  vocabCount: number;
  assignmentCount: number;
};

type Language = { id: string; code: string; name: string };

type Props = {
  topics: Topic[];
  languages: Language[];
  teacherId: string;
};

export default function TopicList({ topics, languages, teacherId }: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterLangId, setFilterLangId] = useState<string | null>(null);
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination — mirrors PracticeTestGrid pattern. 9 per page so the 3-col grid
  // (lg:grid-cols-3) fills exactly 3 rows of cards.
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  // Reset to page 1 whenever the filter changes
  useEffect(() => { setPage(1); }, [filterLangId]);

  const deleteTarget = topics.find((t) => t.id === deleteTopicId) ?? null;

  async function handleDelete() {
    if (!deleteTopicId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/teacher/topics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTopicId }),
      });
      if (!res.ok) {
        toast.error(t("topicDeleteFailed"));
        return;
      }
      toast.success(t("topicDeleted"));
      setDeleteTopicId(null);
      router.refresh();
    } catch {
      toast.error(t("topicDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const filteredTopics = filterLangId
    ? topics.filter((t) => t.languageId === filterLangId)
    : topics;

  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedTopics = filteredTopics.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teacher/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          languageId: formData.get("languageId"),
          createdById: teacherId,
        }),
      });

      if (!res.ok) {
        toast.error(t("topicCreateFailed"));
        return;
      }

      toast.success(t("topicCreated"));
      setShowCreate(false);
      router.refresh();
    } catch {
      toast.error(t("topicCreateFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Editorial Header — matches Classes page layout */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
            {t("topics")}
          </h1>
          <p className="text-lg font-body text-[#464554] opacity-80">
            {t("topicsSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("createNewTopic")}
        </button>
      </div>

      {/* Language Filter */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mr-2">
          {ct("filter")}
        </span>
        <button
          onClick={() => setFilterLangId(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
            filterLangId === null
              ? "bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/20"
              : "bg-white text-[#464554] hover:bg-[#eff4ff] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]"
          }`}
        >
          {ct("all")}
        </button>
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setFilterLangId(lang.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
              filterLangId === lang.id
                ? "bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/20"
                : "bg-white text-[#464554] hover:bg-[#eff4ff] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]"
            }`}
          >
            {tLang(t, lang.name)}
          </button>
        ))}
      </div>

      {/* Topic Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedTopics.map((topic) => (
          <Link
            key={topic.id}
            href={`/teacher/topics/${topic.id}`}
            className="group bg-[var(--color-card,#fff)] rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-6 transition-all duration-200 block hover:shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2a14b4]">menu_book</span>
              </div>
              <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                {tLang(t, topic.languageName)}
              </span>
            </div>
            <h3 className="font-body font-bold text-2xl text-[#121c2a] mb-2 group-hover:text-[#2a14b4] transition-colors">
              {topic.title}
            </h3>
            {topic.description && (
              <p className="text-sm text-[#464554] font-body mb-6 leading-relaxed line-clamp-2">
                {topic.description}
              </p>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-[#c7c4d7]/15">
              <div className="flex gap-6">
                <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                  <span className="material-symbols-outlined text-[14px]">dictionary</span>
                  {topic.vocabCount} {t("wordsCount")}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  {topic.assignmentCount} {t("learnersCount")}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={t("topicDeleteConfirmTitle")}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTopicId(topic.id); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#7b0020] bg-[#ffdada]/20 hover:bg-[#ffdada]/40 transition-all invisible group-hover:visible"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                <span className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center group-hover:bg-[#2a14b4] group-hover:text-white text-[#464554] transition-all">
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </Link>
        ))}

      </div>

      {/* Pagination — M3 style, mirrors PracticeTestGrid */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            // Show: first, last, current ±1; collapse the rest into an ellipsis
            const show = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
            const prevShow = p > 1 && (p - 1 === 1 || p - 1 === totalPages || Math.abs(p - 1 - safePage) <= 1);
            if (!show && !prevShow) return null;
            if (!show && prevShow) return (
              <span key={`e${p}`} className="w-8 h-8 flex items-center justify-center text-xs font-body text-[#777586]">…</span>
            );
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-bold transition-all ${
                  p === safePage
                    ? "bg-[#2a14b4] text-white shadow-[0_1px_3px_rgba(42,20,180,0.3)]"
                    : "text-[#464554] hover:bg-[#f0eef6] hover:text-[#2a14b4]"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <span className="ml-3 text-xs font-body text-[#777586]">
            {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredTopics.length)} of {filteredTopics.length}
          </span>
        </div>
      )}

      {/* Create Topic Modal */}
      <ModalOverlay
        open={showCreate}
        onClose={() => !creating && setShowCreate(false)}
        panelClass="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="p-6 md:p-8">
          <h3 className="font-body font-bold text-2xl text-[#121c2a] mb-1">{t("createNewTopic")}</h3>
          <RequiredFieldsHint text={ct("requiredFieldsHint")} />
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                {t("topicTitle")} <RequiredMark />
              </label>
              <input
                name="title"
                required
                className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586]"
                placeholder={t("topicTitlePlaceholder")}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                {t("topicLanguage")} <RequiredMark />
              </label>
              <select
                name="languageId"
                required
                className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a]"
              >
                <option value="">{t("topicSelectLanguage")}</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {tLang(t, lang.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
              {t("topicDescription")}
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586] resize-none"
              placeholder={t("topicDescriptionPlaceholder")}
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              disabled={creating}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#2a14b4]/20 inline-flex items-center gap-2"
            >
              <span className={`material-symbols-outlined text-[16px] ${creating ? "animate-spin" : ""}`}>{creating ? "progress_activity" : "add"}</span>
              {ct("create")}
            </button>
          </div>
        </form>
      </ModalOverlay>

      {/* Delete Topic Confirmation */}
      <ModalOverlay open={!!deleteTopicId} onClose={() => !deleting && setDeleteTopicId(null)} panelClass="max-w-md">
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffdada]/40 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#7b0020]">delete_forever</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {t("topicDeleteConfirmTitle")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-2 leading-relaxed">
            {t("topicDeleteConfirmMessage")}
            {deleteTarget && (
              <span className="block mt-1 font-bold text-[#121c2a]">&ldquo;{deleteTarget.title}&rdquo;</span>
            )}
          </p>
          <p className="text-xs font-body text-[#7b0020] mb-6">
            {t("topicDeleteWarning")}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setDeleteTopicId(null)}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#7b0020] hover:bg-[#5c0017] shadow-lg shadow-[#7b0020]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {ct("delete")}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
