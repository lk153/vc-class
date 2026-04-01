"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type Vocab = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  learned: boolean;
};

type Props = {
  topicId: string;
  topicTitle: string;
  vocabulary: Vocab[];
};

export default function FlashcardDeck({ topicId, topicTitle, vocabulary }: Props) {
  const t = useTranslations("student");
  const [cards, setCards] = useState(vocabulary);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const learnedCount = cards.filter((c) => c.learned).length;
  const totalCount = cards.length;
  const currentCard = cards[currentIndex];
  const allDone = currentIndex >= totalCount;
  const progressPercent = ((currentIndex) / totalCount) * 100;

  const markCard = useCallback(
    async (learned: boolean) => {
      if (!currentCard) return;
      setCards((prev) =>
        prev.map((c) =>
          c.id === currentCard.id ? { ...c, learned } : c
        )
      );
      setFlipped(false);
      setDragX(0);
      setCurrentIndex((i) => i + 1);

      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyId: currentCard.id, learned }),
      });
    },
    [currentCard]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 100) {
      markCard(true);
    } else if (dragX < -100) {
      markCard(false);
    } else {
      setDragX(0);
    }
  };

  return (
    <div className="font-body min-h-[80vh] flex flex-col items-center px-6">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl h-[2px] bg-[#d9e3f6] overflow-hidden rounded-full mb-8">
        <div
          className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Context Header */}
      <header className="w-full max-w-2xl mb-10 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={`/topics/${topicId}`}
            className="text-xs font-body uppercase tracking-[0.2em] text-[#777586] hover:text-[#2a14b4] transition-colors"
          >
            {t("topic") || "Topic"}
          </Link>
          <span className="h-1 w-1 rounded-full bg-[#c7c4d7]" />
          <span className="text-xs font-body uppercase tracking-[0.2em] text-[#121c2a] font-semibold">
            {topicTitle}
          </span>
        </div>
        <p className="text-sm font-body text-[#777586] tracking-wider">
          {t("cardProgress", { current: Math.min(currentIndex + 1, totalCount), total: totalCount })}
        </p>
      </header>

      {allDone ? (
        <div className="text-center py-16 flex flex-col items-center">
          <span className="material-symbols-outlined text-6xl text-[#1b6b51] mb-6 block">
            celebration
          </span>
          <h2 className="font-body text-4xl text-[#121c2a] mb-3">
            {t("allCardsReviewed")}
          </h2>
          <p className="text-[#777586] font-body mb-8 tracking-wide">
            {t("wordsLearned", { count: cards.filter((c) => c.learned).length, total: totalCount })}
          </p>
          <Link
            href={`/topics/${topicId}`}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-8 py-3 rounded-full text-sm font-body font-medium tracking-wide transition-all duration-300 hover:shadow-lg"
          >
            {t("reviewTopic")}
          </Link>
        </div>
      ) : currentCard ? (
        <>
          {/* Flashcard Hero Section */}
          <section className="relative w-full max-w-md aspect-[3/4]">
            {/* Asymmetric accent blurs */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#a6f2d1]/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-[#4338ca]/10 rounded-full blur-3xl -z-10" />

            {/* The Card */}
            <div
              className="glass-card w-full h-full rounded-[2rem] border border-white/40 ambient-shadow flex flex-col items-center justify-between p-10 overflow-hidden cursor-pointer select-none transition-all duration-300"
              style={{
                transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                transition: isDragging ? "none" : "transform 0.3s ease, scale 0.3s ease",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => !isDragging && setFlipped((f) => !f)}
            >
              {/* Swipe indicator overlays */}
              {dragX > 50 && (
                <div className="absolute inset-0 rounded-[2rem] bg-[#a6f2d1]/20 flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-[#1b6b51] text-7xl">check</span>
                </div>
              )}
              {dragX < -50 && (
                <div className="absolute inset-0 rounded-[2rem] bg-[#ffdada]/30 flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-[#7b0020] text-7xl">close</span>
                </div>
              )}

              {/* Card Content */}
              <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
                {!flipped ? (
                  <>
                    <h1 className="font-body text-6xl md:text-7xl text-[#121c2a] tracking-tight mb-3">
                      {currentCard.word}
                    </h1>
                  </>
                ) : (
                  <>
                    <p className="font-body text-xl md:text-2xl text-[#121c2a] leading-relaxed mb-4 font-medium">
                      {currentCard.meaning}
                    </p>
                    {currentCard.example && (
                      <p className="font-body text-base text-[#777586] leading-relaxed">
                        &ldquo;{currentCard.example}&rdquo;
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Footer Hint */}
              <div className="mt-6 flex items-center gap-3 text-[#777586]/60">
                <span className="material-symbols-outlined text-sm">sync</span>
                <span className="text-[10px] uppercase font-body tracking-[0.2em] font-bold">
                  {t("tapToFlip")}
                </span>
              </div>
            </div>
          </section>

          {/* Control Actions */}
          <section className="mt-14 w-full max-w-md flex justify-center items-center gap-16">
            {/* Still Learning */}
            <button
              onClick={() => markCard(false)}
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#dee9fc] flex items-center justify-center group-hover:bg-[#ffdada] transition-all duration-300 shadow-sm">
                <span className="material-symbols-outlined text-[#7b0020] text-2xl">close</span>
              </div>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] group-hover:text-[#7b0020] font-bold transition-colors">
                {t("notLearned")}
              </span>
            </button>

            {/* Mastered */}
            <button
              onClick={() => markCard(true)}
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#a6f2d1] flex items-center justify-center group-hover:bg-[#8bd6b6] transition-all duration-300 shadow-sm">
                <span
                  className="material-symbols-outlined text-[#1b6b51] text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] group-hover:text-[#1b6b51] font-bold transition-colors">
                {t("learned")}
              </span>
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
