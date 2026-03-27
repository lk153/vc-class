"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

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

  const filteredTopics = filterLangId
    ? topics.filter((t) => t.languageId === filterLangId)
    : topics;

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
        toast.error("Failed to create topic");
        return;
      }

      toast.success("Topic created");
      setShowCreate(false);
      router.refresh();
    } catch {
      toast.error("Failed to create topic");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl ambient-shadow p-8 mb-10"
        >
          <h3 className="font-headline text-2xl text-[#121c2a] mb-6">Create New Topic</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                Title
              </label>
              <input
                name="title"
                required
                className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586]"
                placeholder="Enter topic title..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                Language
              </label>
              <select
                name="languageId"
                required
                className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a]"
              >
                <option value="">Select language...</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586]"
              placeholder="Brief description of the topic..."
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-6 py-2.5 text-sm font-body text-[#777586] hover:text-[#121c2a] transition"
            >
              {ct("cancel")}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#2a14b4]/20"
            >
              {ct("create")}
            </button>
          </div>
        </form>
      )}

      {/* Language Filter */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mr-2">
          Filter
        </span>
        <button
          onClick={() => setFilterLangId(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
            filterLangId === null
              ? "bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/20"
              : "bg-white text-[#464554] hover:bg-[#eff4ff] ambient-shadow"
          }`}
        >
          All
        </button>
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setFilterLangId(lang.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
              filterLangId === lang.id
                ? "bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/20"
                : "bg-white text-[#464554] hover:bg-[#eff4ff] ambient-shadow"
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>

      {/* Topic Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTopics.map((topic) => (
          <Link
            key={topic.id}
            href={`/teacher/topics/${topic.id}`}
            className="group bg-white rounded-xl ambient-shadow p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_30px_60px_rgba(18,28,42,0.1)] block border border-transparent hover:border-[#2a14b4]/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2a14b4]">menu_book</span>
              </div>
              <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                {topic.languageName}
              </span>
            </div>
            <h3 className="font-headline text-2xl text-[#121c2a] mb-2 group-hover:text-[#2a14b4] transition-colors">
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
                  {topic.vocabCount} words
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  {topic.assignmentCount} learners
                </div>
              </div>
              <span className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center group-hover:bg-[#2a14b4] group-hover:text-white text-[#464554] transition-all">
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </span>
            </div>
          </Link>
        ))}

        {/* Add New Placeholder */}
        <button
          onClick={() => setShowCreate(true)}
          className="group border-2 border-dashed border-[#c7c4d7]/50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 min-h-[240px] hover:bg-white hover:border-[#2a14b4]/20 hover:ambient-shadow transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center group-hover:bg-[#e3dfff] transition-colors">
            <span className="material-symbols-outlined text-[#2a14b4] text-2xl">add</span>
          </div>
          <span className="text-sm font-body font-medium text-[#777586] group-hover:text-[#2a14b4] transition-colors">
            Create New Topic
          </span>
        </button>
      </div>
    </div>
  );
}
