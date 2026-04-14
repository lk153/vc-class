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
    <div className="space-y-2.5">
      {statements.map((statement, i) => {
        const selected = answers[i];
        const isCorrect = showResult && correctAnswers && selected === correctAnswers[i];
        const isWrong = showResult && correctAnswers && selected && selected !== correctAnswers[i];

        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all ${
              isCorrect
                ? "bg-[#a6f2d1]/10 shadow-[0_1px_3px_1px_rgba(27,107,81,0.06),0_1px_2px_0_rgba(27,107,81,0.08)]"
                : isWrong
                ? "bg-[#ffdada]/10 shadow-[0_1px_3px_1px_rgba(123,0,32,0.06),0_1px_2px_0_rgba(123,0,32,0.08)]"
                : "bg-[var(--color-card,#fff)] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]"
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-body font-bold transition-all ${
                    selected === val
                      ? val === "True"
                        ? "bg-[#1b6b51] text-white shadow-sm"
                        : "bg-[#7b0020] text-white shadow-sm"
                      : "bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
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
