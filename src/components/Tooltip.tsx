"use client";

type Position = "top" | "bottom";

type Props = {
  /** The tooltip text content */
  content: string;
  /** Where the tooltip appears relative to the trigger icon. Default: "bottom" */
  position?: Position;
  /** Horizontal alignment of the tooltip box. Default: "center" */
  align?: "left" | "center" | "right";
  /** Custom max-width class. Default: "max-w-xs" */
  maxWidth?: string;
  /** Custom trigger icon. Default: "info" */
  icon?: string;
  children?: React.ReactNode;
};

/**
 * Reusable tooltip with info icon trigger.
 * Matches the StudentResultsTable header tooltip design:
 * dark bg, white text, arrow pointer, hover-reveal.
 *
 * Usage:
 *   <Tooltip content="Explanation text here" />
 *   <Tooltip content="Long text" position="top" align="right" />
 *   <Tooltip content="Custom trigger"><span>?</span></Tooltip>
 */
export default function Tooltip({
  content,
  position = "bottom",
  align = "center",
  maxWidth = "max-w-xs",
  icon = "info",
  children,
}: Props) {
  // Position classes for the tooltip box
  const positionClass = position === "top"
    ? "bottom-full mb-2"
    : "top-full mt-2";

  // Alignment classes
  const alignClass =
    align === "left" ? "left-0" :
    align === "right" ? "right-0" :
    "left-1/2 -translate-x-1/2";

  // Arrow classes
  const arrowClass = position === "top"
    ? `before:top-full ${
        align === "left" ? "before:left-3" :
        align === "right" ? "before:right-3" :
        "before:left-1/2 before:-translate-x-1/2"
      } before:border-t-[#121c2a] before:border-b-transparent`
    : `before:bottom-full ${
        align === "left" ? "before:left-3" :
        align === "right" ? "before:right-3" :
        "before:left-1/2 before:-translate-x-1/2"
      } before:border-b-[#121c2a] before:border-t-transparent`;

  return (
    <span className="relative inline-flex group/tooltip">
      {/* Trigger */}
      {children || (
        <span className="material-symbols-outlined text-[14px] text-[#777586] cursor-help">
          {icon}
        </span>
      )}

      {/* Tooltip box */}
      <span
        className={`
          pointer-events-none absolute z-50
          ${positionClass} ${alignClass}
          opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150
          ${maxWidth} w-max
          bg-[#121c2a] text-white text-xs font-body font-medium
          leading-relaxed normal-case tracking-normal
          px-3 py-1.5 rounded-2xl shadow-lg
          before:content-[''] before:absolute before:border-[5px] before:border-transparent
          ${arrowClass}
        `}
      >
        {content}
      </span>
    </span>
  );
}
