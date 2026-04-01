"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

const locales = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === locale) || locales[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function switchLocale(code: string) {
    if (code === locale) {
      setOpen(false);
      return;
    }

    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: code }),
    });

    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative no-ripple">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-[#e3dfff]/50 transition-colors text-sm font-body text-[#464554]"
        title="Switch language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-xs font-medium">{current.code.toUpperCase()}</span>
        <span
          className="material-symbols-outlined text-[14px] text-[#777586] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-auto min-w-40 bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)] border border-[#c7c4d7]/15 py-1.5 z-50 no-ripple">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body transition-colors whitespace-nowrap ${
                locale === l.code
                  ? "text-[#2a14b4] bg-[#e3dfff]/40 font-medium"
                  : "text-[#464554] hover:bg-[#eff4ff]"
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.label}</span>
              {locale === l.code && (
                <span className="material-symbols-outlined text-[16px] text-[#2a14b4] ml-auto">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
