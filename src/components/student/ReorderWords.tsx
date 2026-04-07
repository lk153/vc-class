"use client";

import { useState, useEffect } from "react";

type Props = {
  fragments: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  correctOrder?: number[];
  showResult?: boolean;
};

export default function ReorderWords({ fragments, value, onChange, disabled, correctOrder, showResult }: Props) {
  const [placed, setPlaced] = useState<number[]>([]);

  // Parse value back to placed indices on mount
  useEffect(() => {
    if (value && placed.length === 0) {
      // Try to match value to fragment order
      const words = value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      if (words.length > 0) setPlaced(words);
    }
  }, []);

  const available = fragments.map((_, i) => i).filter((i) => !placed.includes(i));

  function addFragment(index: number) {
    if (disabled) return;
    const next = [...placed, index];
    setPlaced(next);
    onChange(next.join(","));
  }

  function removeFragment(position: number) {
    if (disabled) return;
    const next = placed.filter((_, i) => i !== position);
    setPlaced(next);
    onChange(next.join(","));
  }

  const isCorrect = showResult && correctOrder && JSON.stringify(placed) === JSON.stringify(correctOrder);

  return (
    <div className="space-y-3">
      {/* Available fragments */}
      <div className="flex flex-wrap gap-2">
        {available.map((idx) => (
          <button
            key={idx}
            onClick={() => addFragment(idx)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg bg-[#f0eef6] text-sm font-body text-[#464554] hover:bg-[#e3dfff] hover:text-[#2a14b4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#c7c4d7]/20"
          >
            {fragments[idx]}
          </button>
        ))}
      </div>

      {/* Placed sentence */}
      <div className={`min-h-[48px] p-3 rounded-xl border-2 border-dashed flex flex-wrap gap-2 items-center ${
        showResult
          ? isCorrect ? "border-[#1b6b51]/30 bg-[#a6f2d1]/10" : "border-[#7b0020]/30 bg-[#ffdada]/10"
          : "border-[#c7c4d7]/30 bg-[#f8f9ff]"
      }`}>
        {placed.length === 0 ? (
          <span className="text-sm font-body text-[#c7c4d7] italic">Tap words above to build your sentence...</span>
        ) : (
          placed.map((idx, pos) => (
            <button
              key={`${idx}-${pos}`}
              onClick={() => removeFragment(pos)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                disabled
                  ? "bg-[#e3dfff] text-[#2a14b4]"
                  : "bg-[#2a14b4] text-white hover:bg-[#7b0020] cursor-pointer"
              }`}
            >
              {fragments[idx]}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
