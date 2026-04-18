"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ModalOverlay from "@/components/ModalOverlay";

type Variant = "icon" | "action";

type Props = {
  topicId: string;
  topicTitle: string;
  variant?: Variant;
  /** Where to navigate after a successful delete. Defaults to list page. */
  redirectTo?: string | null;
};

export default function DeleteTopicButton({
  topicId,
  topicTitle,
  variant = "icon",
  redirectTo = "/teacher/topics",
}: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/teacher/topics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topicId }),
      });
      if (!res.ok) {
        toast.error(t("topicDeleteFailed"));
        return;
      }
      toast.success(t("topicDeleted"));
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error(t("topicDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label={t("topicDeleteConfirmTitle")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#7b0020] bg-[#ffdada]/20 hover:bg-[#ffdada]/40 transition-all invisible group-hover:visible"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body font-bold text-[#7b0020] bg-[#ffdada]/30 hover:bg-[#ffdada]/50 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
        {t("deleteTopic")}
      </button>
    );

  return (
    <>
      {trigger}
      <ModalOverlay open={open} onClose={() => !deleting && setOpen(false)} panelClass="max-w-md">
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffdada]/40 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#7b0020]">delete_forever</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {t("topicDeleteConfirmTitle")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-2 leading-relaxed">
            {t("topicDeleteConfirmMessage")}
            <span className="block mt-1 font-bold text-[#121c2a]">&ldquo;{topicTitle}&rdquo;</span>
          </p>
          <p className="text-xs font-body text-[#7b0020] mb-6">{t("topicDeleteWarning")}</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#7b0020] hover:bg-[#5c0017] shadow-lg shadow-[#7b0020]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {ct("delete")}
            </button>
          </div>
        </div>
      </ModalOverlay>
    </>
  );
}
