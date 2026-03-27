"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ClassSessionEditor, { parseSessions, formatSessions } from "@/components/teacher/ClassSessionEditor";

type ClassInfo = {
  name: string;
  languageId: string;
  languageName: string;
  level: string;
  schedule: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  specialNotes: string;
  status: string;
};

type Language = { id: string; name: string; code: string };

type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  status: string;
  enrolledAt: string;
};

type AvailableStudent = { id: string; name: string; email: string };

type TopicAssignment = {
  id: string;
  title: string;
  languageName: string;
  assignedAt: string;
};

type Props = {
  classId: string;
  classInfo: ClassInfo;
  languages: Language[];
  enrolledStudents: EnrolledStudent[];
  availableStudents: AvailableStudent[];
  topics: TopicAssignment[];
};

const statusOptions = [
  { value: "SCHEDULING", label: "Scheduling", bg: "bg-[#d9e3f6]", text: "text-[#464554]" },
  { value: "ACTIVE", label: "Active", bg: "bg-[#a6f2d1]/40", text: "text-[#1b6b51]" },
  { value: "ENDED", label: "Ended", bg: "bg-[#ffdada]/40", text: "text-[#7b0020]" },
  { value: "ARCHIVED", label: "Archived", bg: "bg-[#d9e3f6]/50", text: "text-[#777586]" },
];

const levelPresets: Record<string, string[]> = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
};

