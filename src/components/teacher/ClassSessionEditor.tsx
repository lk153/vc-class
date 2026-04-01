"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

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

const dayTranslationKeys: Record<string, string> = {
  Monday: "dayMonday",
  Tuesday: "dayTuesday",
  Wednesday: "dayWednesday",
  Thursday: "dayThursday",
  Friday: "dayFriday",
  Saturday: "daySaturday",
  Sunday: "daySunday",
};

function DayPicker({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (day: string) => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const label = value && dayTranslationKeys[value] ? t(dayTranslationKeys[value]) : t("selectDay");

  return (
    <div ref={ref} className="relative no-ripple flex-1 sm:flex-none sm:w-40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-body ${
          open
            ? "border-[#2a14b4] ring-2 ring-[#2a14b4]/20 bg-white"
            : "border-[#c7c4d7]/30 bg-[#f8f9ff] hover:border-[#c7c4d7]/60"
        } ${value ? "text-[#121c2a] font-medium" : "text-[#777586]"}`}
      >
        <span className="truncate">{label}</span>
        <span
          className="material-symbols-outlined text-[16px] text-[#777586] transition-transform shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)] border border-[#c7c4d7]/15 py-1.5 z-50">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { onChange(d); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-body transition-colors ${
                value === d
                  ? "bg-[#f5f3ff] text-[#2a14b4] font-medium"
                  : "text-[#464554] hover:bg-[#f8f9ff]"
              }`}
            >
              <span>{t(dayTranslationKeys[d])}</span>
              {value === d && (
                <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClassSessionEditor({ sessions, onChange }: Props) {
  const t = useTranslations("teacher");

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
          <DayPicker
            value={session.day}
            onChange={(day) => updateSession(index, "day", day)}
            t={t}
          />

          {/* Start time */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] shrink-0 w-10">
              {t("sessionFrom")}
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
              {t("sessionTo")}
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
              title={t("removeSession")}
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
        {t("addClassSession")}
      </button>
    </div>
  );
}

// Utility: convert sessions array to display string
export function formatSessions(sessions: Session[], tDay?: (key: string) => string): string {
  if (!sessions || sessions.length === 0) return "";
  return sessions
    .filter((s) => s.day && s.startTime && s.endTime)
    .map((s) => {
      const dayLabel = tDay && dayTranslationKeys[s.day] ? tDay(dayTranslationKeys[s.day]) : s.day;
      return `${dayLabel} ${s.startTime}–${s.endTime}`;
    })
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
