"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Section = {
  id: string;
  parentId: string | null;
  level: "PART" | "GROUP" | "EXERCISE";
  title: string;
  description: string | null;
  sortOrder: number;
  mediaUrl: string | null;
  mediaType: string | null;
};

type Props = {
  testId: string;
  sections: Section[];
};

const LEVEL_CONFIG = {
  PART: {
    icon: "menu_book",
    color: "text-[#2a14b4]",
    bg: "bg-[#e3dfff]",
    surface: "bg-[#f7f2fa]",
    accent: "#2a14b4",
    childLevel: "GROUP" as const,
    label: "Part",
    childLabel: "Group",
  },
  GROUP: {
    icon: "folder_open",
    color: "text-[#1b6b51]",
    bg: "bg-[#a6f2d1]/30",
    surface: "bg-[#f0fdf4]",
    accent: "#1b6b51",
    childLevel: "EXERCISE" as const,
    label: "Group",
    childLabel: "Exercise",
  },
  EXERCISE: {
    icon: "description",
    color: "text-[#92400e]",
    bg: "bg-[#fef3c7]/60",
    surface: "bg-[#fffbeb]",
    accent: "#f59e0b",
    childLevel: null,
    label: "Exercise",
    childLabel: "",
  },
};

export default function TestSectionBuilder({ testId, sections: initialSections }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [adding, setAdding] = useState<{ parentId: string | null; level: "PART" | "GROUP" | "EXERCISE" } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function buildTree(parentId: string | null): Section[] {
    return sections
      .filter((s) => s.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function handleAdd() {
    if (!adding || !newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const sortOrder = sections.filter((s) => s.parentId === adding.parentId).length;
      const res = await fetch("/api/teacher/test-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          parentId: adding.parentId,
          level: adding.level,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          sortOrder,
        }),
      });
      if (res.ok) {
        const section = await res.json();
        setSections((prev) => [...prev, section]);
        setAdding(null);
        setNewTitle("");
        setNewDescription("");
        router.refresh();
      }
    } catch {
      toast.error("Failed to add section");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/test-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: editTitle.trim(), description: editDescription.trim() || null }),
      });
      if (res.ok) {
        setSections((prev) => prev.map((s) => s.id === id ? { ...s, title: editTitle.trim(), description: editDescription.trim() || null } : s));
        setEditingId(null);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this section and all its children?")) return;
    try {
      await fetch("/api/teacher/test-sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const toRemove = new Set<string>();
      function collectIds(parentId: string) {
        toRemove.add(parentId);
        sections.filter((s) => s.parentId === parentId).forEach((s) => collectIds(s.id));
      }
      collectIds(id);
      setSections((prev) => prev.filter((s) => !toRemove.has(s.id)));
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    }
  }

  // Inline add form
  function renderAddForm(level: "PART" | "GROUP" | "EXERCISE") {
    const config = LEVEL_CONFIG[level];
    return (
      <div className={`flex items-center gap-2.5 p-3 rounded-xl ${config.surface} border border-dashed border-[${config.accent}]/20`}>
        <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-[16px] ${config.color}`}>{config.icon}</span>
        </div>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={`${config.label} title...`}
          disabled={saving}
          className="flex-1 px-3 py-1.5 rounded-lg bg-white text-sm font-body
            focus:ring-2 focus:ring-[#2a14b4]/20 outline-none border border-[#c7c4d7]/15 disabled:opacity-50"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape" && !saving) setAdding(null); }}
        />
        {saving ? (
          <div className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px] text-[#2a14b4] animate-spin">progress_activity</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="w-8 h-8 rounded-full bg-[#2a14b4] text-white flex items-center justify-center
                disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4338ca] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
            <button
              onClick={() => setAdding(null)}
              className="w-8 h-8 rounded-full bg-[#f0eef6] text-[#777586] flex items-center justify-center
                hover:bg-[#ffdada]/40 hover:text-[#7b0020] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        )}
      </div>
    );
  }

  function renderSection(section: Section) {
    const config = LEVEL_CONFIG[section.level];
    const children = buildTree(section.id);
    const isEditing = editingId === section.id;
    const childCount = children.length;
    const qCount = section.level === "EXERCISE"
      ? "" // exercises have questions but we don't count here
      : `${childCount} ${config.childLabel}${childCount !== 1 ? "s" : ""}`;

    return (
      <div key={section.id}>
        {/* Section card — M3 Elevated */}
        <div
          className={`group rounded-2xl p-3.5 transition-all
            bg-[var(--color-card,#fff)]
            shadow-[0_1px_2px_0_rgba(0,0,0,0.06),0_1px_3px_0_rgba(0,0,0,0.1)]
            hover:shadow-[0_2px_6px_2px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]
            ${isEditing ? "ring-2 ring-[#2a14b4]/20" : ""}`}
        >
          <div className="flex items-center gap-3">
            {/* Level icon */}
            <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[18px] ${config.color}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
            </div>

            {isEditing ? (
              /* Edit mode */
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#2a14b4]/20 text-sm font-body font-medium
                    focus:ring-2 focus:ring-[#2a14b4]/20 outline-none disabled:opacity-50"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(section.id); if (e.key === "Escape" && !saving) setEditingId(null); }}
                />
                {saving ? (
                  <div className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-[#2a14b4] animate-spin">progress_activity</span>
                  </div>
                ) : (
                  <>
                    <button onClick={() => handleUpdate(section.id)}
                      className="w-8 h-8 rounded-full bg-[#1b6b51] text-white flex items-center justify-center hover:bg-[#1b6b51]/80 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="w-8 h-8 rounded-full bg-[#f0eef6] text-[#777586] flex items-center justify-center hover:bg-[#ffdada]/40 hover:text-[#7b0020] transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-[#121c2a] truncate">{section.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {section.description && (
                      <span className="text-[11px] font-body text-[#777586] truncate max-w-[180px]">{section.description}</span>
                    )}
                    {qCount && (
                      <span className="text-[10px] font-body text-[#c7c4d7]">
                        {section.description ? "·" : ""} {qCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons — visible on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {config.childLevel && (
                    <button
                      onClick={() => { setAdding({ parentId: section.id, level: config.childLevel! }); setNewTitle(""); setNewDescription(""); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#2a14b4] hover:bg-[#e3dfff] transition-colors"
                      title={`Add ${LEVEL_CONFIG[config.childLevel!].label}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingId(section.id); setEditTitle(section.title); setEditDescription(section.description || ""); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] hover:text-[#2a14b4] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#777586] hover:text-[#7b0020] hover:bg-[#ffdada]/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Children — nested with tree connector */}
        {children.length > 0 && (
          <div className="ml-4 pl-4 border-l-2 border-[#c7c4d7]/15 mt-1.5 space-y-1.5">
            {children.map((child) => renderSection(child))}
          </div>
        )}

        {/* Inline add form for children of this section */}
        {adding && adding.parentId === section.id && (
          <div className="ml-4 pl-4 border-l-2 border-[#c7c4d7]/15 mt-1.5">
            {renderAddForm(adding.level)}
          </div>
        )}
      </div>
    );
  }

  const rootSections = buildTree(null);

  return (
    <div className="rounded-2xl bg-[var(--color-card,#fff)] shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#e3dfff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-[#2a14b4]">account_tree</span>
          </div>
          <div>
            <h3 className="font-body font-bold text-base text-[#121c2a]">Test Structure</h3>
            <p className="text-[11px] font-body text-[#777586]">
              {rootSections.length} {rootSections.length === 1 ? "part" : "parts"} · {sections.length} total sections
            </p>
          </div>
        </div>
        <button
          onClick={() => { setAdding({ parentId: null, level: "PART" }); setNewTitle(""); setNewDescription(""); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-body font-bold
            bg-[#2a14b4] text-white hover:bg-[#4338ca]
            shadow-[0_1px_3px_rgba(42,20,180,0.3)] hover:shadow-[0_2px_6px_rgba(42,20,180,0.3)]
            transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Part
        </button>
      </div>

      {/* Tree */}
      {rootSections.length === 0 && !adding ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f7f2fa] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px] text-[#c7c4d7]">account_tree</span>
          </div>
          <p className="text-sm font-body text-[#777586] mb-1">No structure yet</p>
          <p className="text-xs font-body text-[#c7c4d7]">Add a Part to start building the test structure</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rootSections.map((section) => renderSection(section))}
        </div>
      )}

      {/* Add Part form (root level) */}
      {adding && adding.parentId === null && (
        <div className="mt-3">
          {renderAddForm("PART")}
        </div>
      )}
    </div>
  );
}
