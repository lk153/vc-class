"use client";

type Session = {
  day: string;
  startTime: string;
  endTime: string;
};

type Props = {
  sessions: Session[];
  onChange: (sessions: Session[]) => void;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ClassSessionEditor({ sessions, onChange }: Props) {
  function updateSession(index: number, field: keyof Session, value: string) {
    const updated = sessions.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    onChange(updated);
  }

  function addSession() {
    onChange([...sessions, { day: "", startTime: "", endTime: "" }]);
  }

  function removeSession(index: number) {
    onChange(sessions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {sessions.map((session, index) => (
        <div
          key={index}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white rounded-xl border border-[#c7c4d7]/20 p-3"
        >
          {/* Day dropdown */}
          <select
            value={session.day}
            onChange={(e) => updateSession(index, "day", e.target.value)}
            className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 rounded-lg border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body text-[#121c2a]"
          >
            <option value="">Select day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Start time */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] shrink-0 w-10">
              From
            </span>
            <input
              type="time"
              value={session.startTime}
              onChange={(e) => updateSession(index, "startTime", e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-lg border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body text-[#121c2a]"
            />
          </div>

          {/* End time */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] shrink-0 w-10">
              To
            </span>
            <input
              type="time"
              value={session.endTime}
              onChange={(e) => updateSession(index, "endTime", e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-lg border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body text-[#121c2a]"
            />
          </div>

          {/* Remove button */}
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => removeSession(index)}
              className="self-center w-8 h-8 rounded-full flex items-center justify-center text-[#777586] hover:text-[#7b0020] hover:bg-[#ffdada]/30 transition-all shrink-0"
              title="Remove session"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      ))}

      {/* Add session button */}
      <button
        type="button"
        onClick={addSession}
        className="inline-flex items-center gap-1.5 text-xs font-body font-bold text-[#2a14b4] hover:text-[#4338ca] transition-colors px-1 py-1"
      >
        <span className="material-symbols-outlined text-[16px]">add_circle</span>
        Add Class Session
      </button>
    </div>
  );
}

// Utility: convert sessions array to display string
export function formatSessions(sessions: Session[]): string {
  if (!sessions || sessions.length === 0) return "";
  return sessions
    .filter((s) => s.day && s.startTime && s.endTime)
    .map((s) => `${s.day} ${s.startTime}–${s.endTime}`)
    .join(" | ");
}

// Utility: parse schedule string (JSON or legacy text) to sessions array
export function parseSessions(schedule: string): Session[] {
  if (!schedule) return [{ day: "", startTime: "", endTime: "" }];
  try {
    const parsed = JSON.parse(schedule);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Legacy text format — return as single session with empty fields
  }
  return [{ day: "", startTime: "", endTime: "" }];
}
