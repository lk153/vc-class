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
  resultId: string;
  comments: Comment[];
};

export default function ResultCommentSection({ resultId, comments }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/teacher/student-results/${resultId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        toast.error("Failed to post comment");
        return;
      }

      toast.success(t("commentPosted"));
      setContent("");
      router.refresh();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-6">
      <h2 className="font-headline text-xl font-bold text-[#121c2a] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#2a14b4]">chat</span>
        {t("teacherFeedback")}
      </h2>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border-b border-[#c7c4d7]/15 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-[#e3dfff] flex items-center justify-center text-[10px] font-bold text-[#2a14b4]">
                  {comment.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="text-sm font-body font-semibold text-[#121c2a]">
                  {comment.userName}
                </span>
                <span className="text-xs font-body text-[#777586]">
                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm font-body text-[#464554] pl-8">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("addFeedback") + "..."}
          className="w-full px-4 py-3 rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 text-sm font-body placeholder:text-[#464554]/40 resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={posting || !content.trim()}
            className="bg-[#2a14b4] text-white px-6 py-2.5 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            {t("addFeedback")}
          </button>
        </div>
      </div>
    </div>
  );
}
