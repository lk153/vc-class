"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import TopicCard from "./TopicCard";

type Language = { id: string; name: string };

type TopicItem = {
  id: string;
  topic: { id: string; title: string; description: string | null };
  languageId: string;
  languageName: string;
  totalWords: number;
  learnedWords: number;
};

type Props = {
  items: TopicItem[];
  languages: Language[];
};

export default function TopicGrid({ items, languages }: Props) {
  const t = useTranslations("common");
  const [filterLangId, setFilterLangId] = useState<string | null>(null);

  const filtered = filterLangId
    ? items.filter((item) => item.languageId === filterLangId)
    : items;

  return (
    <div>
      {/* Language Filter */}
      {languages.length > 0 && (
        <div className="flex items-center gap-2 mb-10 flex-wrap">
          <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mr-2">
            {t("filter")}
          </span>
          <button
            onClick={() => setFilterLangId(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
              filterLangId === null
                ? "bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/20"
                : "bg-white text-[#464554] hover:bg-[#eff4ff] ambient-shadow"
            }`}
          >
            {t("all")}
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
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#777586]">
          <span className="material-symbols-outlined text-5xl mb-4 block">filter_list_off</span>
          <p className="text-[#464554] font-body">{t("noTopicsForLanguage")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map((item) => (
            <TopicCard
              key={item.id}
              topic={item.topic}
              languageName={item.languageName}
              totalWords={item.totalWords}
              learnedWords={item.learnedWords}
            />
          ))}
        </div>
      )}
    </div>
  );
}
