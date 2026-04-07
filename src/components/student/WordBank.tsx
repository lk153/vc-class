"use client";

import { useState, useEffect } from "react";

type Sentence = {
  text: string;
  answer: string;
};

type Props = {
  wordBank: string[];
  sentences: Sentence[];
  allowReuse?: boolean;
  value: string; // JSON: Record<number, string> — sentenceIndex → selected word
  onChange: (value: string) => void;
  disabled?: boolean;
  showResult?: boolean;
};

export default function WordBank({
  wordBank,
  sentences,
  allowReuse = false,
  value,
  onChange,
  disabled,
  showResult,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Parse value on mount
  useEffect(() => {
    if (value) {
      try { setAnswers(JSON.parse(value)); } catch {}
    }
  }, []);

  // Sync state to parent
  function updateAnswers(next: Record<number, string>) {
    setAnswers(next);
    onChange(JSON.stringify(next));
  }

  // Words currently used in blanks
  const usedWords = Object.values(answers);

  function isWordAvailable(word: string) {
    if (allowReuse) return true;
    return !usedWords.includes(word);
  }

  function handleWordClick(word: string) {
    if (disabled) return;
    if (selectedWord === word) {
      setSelectedWord(null);
      return;
    }
    setSelectedWord(word);
  }

  function handleBlankClick(sentenceIdx: number) {
    if (disabled) return;

    // If blank already filled, remove it (put word back)
    if (answers[sentenceIdx]) {
      const next = { ...answers };
      delete next[sentenceIdx];
      updateAnswers(next);
      return;
    }

    // If a word is selected, fill the blank
    if (selectedWord) {
      const next = { ...answers, [sentenceIdx]: selectedWord };
      updateAnswers(next);
      setSelectedWord(null);
    }
  }

  function renderSentence(sentence: Sentence, idx: number) {
    const filled = answers[idx];
    const isCorrect = showResult && filled && filled.toLowerCase().trim() === sentence.answer.toLowerCase().trim();
    const isWrong = showResult && filled && filled.toLowerCase().trim() !== sentence.answer.toLowerCase().trim();
    const parts = sentence.text.split("___");

    return (
      <div
        key={idx}
        className={`flex items-start gap-3 py-3 ${
          showResult
            ? isCorrect ? "text-[#1b6b51]" : isWrong ? "text-[#7b0020]" : ""
            : ""
        }`}
      >
        <span className="font-body font-bold text-sm text-[#2a14b4] shrink-0 w-6 pt-0.5">{idx + 1}.</span>
        <div className="flex-1 text-sm font-body text-[#121c2a] leading-relaxed flex flex-wrap items-center gap-1">
          {parts.map((part, pIdx) => (
            <span key={pIdx}>
              {part}
              {pIdx < parts.length - 1 && (
                <button
                  type="button"
                  onClick={() => handleBlankClick(idx)}
                  disabled={disabled}
                  className={`inline-flex items-center justify-center min-w-[120px] px-3 py-1 mx-1 rounded-lg border-2 border-dashed text-sm font-body font-medium transition-all ${
                    filled
                      ? showResult
                        ? isCorrect
                          ? "border-[#1b6b51]/30 bg-[#a6f2d1]/20 text-[#1b6b51] border-solid"
                          : "border-[#7b0020]/30 bg-[#ffdada]/20 text-[#7b0020] border-solid"
                        : "border-[#2a14b4]/30 bg-[#2a14b4]/5 text-[#2a14b4] border-solid cursor-pointer hover:bg-[#ffdada]/10"
                      : selectedWord
                        ? "border-[#2a14b4]/40 bg-[#e3dfff]/30 text-[#777586] cursor-pointer animate-pulse"
                        : "border-[#c7c4d7]/30 bg-[#f8f9ff] text-[#c7c4d7]"
                  } disabled:cursor-not-allowed`}
                >
                  {filled || "___________"}
                </button>
              )}
            </span>
          ))}
          {/* Show correct answer if wrong */}
          {isWrong && (
            <span className="text-xs text-[#1b6b51] ml-2">({sentence.answer})</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Word Bank chips */}
      <div className="bg-[#f8f9ff] rounded-xl border border-[#c7c4d7]/15 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {wordBank.map((word, i) => {
            const available = isWordAvailable(word);
            const isSelected = selectedWord === word;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleWordClick(word)}
                disabled={disabled || (!available && !isSelected)}
                className={`px-4 py-2 rounded-lg text-sm font-body font-medium border transition-all ${
                  isSelected
                    ? "bg-[#2a14b4] text-white border-[#2a14b4] ring-2 ring-[#2a14b4]/20"
                    : available
                      ? "bg-white border-[#c7c4d7]/30 text-[#121c2a] hover:border-[#2a14b4]/40 hover:bg-[#e3dfff]/20 cursor-pointer"
                      : "bg-[#f0eef6] border-transparent text-[#c7c4d7] line-through cursor-not-allowed"
                } disabled:cursor-not-allowed`}
              >
                <span className="italic">{word}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      {!disabled && (
        <p className="text-xs font-body text-[#777586] italic text-center">
          {selectedWord
            ? `Tap a blank to fill with "${selectedWord}"`
            : "Tap a word above, then tap a blank to fill it. Tap a filled blank to remove it."
          }
        </p>
      )}

      {/* Sentences */}
      <div className="divide-y divide-[#c7c4d7]/10">
        {sentences.map((s, i) => renderSentence(s, i))}
      </div>
    </div>
  );
}
