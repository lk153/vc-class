"use client";

type Props = {
  timeLeft: number;
  totalTime: number;
  paused?: boolean;
};

export default function CircularTimer({ timeLeft, totalTime, paused }: Props) {
  const ratio = totalTime > 0 ? timeLeft / totalTime : 1;
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - c * ratio;

  // Color transitions: green > 50%, orange 25-50%, red < 25%
  let strokeColor = "#1b6b51";
  let bgColor = "rgba(166,242,209,0.3)";
  if (ratio <= 0.25) {
    strokeColor = "#7b0020";
    bgColor = "rgba(255,218,218,0.3)";
  } else if (ratio <= 0.5) {
    strokeColor = "#f59e0b";
    bgColor = "rgba(254,243,199,0.3)";
  }

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const display = `${m}:${s.toString().padStart(2, "0")}`;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke={bgColor} strokeWidth="4" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="text-center z-10">
        {paused ? (
          <span className="material-symbols-outlined text-[18px] text-[#777586]">pause</span>
        ) : (
          <span
            className={`font-body font-bold text-sm ${
              ratio <= 0.25 ? "text-[#7b0020] animate-pulse" : "text-[#121c2a]"
            }`}
          >
            {display}
          </span>
        )}
      </div>
    </div>
  );
}
