"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type Props = {
  topic: { id: string; title: string; description: string | null };
  languageName: string;
  totalWords: number;
  learnedWords: number;
};

export default function TopicCard({ topic, languageName, totalWords, learnedWords }: Props) {
  const t = useTranslations("student");
  const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  return (
    <Link
      href={`/topics/${topic.id}`}
      className="group flex flex-col h-full
        bg-[var(--color-card,#fff)] rounded-2xl
        shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]
        hover:shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)]
        hover:-translate-y-0.5
        transition-all duration-200"
    >
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-body font-bold text-lg text-[#121c2a] mb-1.5 group-hover:text-[#2a14b4] transition-colors line-clamp-2">
          {topic.title}
        </h3>

        <p className="text-[#464554] text-sm font-body mb-6 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {topic.description || "\u00A0"}
        </p>

        <div className="mt-auto">
          <div className="flex justify-between items-end mb-2">
            <span className="font-body text-[10px] uppercase tracking-widest font-bold text-[#777586]">
              {t("wordsLearned", { count: learnedWords, total: totalWords })}
            </span>
            <span className="font-body text-[#2a14b4] text-base font-bold">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#f0eef6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2a14b4] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
