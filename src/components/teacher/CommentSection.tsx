"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
};

type Props = {
  testId: string;
  comments: Comment[];
};

export default function CommentSection({ testId, comments }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/practice-tests/${testId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        toast.error("Failed to post comment");
        return;
      }

      setContent("");
      router.refresh();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="font-semibold text-foreground mb-4">{t("comments")}</h2>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {comment.userName}
                </span>
                <span className="text-xs text-muted">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("addComment") + "..."}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={posting || !content.trim()}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${posting ? "animate-spin" : ""}`}>{posting ? "progress_activity" : "send"}</span>
            {t("addComment")}
          </button>
        </div>
      </div>
    </div>
  );
}
