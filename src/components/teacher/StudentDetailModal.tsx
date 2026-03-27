"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AssignedTopic = {
  id: string;
  assignmentId: string;
  title: string;
  languageName: string;
  createdBy: string;
  assignedAt: string;
};

type ClassTopicGroup = {
  className: string;
  topics: AssignedTopic[];
};

type Student = {
  id: string;
  name: string;
  email: string;
  status: string;
  languageId: string | null;
  languageName: string;
  topicCount: number;
  classTopics: ClassTopicGroup[];
  createdAt: string;
};

type Language = {
  id: string;
  name: string;
};

type Props = {
  student: Student;
  onClose: () => void;
};

export default function StudentDetailModal({ student, onClose }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [unassigning, setUnassigning] = useState<string | null>(null);

  // Editable fields
  const [editName, setEditName] = useState(student.name);
  const [editEmail, setEditEmail] = useState(student.email);
  const [editLanguageId, setEditLanguageId] = useState(student.languageId || "");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    editName.trim() !== student.name ||
    editEmail.trim() !== student.email ||
    (editLanguageId || null) !== (student.languageId || null);

  const initials = editName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isInactive = student.status !== "ACTIVE";
  const totalVisibleTopics = student.classTopics.reduce(
    (sum, cg) => sum + cg.topics.filter((t) => !removedIds.has(t.assignmentId)).length,
    0
  );

  // Fetch languages for dropdown
  useEffect(() => {
    fetch("/api/languages")
      .then((res) => res.json())
      .then(setLanguages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSave() {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          name: editName.trim(),
          email: editEmail.trim(),
          learnLanguageId: editLanguageId || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to update student");
        return;
      }
      toast.success("Student updated");
      router.refresh();
    } catch {
      toast.error("Failed to update student");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch("/api/teacher/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update status");
        return;
      }
      toast.success(`Student ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleUnassign(assignmentId: string, topicTitle: string) {
    setUnassigning(assignmentId);
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to unassign topic");
        return;
      }
      toast.success(`Unassigned "${topicTitle}"`);
      setRemovedIds((prev) => new Set(prev).add(assignmentId));
      router.refresh();
    } catch {
      toast.error("Failed to unassign topic");
    } finally {
      setUnassigning(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[5vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#f8f9ff] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header with editable name/email */}
          <div className="flex items-start gap-4 pr-8">
            <div className={`w-14 h-14 rounded-full bg-[#e3dfff] flex items-center justify-center text-lg font-bold text-[#2a14b4] shrink-0 mt-1 ${isInactive ? "grayscale" : ""}`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-1.5 group/name">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: `${Math.max(editName.length, 1)}ch` }}
                  className="font-headline text-2xl font-bold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5 min-w-[2ch] max-w-full"
                />
                <span className="material-symbols-outlined text-[18px] scale-75 text-[#c7c4d7] group-hover/name:text-[#2a14b4] transition-colors pointer-events-none shrink-0">
                  edit
                </span>
              </div>
              <div className="flex items-center gap-1.5 group/email">
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: `${Math.max(editEmail.length, 1)}ch` }}
                  className="text-sm font-body text-[#777586] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors px-0 py-0.5 min-w-[2ch] max-w-full"
                />
                <span className="material-symbols-outlined text-[18px] scale-75 text-[#c7c4d7] group-hover/email:text-[#2a14b4] transition-colors pointer-events-none shrink-0">
                  edit
                </span>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                Status
              </p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-bold ${
                  student.status === "ACTIVE"
                    ? "bg-[#a6f2d1]/40 text-[#1b6b51]"
                    : "bg-[#d9e3f6] text-[#777586]"
                }`}
              >
                {student.status}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-2">
                Language
              </p>
              <select
                value={editLanguageId}
                onChange={(e) => setEditLanguageId(e.target.value)}
                className="w-full text-sm font-body font-semibold text-[#121c2a] bg-transparent border-b-2 border-transparent hover:border-[#c7c4d7]/40 focus:border-[#2a14b4] outline-none transition-colors cursor-pointer px-0 py-0.5"
              >
                <option value="">—</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                Topics
              </p>
              <p className="font-headline text-2xl font-bold text-[#2a14b4]">
                {totalVisibleTopics}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-4">
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mb-1">
                Joined
              </p>
              <p className="font-headline text-base text-[#121c2a]">
                {new Date(student.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Save button (shown when changes detected) */}
          {hasChanges && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim() || !editEmail.trim()}
                className="bg-[#2a14b4] text-white px-5 py-2 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {/* Assigned Topics (grouped by class) */}
          {student.classTopics.length > 0 ? (
            <div className="space-y-4">
              {student.classTopics.map((classGroup) => {
                const visibleClassTopics = classGroup.topics.filter(
                  (t) => !removedIds.has(t.assignmentId)
                );
                if (visibleClassTopics.length === 0) return null;

                return (
                  <div
                    key={classGroup.className}
                    className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] overflow-hidden"
                  >
                    <div className="px-5 py-3.5 border-b border-[#c7c4d7]/15 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2a14b4] text-[18px]">school</span>
                      <h3 className="font-headline text-base font-bold text-[#121c2a]">
                        {classGroup.className}
                      </h3>
                      <span className="text-xs font-body text-[#777586] ml-1">
                        {visibleClassTopics.length} topics
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[480px]">
                        <thead>
                          <tr className="bg-[#eff4ff]/50 text-[10px] font-bold uppercase tracking-[0.08em] text-[#464554]/70">
                            <th className="px-5 py-2.5">Topic</th>
                            <th className="px-5 py-2.5">Language</th>
                            <th className="px-5 py-2.5">Created By</th>
                            <th className="px-5 py-2.5">Assigned</th>
                            <th className="px-5 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c7c4d7]/10">
                          {visibleClassTopics.map((topic) => (
                            <tr
                              key={topic.assignmentId}
                              className="hover:bg-[#eff4ff]/50 transition-colors"
                            >
                              <td className="px-5 py-3 font-body font-medium text-[#121c2a]">
                                {topic.title}
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-xs font-body font-bold px-2.5 py-0.5 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                                  {topic.languageName}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-xs text-[#777586] font-body">
                                {topic.createdBy}
                              </td>
                              <td className="px-5 py-3 text-xs text-[#777586] font-body">
                                {new Date(topic.assignedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => handleUnassign(topic.assignmentId, topic.title)}
                                  disabled={unassigning === topic.assignmentId}
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Unassign topic"
                                >
                                  <span className="material-symbols-outlined text-[14px]">link_off</span>
                                  {unassigning === topic.assignmentId ? "..." : "Unassign"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] px-5 py-8 text-center">
              <span className="material-symbols-outlined text-[#777586]/30 text-3xl mb-2">menu_book</span>
              <p className="text-sm text-[#777586] font-body italic">
                No topics assigned yet.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={handleToggleStatus}
              className={`px-5 py-2.5 rounded-full text-sm font-body font-bold transition-all flex items-center gap-2 ${
                student.status === "ACTIVE"
                  ? "bg-[#ffdada]/30 text-[#7b0020] hover:bg-[#ffdada]/50"
                  : "bg-[#a6f2d1]/30 text-[#1b6b51] hover:bg-[#a6f2d1]/50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {student.status === "ACTIVE" ? "person_off" : "person"}
              </span>
              {student.status === "ACTIVE" ? t("deactivate") : t("activate")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
