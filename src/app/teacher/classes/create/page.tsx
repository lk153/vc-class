"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import ClassSessionEditor from "@/components/teacher/ClassSessionEditor";
import { RequiredMark, RequiredFieldsHint } from "@/components/RequiredMark";

type Language = { id: string; name: string; code: string };

const levelPresets: Record<string, string[]> = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
};

export default function CreateClassPage() {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
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

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586]";

  const labelClass =
    "block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSessions = sessions.filter((s) => s.day && s.startTime && s.endTime);
    if (!name.trim() || !languageId || !level.trim() || validSessions.length === 0 || !startDate || !endDate) {
      toast.error(t("fillRequiredFields"));
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
        toast.error(t("createClassError"));
        return;
      }
      toast.success(t("classCreated"));
      router.push("/teacher/classes");
      router.refresh();
    } catch {
      toast.error(t("createClassError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4] transition-colors mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t("classes")}
      </Link>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-8">
        <h1 className="font-body font-bold text-2xl text-[#121c2a] mb-1">
          {t("createClass")}
        </h1>
        <RequiredFieldsHint text={ct("requiredFieldsHint")} />

        {/* Class Name */}
        <div className="mb-6">
          <label className={labelClass}>{t("className")} <RequiredMark /></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("classNamePlaceholder")}
            className={inputClass}
            required
          />
        </div>

        {/* Language + Level */}
        <div className="grid gap-6 sm:grid-cols-2 mb-6">
          <div>
            <label className={labelClass}>{t("classLanguage")} <RequiredMark /></label>
            <select
              value={languageId}
              onChange={(e) => { setLanguageId(e.target.value); setLevel(""); }}
              className={inputClass}
              required
            >
              <option value="">{t("selectLanguage")}</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{tLang(t, lang.name)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("classLevel")} <RequiredMark /></label>
            {presets.length > 0 ? (
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">{t("selectLevel")}</option>
                {presets.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder={t("levelPlaceholder")}
                className={inputClass}
                required
              />
            )}
          </div>
        </div>

        {/* Class Sessions */}
        <div className="mb-6">
          <label className={labelClass}>{t("classSchedule")} <RequiredMark /></label>
          <ClassSessionEditor sessions={sessions} onChange={setSessions} />
        </div>

        {/* Duration */}
        <div className="grid gap-6 sm:grid-cols-2 mb-6">
          <div>
            <label className={labelClass}>{t("classStartDate")} <RequiredMark /></label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${inputClass} date-input`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>{t("classEndDate")} <RequiredMark /></label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`${inputClass} date-input`}
              required
            />
          </div>
        </div>

        {/* Max Students */}
        <div className="mb-6">
          <label className={labelClass}>{t("classMaxStudents")}</label>
          <input
            type="number"
            value={maxStudents}
            onChange={(e) => setMaxStudents(parseInt(e.target.value) || 10)}
            min={1}
            max={100}
            className={`${inputClass} w-32`}
          />
        </div>

        {/* Special Notes */}
        <div className="mb-6">
          <label className={labelClass}>{t("classSpecialNotes")}</label>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            rows={3}
            placeholder={t("specialNotesPlaceholder")}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Link
            href="/teacher/classes"
            className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
          >
            {ct("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#2a14b4]/20 inline-flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-[16px] ${saving ? "animate-spin" : ""}`}>{saving ? "progress_activity" : "add"}</span>
            {saving ? t("creating") : t("createClass")}
          </button>
        </div>
      </form>
    </div>
  );
}
