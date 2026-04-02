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

// Dual-tone color palettes: [topColor, bottomColor, textColor]
const cardColors: [string, string, string][] = [
  ["#F59E0B", "#EA580C", "#ffffff"], // Yellow → Orange
  ["#22C55E", "#15803D", "#ffffff"], // Green → Dark Green
  ["#3B82F6", "#1D4ED8", "#ffffff"], // Blue → Dark Blue
  ["#EF4444", "#B91C1C", "#ffffff"], // Red → Dark Red
  ["#A855F7", "#7C3AED", "#ffffff"], // Purple → Dark Purple
  ["#EC4899", "#BE185D", "#ffffff"], // Pink → Dark Pink
  ["#14B8A6", "#0F766E", "#ffffff"], // Teal → Dark Teal
  ["#F97316", "#C2410C", "#ffffff"], // Orange → Burnt Orange
  ["#6366F1", "#4338CA", "#ffffff"], // Indigo → Dark Indigo
  ["#84CC16", "#4D7C0F", "#ffffff"], // Lime → Dark Lime
  ["#06B6D4", "#0E7490", "#ffffff"], // Cyan → Dark Cyan
  ["#E11D48", "#9F1239", "#ffffff"], // Rose → Dark Rose
];

export default function FlashcardDeck({ topicId, topicTitle, vocabulary }: Props) {
  const t = useTranslations("student");
  const [cards, setCards] = useState(vocabulary);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeOut, setSwipeOut] = useState<"left" | "right" | null>(null);
  const [swipeColor, setSwipeColor] = useState<"green" | "red" | null>(null);
  const [swipeIn, setSwipeIn] = useState(false);
  const startX = useRef(0);
  const didDrag = useRef(false);

  const learnedCount = cards.filter((c) => c.learned).length;
  const totalCount = cards.length;
  const currentCard = cards[currentIndex];
  const allDone = currentIndex >= totalCount;
  const progressPercent = ((currentIndex) / totalCount) * 100;
  const [topColor, bottomColor, textColor] = cardColors[currentIndex % cardColors.length];
  const cardNumber = String(currentIndex + 1).padStart(2, "0");

  const markCard = useCallback(
    async (learned: boolean) => {
      if (!currentCard || swipeOut) return;

      // Swipe out to left with color tint
      setSwipeColor(learned ? "green" : "red");
      setSwipeOut("left");

      // After swipe-out, advance card and swipe-in from right
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === currentCard.id ? { ...c, learned } : c
          )
        );
        setFlipped(false);
        setDragX(0);
        setSwipeOut(null);
        setSwipeColor(null);
        setSwipeIn(true);
        setCurrentIndex((i) => i + 1);

        // Remove swipe-in after animation
        setTimeout(() => setSwipeIn(false), 350);
      }, 350);

      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyId: currentCard.id, learned }),
      });
    },
    [currentCard, swipeOut]
  );

  function goBack() {
    if (currentIndex <= 0 || swipeOut) return;
    setFlipped(false);
    setDragX(0);
    setSwipeIn(true);
    setCurrentIndex((i) => i - 1);
    setTimeout(() => setSwipeIn(false), 350);
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    didDrag.current = false;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) didDrag.current = true;
    setDragX(dx);
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
          <section className="relative w-full max-w-md aspect-[3/4]" style={{ perspective: "1200px" }}>
            {/* Asymmetric accent blurs */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#a6f2d1]/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-[#4338ca]/10 rounded-full blur-3xl -z-10" />

            {/* The Card (3D flip container) */}
            <div
              className="w-full h-full cursor-pointer select-none touch-none"
              style={{
                transformStyle: "preserve-3d",
                transform: swipeOut
                  ? `translateX(-120%) rotate(-15deg) rotateY(${flipped ? 180 : 0}deg)`
                  : swipeIn
                  ? `translateX(0) rotate(0deg) rotateY(${flipped ? 180 : 0}deg)`
                  : `translateX(${dragX}px) rotate(${dragX * 0.05}deg) rotateY(${flipped ? 180 : 0}deg)`,
                transition: isDragging
                  ? "none"
                  : swipeOut
                  ? "transform 0.35s ease-in, opacity 0.35s ease-in"
                  : swipeIn
                  ? "transform 0.35s ease-out, opacity 0.35s ease-out"
                  : "transform 0.5s ease",
                opacity: swipeOut ? 0 : 1,
                ...(swipeIn && !swipeOut ? { animation: "slideInRight 0.35s ease-out" } : {}),
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => { if (!didDrag.current && !swipeOut) setFlipped((f) => !f); }}
            >
              {/* Front Face (Word) */}
              <div
                className="absolute inset-0 rounded-[2rem] flex flex-col overflow-hidden border-[10px] border-white shadow-[0_20px_60px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.15)]"
                style={{
                  backfaceVisibility: "hidden",
                  background: swipeColor === "green"
                    ? "linear-gradient(180deg, rgba(166,242,209,0.6) 0%, rgba(27,107,81,0.4) 100%)"
                    : swipeColor === "red"
                    ? "linear-gradient(180deg, rgba(255,218,218,0.7) 0%, rgba(123,0,32,0.3) 100%)"
                    : dragX > 50
                    ? `linear-gradient(180deg, ${topColor}cc 0%, rgba(166,242,209,0.4) 100%)`
                    : dragX < -50
                    ? `linear-gradient(180deg, ${topColor}cc 0%, rgba(255,218,218,0.5) 100%)`
                    : topColor,
                }}
              >
                {/* Top section */}
                <div className="flex-[2] flex flex-col p-10 pb-0">
                  <div className="w-full flex justify-start">
                    <span className="font-body font-bold text-5xl leading-none" style={{ color: `${textColor}30` }}>
                      {cardNumber}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <h1 className="font-body text-5xl md:text-6xl tracking-tight font-bold" style={{ color: textColor }}>
                      {currentCard.word}
                    </h1>
                  </div>
                </div>

                {/* Wave divider */}
                <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full h-14 block" style={{ marginTop: "-1px" }}>
                  {/* Thin accent swoosh */}
                  <path d="M0,58 C60,35 120,50 180,30 C240,10 300,45 360,25 Q380,18 400,22" fill="none" stroke={`${textColor}20`} strokeWidth="2" />
                  {/* Secondary wave */}
                  <path d="M0,52 C70,28 140,55 210,32 C280,9 340,48 400,28 L400,80 L0,80 Z" fill={bottomColor} opacity="0.5" />
                  {/* Main wave */}
                  <path d="M0,60 C80,30 160,65 240,35 C300,15 350,50 400,32 L400,80 L0,80 Z" fill={bottomColor} />
                </svg>

                {/* Bottom section */}
                <div className="flex-[1] flex flex-col items-center justify-between px-10 pb-8 pt-2" style={{ backgroundColor: bottomColor }}>
                  {/* Swipe indicator */}
                  <div className="h-14 flex items-center justify-center">
                    {dragX > 50 || swipeColor === "green" ? (
                      <div className="w-12 h-12 rounded-full bg-[#a6f2d1] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[#1b6b51] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      </div>
                    ) : dragX < -50 || swipeColor === "red" ? (
                      <div className="w-12 h-12 rounded-full bg-[#ffdada] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[#7b0020] text-2xl">close</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3" style={{ color: `${textColor}80` }}>
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span className="text-[10px] uppercase font-body tracking-[0.2em] font-bold">
                      {t("tapToFlip")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back Face (Meaning) */}
              <div
                className="absolute inset-0 rounded-[2rem] flex flex-col overflow-hidden border-[10px] border-white shadow-[0_20px_60px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.15)]"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: swipeColor === "green"
                    ? "linear-gradient(180deg, rgba(166,242,209,0.6) 0%, rgba(27,107,81,0.4) 100%)"
                    : swipeColor === "red"
                    ? "linear-gradient(180deg, rgba(255,218,218,0.7) 0%, rgba(123,0,32,0.3) 100%)"
                    : bottomColor,
                }}
              >
                {/* Top section */}
                <div className="flex-[2] flex flex-col p-10 pb-0">
                  <div className="w-full flex justify-start">
                    <span className="font-body font-bold text-5xl leading-none" style={{ color: `${textColor}30` }}>
                      {cardNumber}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <p className="font-body text-xl md:text-2xl leading-relaxed mb-4 font-medium" style={{ color: textColor }}>
                      {currentCard.meaning}
                    </p>
                    {currentCard.example && (
                      <p className="font-body text-base leading-relaxed" style={{ color: `${textColor}cc` }}>
                        &ldquo;{currentCard.example}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Wave divider */}
                <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full h-14 block" style={{ marginTop: "-1px" }}>
                  {/* Thin accent swoosh */}
                  <path d="M0,58 C60,35 120,50 180,30 C240,10 300,45 360,25 Q380,18 400,22" fill="none" stroke={`${textColor}20`} strokeWidth="2" />
                  {/* Secondary wave */}
                  <path d="M0,52 C70,28 140,55 210,32 C280,9 340,48 400,28 L400,80 L0,80 Z" fill={topColor} opacity="0.5" />
                  {/* Main wave */}
                  <path d="M0,60 C80,30 160,65 240,35 C300,15 350,50 400,32 L400,80 L0,80 Z" fill={topColor} />
                </svg>

                {/* Bottom section */}
                <div className="flex-[1] flex flex-col items-center justify-between px-10 pb-8 pt-2" style={{ backgroundColor: topColor }}>
                  {/* Swipe indicator */}
                  <div className="h-14 flex items-center justify-center">
                    {dragX > 50 || swipeColor === "green" ? (
                      <div className="w-12 h-12 rounded-full bg-[#a6f2d1] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[#1b6b51] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      </div>
                    ) : dragX < -50 || swipeColor === "red" ? (
                      <div className="w-12 h-12 rounded-full bg-[#ffdada] flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[#7b0020] text-2xl">close</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3" style={{ color: `${textColor}80` }}>
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span className="text-[10px] uppercase font-body tracking-[0.2em] font-bold">
                      {t("tapToFlip")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Control Actions */}
          <section className="mt-14 w-full max-w-md flex justify-center items-center gap-10">
            {/* Still Learning */}
            <div
              onClick={() => markCard(false)}
              className="flex flex-col items-center gap-4 group cursor-pointer no-ripple"
            >
              <button className="w-16 h-16 rounded-full bg-[#ffdada] flex items-center justify-center group-hover:bg-[#f5a3a3] transition-colors duration-300 shadow-sm">
                <span className="material-symbols-outlined text-[#7b0020] group-hover:text-[#5c0017] text-2xl transition-colors">close</span>
              </button>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] group-hover:text-[#7b0020] font-bold transition-colors">
                {t("notLearned")}
              </span>
            </div>

            {/* Back */}
            <div
              onClick={goBack}
              className={`flex flex-col items-center gap-4 group no-ripple ${currentIndex > 0 ? "cursor-pointer" : "opacity-30 pointer-events-none"}`}
            >
              <button className="w-12 h-12 rounded-full bg-[#f0eef6] flex items-center justify-center group-hover:bg-[#e3dfff] transition-colors duration-300 shadow-sm">
                <span className="material-symbols-outlined text-[#777586] group-hover:text-[#2a14b4] text-xl transition-colors">undo</span>
              </button>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold transition-colors">
                {t("previousCard")}
              </span>
            </div>

            {/* Mastered */}
            <div
              onClick={() => markCard(true)}
              className="flex flex-col items-center gap-4 group cursor-pointer no-ripple"
            >
              <button className="w-16 h-16 rounded-full bg-[#a6f2d1] flex items-center justify-center group-hover:bg-[#8bd6b6] transition-colors duration-300 shadow-sm">
                <span
                  className="material-symbols-outlined text-[#1b6b51] text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </button>
              <span className="text-[10px] font-body uppercase tracking-widest text-[#777586] group-hover:text-[#1b6b51] font-bold transition-colors">
                {t("learned")}
              </span>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
