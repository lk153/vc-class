"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  value: string;
  label: string;
  icon?: string;
};

type Props = {
  label: string;
  icon?: string;
  options: Option[];
  onSelect: (value: string) => void;
  disabled?: boolean;
};

/**
 * Custom dropdown styled as an M3 chip — matches LocaleSwitcher pattern.
 * No native <select>. Renders a custom popover with items.
 */
export default function ChipDropdown({ label, icon, options, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(value: string) {
    setOpen(false);
    onSelect(value);
  }

  return (
    <div ref={ref} className="relative no-ripple">
      <button
        onClick={() => !disabled && setOpen(!open)}
        className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[11px] font-body font-bold transition-all ${
          disabled
            ? "bg-[#f7f2fa] text-[#c7c4d7] cursor-not-allowed"
            : "bg-[#f7f2fa] text-[#2a14b4] hover:bg-[#e3dfff] cursor-pointer"
        }`}
      >
        {icon && (
          <span className="material-symbols-outlined text-[12px]">{icon}</span>
        )}
        {label}
        <span
          className="material-symbols-outlined text-[12px] text-[#777586] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-32 bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)] border border-[#c7c4d7]/15 py-1.5 z-50 no-ripple">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-body font-medium transition-colors whitespace-nowrap text-[#464554] hover:bg-[#eff4ff] hover:text-[#2a14b4]"
            >
              {opt.icon && (
                <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
              )}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
