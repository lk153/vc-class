"use client";

type Props = {
  cues: string[];
  hint?: string | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function CueWriting({ cues, hint, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      {/* Cue chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {cues.map((cue, i) => (
          <span key={i}>
            <span className="px-2.5 py-1 rounded-full bg-[#e3dfff] text-sm font-body font-medium text-[#2a14b4]">
              {cue}
            </span>
            {i < cues.length - 1 && <span className="text-[#c7c4d7] mx-0.5">/</span>}
          </span>
        ))}
      </div>

      {/* Hint */}
      {hint && (
        <p className="text-xs font-body text-[#777586] italic flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">lightbulb</span>
          {hint}
        </p>
      )}

      {/* Input */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="Write a complete sentence using the cues above..."
        className="w-full px-4 py-3 rounded-xl bg-white border border-[#c7c4d7]/20 text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none resize-none disabled:opacity-50"
      />
    </div>
  );
}
