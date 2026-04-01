"use client";

import { useEffect } from "react";

export default function RippleEffect() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
        "button, a[class*='rounded']"
      ) as HTMLElement | null;

      if (
        !target ||
        target.closest(".no-ripple") ||
        target.classList.contains("no-ripple") ||
        target.hasAttribute("disabled") ||
        (target as HTMLButtonElement).disabled
      )
        return;

      // Remove any existing ripple before adding a new one
      target.querySelectorAll(".ripple-effect").forEach((el) => el.remove());

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      target.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
