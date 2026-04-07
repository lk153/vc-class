"use client";

import { useState } from "react";

type Props = {
  columnA: string[];
  columnB: string[];
  value: string; // JSON array of [indexA, indexB] pairs
  onChange: (value: string) => void;
  disabled?: boolean;
  correctPairs?: number[][]; // for results
  showResult?: boolean;
};

export default function MatchingPairs({ columnA, columnB, value, onChange, disabled, correctPairs, showResult }: Props) {
  const [selectedA, setSelectedA] = useState<number | null>(null);

  let pairs: number[][] = [];
  try { pairs = value ? JSON.parse(value) : []; } catch { pairs = []; }

  function getMatchedB(aIndex: number): number | undefined {
    return pairs.find((p) => p[0] === aIndex)?.[1];
  }

  function getMatchedA(bIndex: number): number | undefined {
    return pairs.find((p) => p[1] === bIndex)?.[0];
  }

  function handleSelectA(index: number) {
    if (disabled) return;
    setSelectedA(index);
  }

  function handleSelectB(bIndex: number) {
    if (disabled || selectedA === null) return;

    // Remove any existing pair for this A or B
    let next = pairs.filter((p) => p[0] !== selectedA && p[1] !== bIndex);
    next.push([selectedA, bIndex]);
    onChange(JSON.stringify(next));
    setSelectedA(null);
  }

  function isCorrectPair(a: number, b: number): boolean {
    return correctPairs?.some((p) => p[0] === a && p[1] === b) ?? false;
  }

  const LABELS_A = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const LABELS_B = ["a", "b", "c", "d", "e", "f", "g", "h"];

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Column A */}
      <div className="space-y-2">
        {columnA.map((item, i) => {
          const matchedB = getMatchedB(i);
          const isSelected = selectedA === i;
          const correct = showResult && matchedB !== undefined && isCorrectPair(i, matchedB);
          const wrong = showResult && matchedB !== undefined && !isCorrectPair(i, matchedB);

          return (
            <button
              key={i}
              onClick={() => handleSelectA(i)}
              disabled={disabled}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-body border transition-colors ${
                correct ? "border-[#1b6b51]/30 bg-[#a6f2d1]/10"
                : wrong ? "border-[#7b0020]/30 bg-[#ffdada]/10"
                : isSelected ? "border-[#2a14b4] bg-[#2a14b4]/5 ring-2 ring-[#2a14b4]/20"
                : matchedB !== undefined ? "border-[#2a14b4]/30 bg-[#e3dfff]/20"
                : "border-[#c7c4d7]/20 bg-white hover:border-[#2a14b4]/30"
              } disabled:cursor-not-allowed`}
            >
              <span className="font-bold text-[#2a14b4] mr-2">{LABELS_A[i]}.</span>
              {item}
              {matchedB !== undefined && (
                <span className="ml-2 text-xs font-bold text-[#2a14b4]">→ {LABELS_B[matchedB]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Column B */}
      <div className="space-y-2">
        {columnB.map((item, i) => {
          const matchedA = getMatchedA(i);
          const correct = showResult && matchedA !== undefined && isCorrectPair(matchedA, i);
          const wrong = showResult && matchedA !== undefined && !isCorrectPair(matchedA, i);

          return (
            <button
              key={i}
              onClick={() => handleSelectB(i)}
              disabled={disabled || selectedA === null}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-body border transition-colors ${
                correct ? "border-[#1b6b51]/30 bg-[#a6f2d1]/10"
                : wrong ? "border-[#7b0020]/30 bg-[#ffdada]/10"
                : matchedA !== undefined ? "border-[#1b6b51]/20 bg-[#a6f2d1]/5"
                : selectedA !== null ? "border-[#c7c4d7]/30 bg-white hover:border-[#1b6b51]/30 hover:bg-[#a6f2d1]/5 cursor-pointer"
                : "border-[#c7c4d7]/20 bg-white"
              } disabled:cursor-not-allowed`}
            >
              <span className="font-bold text-[#1b6b51] mr-2">{LABELS_B[i]}.</span>
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
