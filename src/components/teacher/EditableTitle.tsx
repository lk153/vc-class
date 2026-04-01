"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  testId: string;
  title: string;
};

export default function EditableTitle({ testId, title }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/teacher/practice-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testId, title: trimmed }),
      });

      if (!res.ok) {
        toast.error("Failed to update title");
        setValue(title);
      } else {
        toast.success("Title updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update title");
      setValue(title);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="font-body font-bold text-3xl text-[#121c2a] bg-transparent border-b-2 border-[#2a14b4] outline-none py-1 w-full max-w-lg"
        />
        {saving && (
          <span className="text-sm text-[#777586]">Saving...</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 group">
      <h1 className="font-body font-bold text-3xl text-[#121c2a]">{title}</h1>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#777586] hover:text-[#2a14b4]"
        title="Edit title"
      >
        <span className="material-symbols-outlined text-[20px]">edit</span>
      </button>
    </div>
  );
}
