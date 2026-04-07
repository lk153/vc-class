"use client";

type Props = {
  answers: string[];
  underlinedParts: string[];
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  correctAnswer?: string;
  showResult?: boolean;
};

const LABELS = ["A", "B", "C", "D"];

export default function PronunciationQ({ answers, underlinedParts, selected, onChange, disabled, correctAnswer, showResult }: Props) {
  function renderWord(word: string, underlined: string) {
    if (!underlined) return <span>{word}</span>;
    const idx = word.toLowerCase().indexOf(underlined.toLowerCase());
    if (idx === -1) return <span>{word}</span>;
    return (
      <span>
        {word.slice(0, idx)}
        <span className="underline decoration-2 decoration-[#2a14b4] underline-offset-2 font-bold">{word.slice(idx, idx + underlined.length)}</span>
        {word.slice(idx + underlined.length)}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {answers.map((answer, i) => {
        const isSelected = selected === answer;
        const isCorrect = showResult && answer === correctAnswer;
        const isWrong = showResult && isSelected && answer !== correctAnswer;

        return (
          <button
            key={i}
            onClick={() => !disabled && onChange(answer)}
            disabled={disabled}
            className={`px-4 py-2.5 rounded-lg text-sm font-body border transition-colors ${
              isCorrect ? "border-[#1b6b51]/30 bg-[#a6f2d1]/20 text-[#1b6b51]"
              : isWrong ? "border-[#7b0020]/30 bg-[#ffdada]/20 text-[#7b0020]"
              : isSelected ? "border-[#2a14b4]/40 bg-[#2a14b4]/10 text-[#2a14b4]"
              : "border-[#c7c4d7]/20 bg-white text-[#464554] hover:border-[#2a14b4]/30"
            } disabled:cursor-not-allowed`}
          >
            <span className="font-bold mr-1.5">{LABELS[i]}.</span>
            {renderWord(answer, underlinedParts[i] || "")}
          </button>
        );
      })}
    </div>
  );
}
