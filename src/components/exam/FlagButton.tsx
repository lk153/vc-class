"use client";

import { useTranslations } from "next-intl";

type Props = {
  isFlagged: boolean;
  onToggle: () => void;
};

export default function FlagButton({ isFlagged, onToggle }: Props) {
  const t = useTranslations("exam");
  return (
    <button
      onClick={onToggle}
      className="w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:bg-[#f7f2fa]"
      title={isFlagged ? t("removeFlag") : t("flagForReview")}
    >
      <span
        className={`material-symbols-outlined text-[20px] transition-colors ${
          isFlagged ? "text-[#f59e0b]" : "text-[#c7c4d7] hover:text-[#777586]"
        }`}
        style={isFlagged ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        bookmark
      </span>
    </button>
  );
}