export default function ClassDetailClient({
  classId,
  classInfo,
  languages,
  enrolledStudents,
  availableStudents,
  topics,
}: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();

  // Editable class fields
  const [editName, setEditName] = useState(classInfo.name);
  const [editLanguageId, setEditLanguageId] = useState(classInfo.languageId);
  const [editLevel, setEditLevel] = useState(classInfo.level);
  const [editSessions, setEditSessions] = useState(() => parseSessions(classInfo.schedule));
  const [editStartDate, setEditStartDate] = useState(classInfo.startDate);
  const [editEndDate, setEditEndDate] = useState(classInfo.endDate);
  const [editMaxStudents, setEditMaxStudents] = useState(classInfo.maxStudents);
  const [editNotes, setEditNotes] = useState(classInfo.specialNotes);
  const [editStatus, setEditStatus] = useState(classInfo.status);
  const [savingInfo, setSavingInfo] = useState(false);

  // Enrollment state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visibleEnrolled = enrolledStudents.filter((s) => !removedIds.has(s.id));
  const currentStatus = statusOptions.find((s) => s.value === editStatus) || statusOptions[0];
  const selectedLang = languages.find((l) => l.id === editLanguageId);
  const presets = selectedLang ? levelPresets[selectedLang.code] || [] : [];

  const editScheduleJson = JSON.stringify(editSessions.filter((s) => s.day && s.startTime && s.endTime));

  const hasInfoChanges =
    editName !== classInfo.name ||
    editLanguageId !== classInfo.languageId ||
    editLevel !== classInfo.level ||
    editScheduleJson !== classInfo.schedule ||
    editStartDate !== classInfo.startDate ||
    editEndDate !== classInfo.endDate ||
    editMaxStudents !== classInfo.maxStudents ||
    editNotes !== classInfo.specialNotes ||
    editStatus !== classInfo.status;

  const weeks = Math.ceil(
    (new Date(editEndDate).getTime() - new Date(editStartDate).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  async function handleSaveInfo() {
    const validSessions = editSessions.filter((s) => s.day && s.startTime && s.endTime);
    if (!editName.trim() || !editLevel.trim() || validSessions.length === 0) {
      toast.error("Please fill in all required fields and at least one class session");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          languageId: editLanguageId,
          level: editLevel.trim(),
          schedule: JSON.stringify(validSessions),
          startDate: editStartDate,
          endDate: editEndDate,
          maxStudents: editMaxStudents,
          specialNotes: editNotes.trim() || null,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update class");
        return;
      }
      toast.success(t("classUpdated"));
      router.refresh();
    } catch {
      toast.error("Failed to update class");
    } finally {
      setSavingInfo(false);
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleEnroll() {
    if (selectedStudents.size === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [...selectedStudents] }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to enroll students");
        return;
      }
      const data = await res.json();
      toast.success(`${data.count} student(s) enrolled`);
      setSelectedStudents(new Set());
      router.refresh();
    } catch {
      toast.error("Failed to enroll students");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleRemove(userId: string, name: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/enroll/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to remove student");
        return;
      }
      toast.success(`Removed ${name}`);
      setRemovedIds((prev) => new Set(prev).add(userId));
      router.refresh();
    } catch {
      toast.error("Failed to remove student");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with editable name + status */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 group/name mb-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-headline text-2xl sm:text-3xl font-bold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5 w-full"
            />
            <span className="material-symbols-outlined text-[18px] scale-75 text-[#c7c4d7] group-hover/name:text-[#2a14b4] transition-colors pointer-events-none shrink-0">
              edit
            </span>
          </div>
          <p className="text-sm font-body text-[#464554]">
            {selectedLang?.name || classInfo.languageName} · {editLevel} · {formatSessions(editSessions)}
          </p>
        </div>
        <select
          value={editStatus}
          onChange={(e) => setEditStatus(e.target.value)}
          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full w-fit shrink-0 border-none outline-none cursor-pointer ${currentStatus.bg} ${currentStatus.text}`}
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Editable Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
            {t("classLanguage")}
          </p>
          <select
            value={editLanguageId}
            onChange={(e) => { setEditLanguageId(e.target.value); setEditLevel(""); }}
            className="w-full text-sm font-body font-semibold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors cursor-pointer px-0 py-0.5"
          >
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
            {t("classLevel")}
          </p>
          {presets.length > 0 ? (
            <select
              value={editLevel}
              onChange={(e) => setEditLevel(e.target.value)}
              className="w-full text-sm font-body font-semibold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors cursor-pointer px-0 py-0.5"
            >
              <option value="">Select</option>
              {presets.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={editLevel}
              onChange={(e) => setEditLevel(e.target.value)}
              className="w-full text-sm font-body font-semibold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5"
            />
          )}
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("enrolledStudents")}
          </p>
          <p className="font-headline text-2xl text-[#2a14b4] font-bold">
            {visibleEnrolled.length}<span className="text-base text-[#777586] font-normal">/{editMaxStudents}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
            {t("classTopics")}
          </p>
          <p className="font-headline text-2xl text-[#1b6b51] font-bold">
            {topics.length}
          </p>
        </div>
      </div>

      {/* Class Sessions */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
        <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-3">
          {t("classSchedule")}
        </p>
        <ClassSessionEditor sessions={editSessions} onChange={setEditSessions} />
      </div>

      {/* Duration + Max Students */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
            {t("classStartDate")}
          </p>
          <input
            type="date"
            value={editStartDate}
            onChange={(e) => setEditStartDate(e.target.value)}
            className="w-full text-sm font-body text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5"
          />
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
            {t("classEndDate")}
          </p>
          <input
            type="date"
            value={editEndDate}
            onChange={(e) => setEditEndDate(e.target.value)}
            className="w-full text-sm font-body text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5"
          />
          <p className="text-xs text-[#777586] font-body mt-1">{weeks > 0 ? `${weeks} weeks` : ""}</p>
        </div>
        <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
          <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
            {t("classMaxStudents")}
          </p>
          <input
            type="number"
            value={editMaxStudents}
            onChange={(e) => setEditMaxStudents(parseInt(e.target.value) || 1)}
            min={1}
            max={100}
            className="w-20 text-sm font-body font-semibold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5"
          />
        </div>
      </div>

      {/* Special Notes (editable) */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5">
        <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
          {t("classSpecialNotes")}
        </p>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={2}
          placeholder="e.g., First class free trial | All sessions recorded"
          className="w-full text-sm font-body text-[#464554] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5 resize-none placeholder:text-[#464554]/30"
        />
      </div>

      {/* Save button */}
      {hasInfoChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            className="bg-[#2a14b4] text-white px-6 py-2.5 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {savingInfo ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Enrolled Students */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c7c4d7]/15">
          <h2 className="font-headline text-xl font-bold text-[#121c2a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4]">group</span>
            {t("enrolledStudents")}
          </h2>
        </div>
        {visibleEnrolled.length > 0 ? (
          <div className="divide-y divide-[#c7c4d7]/10">
            {visibleEnrolled.map((student) => {
              const initials = student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={student.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#eff4ff]/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#e3dfff] flex items-center justify-center shrink-0">
                    <span className="font-headline italic text-sm text-[#2a14b4]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-[#121c2a] text-sm">{student.name}</p>
                    <p className="text-xs text-[#777586] font-body truncate">{student.email}</p>
                  </div>
                  <span className="text-xs text-[#777586] font-body hidden sm:block">
                    {new Date(student.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleRemove(student.id, student.name)}
                    disabled={removingId === student.id}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[14px]">person_remove</span>
                    {t("removeStudent")}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <span className="material-symbols-outlined text-[#777586]/30 text-3xl mb-2">group</span>
            <p className="text-sm text-[#777586] font-body italic">No students enrolled yet.</p>
          </div>
        )}
      </div>

      {/* Add Students */}
      {availableStudents.length > 0 && (
        <div className="bg-[#eff4ff] rounded-xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-headline text-lg font-bold text-[#121c2a] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2a14b4] text-[20px]">person_add</span>
              {t("enrollStudents")}
            </h3>
            {selectedStudents.size > 0 && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="bg-[#2a14b4] text-white px-5 py-2 rounded-full text-xs font-body font-bold shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                {enrolling ? "..." : `Enroll ${selectedStudents.size}`}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {availableStudents.map((student) => {
              const isSelected = selectedStudents.has(student.id);
              const initials = student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    isSelected ? "bg-white ambient-shadow" : "hover:bg-white/60"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center shrink-0">
                    <span className="font-headline italic text-xs text-[#2a14b4]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-[#121c2a] text-sm">{student.name}</p>
                    <p className="text-xs text-[#777586] font-body truncate">{student.email}</p>
                  </div>
                  <span
                    className={`material-symbols-outlined text-[18px] ${isSelected ? "text-[#1b6b51]" : "text-[#c7c4d7]"}`}
                    style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {isSelected ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Topics */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c7c4d7]/15">
          <h2 className="font-headline text-xl font-bold text-[#121c2a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2a14b4]">menu_book</span>
            {t("classTopics")}
          </h2>
        </div>
        {topics.length > 0 ? (
          <div className="divide-y divide-[#c7c4d7]/10">
            {topics.map((topic) => (
              <div key={topic.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#eff4ff]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-[#121c2a] text-sm">{topic.title}</p>
                </div>
                <span className="text-xs font-body font-bold px-2.5 py-0.5 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51] shrink-0">
                  {topic.languageName}
                </span>
                <span className="text-xs text-[#777586] font-body hidden sm:block shrink-0">
                  {new Date(topic.assignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <span className="material-symbols-outlined text-[#777586]/30 text-3xl mb-2">menu_book</span>
            <p className="text-sm text-[#777586] font-body italic">
              No topics assigned yet. Go to Assignments to assign topics to this class.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
