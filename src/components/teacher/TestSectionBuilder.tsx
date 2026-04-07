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
  PART: { icon: "book", color: "text-[#2a14b4]", bg: "bg-[#e3dfff]", indent: 0, childLevel: "GROUP" as const, label: "Part" },
  GROUP: { icon: "folder", color: "text-[#1b6b51]", bg: "bg-[#a6f2d1]/30", indent: 1, childLevel: "EXERCISE" as const, label: "Group" },
  EXERCISE: { icon: "assignment", color: "text-[#f59e0b]", bg: "bg-[#fef3c7]", indent: 2, childLevel: null, label: "Exercise" },
};

export default function TestSectionBuilder({ testId, sections: initialSections }: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [adding, setAdding] = useState<{ parentId: string | null; level: "PART" | "GROUP" | "EXERCISE" } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function buildTree(parentId: string | null): Section[] {
    return sections
      .filter((s) => s.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function handleAdd() {
    if (!adding || !newTitle.trim()) return;
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
    }
  }

  async function handleUpdate(id: string) {
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
      // Remove section and all descendants
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

  function renderSection(section: Section) {
    const config = LEVEL_CONFIG[section.level];
    const children = buildTree(section.id);
    const isEditing = editingId === section.id;

    return (
      <div key={section.id} style={{ marginLeft: `${config.indent * 24}px` }}>
        <div className="flex items-center gap-2 py-2 group">
          {/* Icon */}
          <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
            <span className={`material-symbols-outlined text-[14px] ${config.color}`}>{config.icon}</span>
          </div>

          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#c7c4d7]/20 text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate(section.id)}
              />
              <button onClick={() => handleUpdate(section.id)} className="text-[#1b6b51] hover:text-[#1b6b51]/80">
                <span className="material-symbols-outlined text-[16px]">check</span>
              </button>
              <button onClick={() => setEditingId(null)} className="text-[#777586] hover:text-[#7b0020]">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm font-body font-medium text-[#121c2a]">{section.title}</span>
              {section.description && (
                <span className="text-xs font-body text-[#777586] italic truncate max-w-[200px]">{section.description}</span>
              )}
              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {config.childLevel && (
                  <button
                    onClick={() => { setAdding({ parentId: section.id, level: config.childLevel! }); setNewTitle(""); setNewDescription(""); }}
                    className="w-6 h-6 rounded flex items-center justify-center text-[#2a14b4] hover:bg-[#e3dfff] transition-colors"
                    title={`Add ${LEVEL_CONFIG[config.childLevel!].label}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                  </button>
                )}
                <button
                  onClick={() => { setEditingId(section.id); setEditTitle(section.title); setEditDescription(section.description || ""); }}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#777586] hover:bg-[#f0eef6] transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(section.id)}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#777586] hover:text-[#7b0020] hover:bg-[#ffdada]/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children */}
        {children.map((child) => renderSection(child))}

        {/* Add inline form (if adding to this parent) */}
        {adding && adding.parentId === section.id && (
          <div style={{ marginLeft: `${(config.indent + 1) * 24}px` }} className="flex items-center gap-2 py-2">
            <div className={`w-7 h-7 rounded-lg ${LEVEL_CONFIG[adding.level].bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[14px] ${LEVEL_CONFIG[adding.level].color}`}>{LEVEL_CONFIG[adding.level].icon}</span>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`${LEVEL_CONFIG[adding.level].label} title...`}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#c7c4d7]/20 text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} disabled={!newTitle.trim()} className="text-[#1b6b51] hover:text-[#1b6b51]/80 disabled:opacity-30">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
            <button onClick={() => setAdding(null)} className="text-[#777586] hover:text-[#7b0020]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const rootSections = buildTree(null);

  return (
    <div className="bg-white rounded-xl shadow-[0px_10px_20px_rgba(18,28,42,0.04)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body font-bold text-sm text-[#121c2a] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#2a14b4]">account_tree</span>
          Test Structure
        </h3>
        <button
          onClick={() => { setAdding({ parentId: null, level: "PART" }); setNewTitle(""); setNewDescription(""); }}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-body font-bold bg-[#f0eef6] text-[#2a14b4] hover:bg-[#e3dfff] transition-colors"
        >
          <span className="material-symbols-outlined text-[12px]">add</span>
          Add Part
        </button>
      </div>

      {rootSections.length === 0 && !adding ? (
        <p className="text-xs font-body text-[#777586] italic py-4 text-center">No sections yet. Add a Part to create the test structure.</p>
      ) : (
        <div className="space-y-0">
          {rootSections.map((section) => renderSection(section))}
        </div>
      )}

      {/* Add Part form (root level) */}
      {adding && adding.parentId === null && (
        <div className="flex items-center gap-2 py-2 mt-2">
          <div className="w-7 h-7 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[14px] text-[#2a14b4]">book</span>
          </div>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Part title... (e.g. Part II: Language)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#c7c4d7]/20 text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 outline-none"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button onClick={handleAdd} disabled={!newTitle.trim()} className="text-[#1b6b51] hover:text-[#1b6b51]/80 disabled:opacity-30">
            <span className="material-symbols-outlined text-[16px]">check</span>
          </button>
          <button onClick={() => setAdding(null)} className="text-[#777586] hover:text-[#7b0020]">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
