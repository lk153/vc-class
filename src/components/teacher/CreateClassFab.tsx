"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * M3 Floating Action Button for "Create Class". Portaled to document.body so
 * it escapes any transformed ancestor. Mobile-only (sm:hidden) — desktop keeps
 * the header pill button instead.
 */
export default function CreateClassFab() {
  const t = useTranslations("teacher");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <Link
      href="/teacher/classes/create"
      aria-label={t("createClass")}
      className="sm:hidden fixed! bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[#2a14b4] text-white shadow-lg shadow-[#2a14b4]/30 flex items-center justify-center active:scale-90 transition-all"
    >
      <span className="material-symbols-outlined text-[26px]">add</span>
    </Link>,
    document.body,
  );
}
