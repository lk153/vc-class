"use client";

type Props = {
  statements: string[];
  answers: Record<number, string>; // index -> "True" | "False"
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
  correctAnswers?: Record<number, string>; // for showing results
  showResult?: boolean;
};

export default function TrueFalseList({ statements, answers, onChange, disabled, correctAnswers, showResult }: Props) {
  return (
    <div className="space-y-3">
      {statements.map((statement, i) => {
        const selected = answers[i];
        const isCorrect = showResult && correctAnswers && selected === correctAnswers[i];
        const isWrong = showResult && correctAnswers && selected && selected !== correctAnswers[i];

        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              isCorrect ? "border-[#1b6b51]/20 bg-[#a6f2d1]/10"
              : isWrong ? "border-[#7b0020]/20 bg-[#ffdada]/10"
              : "border-[#c7c4d7]/15 bg-white"
            }`}
          >
            <span className="font-body font-bold text-sm text-[#2a14b4] shrink-0 w-6 pt-0.5">{i + 1}.</span>
            <p className="flex-1 text-sm font-body text-[#121c2a] leading-relaxed">{statement}</p>
            <div className="flex gap-1.5 shrink-0">
              {["True", "False"].map((val) => (
                <button
                  key={val}
                  onClick={() => !disabled && onChange(i, val)}
                  disabled={disabled}
                  className={`px-3 py-1 rounded-lg text-xs font-body font-bold transition-colors ${
                    selected === val
                      ? val === "True"
                        ? "bg-[#1b6b51] text-white"
                        : "bg-[#7b0020] text-white"
                      : "bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff]"
                  } disabled:cursor-not-allowed`}
                >
                  {val === "True" ? "T" : "F"}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
