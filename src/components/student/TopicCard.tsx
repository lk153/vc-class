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
      className="group flex flex-col bg-white rounded-xl ambient-shadow overflow-hidden transition-all duration-300 hover:-translate-y-2 h-full"
    >
      <div className="p-8 flex flex-col flex-grow">
        <h3 className="font-headline text-2xl text-[#121c2a] mb-2">{topic.title}</h3>

        <p className="text-[#464554] text-sm mb-8 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {topic.description || "\u00A0"}
        </p>

        <div className="mt-auto">
          <div className="flex justify-between items-end mb-2">
            <span className="font-body text-[11px] uppercase tracking-widest text-[#464554]">
              {t("wordsLearned", { count: learnedWords, total: totalWords })}
            </span>
            <span className="font-headline italic text-[#2a14b4] text-lg">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1 w-full bg-[#d9e3f6] rounded-full overflow-hidden">
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
