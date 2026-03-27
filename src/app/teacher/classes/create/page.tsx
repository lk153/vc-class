"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import ClassSessionEditor from "@/components/teacher/ClassSessionEditor";

type Language = { id: string; name: string; code: string };

const levelPresets: Record<string, string[]> = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
};

export default function CreateClassPage() {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [level, setLevel] = useState("");
  const [sessions, setSessions] = useState([{ day: "", startTime: "", endTime: "" }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState(10);
  const [specialNotes, setSpecialNotes] = useState("");

  useEffect(() => {
    fetch("/api/languages")
      .then((res) => res.json())
      .then(setLanguages)
      .catch(() => {});
  }, []);

  const selectedLang = languages.find((l) => l.id === languageId);
  const presets = selectedLang ? levelPresets[selectedLang.code] || [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSessions = sessions.filter((s) => s.day && s.startTime && s.endTime);
    if (!name.trim() || !languageId || !level.trim() || validSessions.length === 0 || !startDate || !endDate) {
      toast.error("Please fill in all required fields and at least one class session");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          languageId,
          level: level.trim(),
          schedule: JSON.stringify(validSessions),
          startDate,
          endDate,
          maxStudents,
          specialNotes: specialNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create class");
        return;
      }
      toast.success(t("classCreated"));
      router.push("/teacher/classes");
      router.refresh();
    } catch {
      toast.error("Failed to create class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4] transition-colors mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t("classes")}
      </Link>

      <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-8">
        {t("createClass")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Class Name */}
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
            {t("className")} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Intermediate English Conversation"
            className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40"
            required
          />
        </div>

        {/* Language + Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
              {t("classLanguage")} *
            </label>
            <select
              value={languageId}
              onChange={(e) => { setLanguageId(e.target.value); setLevel(""); }}
              className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body"
              required
            >
              <option value="">Select language</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
              {t("classLevel")} *
            </label>
            {presets.length > 0 ? (
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body"
                required
              >
                <option value="">Select level</option>
                {presets.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., Beginner, B1"
                className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40"
                required
              />
            )}
          </div>
        </div>

        {/* Class Sessions */}
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
            {t("classSchedule")} *
          </label>
          <ClassSessionEditor sessions={sessions} onChange={setSessions} />
        </div>

        {/* Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
              {t("classStartDate")} *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body text-[#464554]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
              {t("classEndDate")} *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body text-[#464554]"
              required
            />
          </div>
        </div>

        {/* Max Students */}
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
            {t("classMaxStudents")}
          </label>
          <input
            type="number"
            value={maxStudents}
            onChange={(e) => setMaxStudents(parseInt(e.target.value) || 10)}
            min={1}
            max={100}
            className="w-32 px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body"
          />
        </div>

        {/* Special Notes */}
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">
            {t("classSpecialNotes")}
          </label>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            rows={3}
            placeholder="e.g., First class free trial | All sessions recorded for review"
            className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#2a14b4] text-white px-8 py-3 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {saving ? "Creating..." : t("createClass")}
          </button>
        </div>
      </form>
    </div>
  );
}
