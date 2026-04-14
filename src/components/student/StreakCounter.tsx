"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  streak: number;
};

function getStreakInfo(streak: number): { messageKey: "streakUnstoppable" | "streakAmazing" | "streakNice"; icon: string; color: string } | null {
  if (streak >= 10) return { messageKey: "streakUnstoppable", icon: "local_fire_department", color: "text-[#7b0020]" };
  if (streak >= 5) return { messageKey: "streakAmazing", icon: "local_fire_department", color: "text-[#f59e0b]" };
  if (streak >= 3) return { messageKey: "streakNice", icon: "bolt", color: "text-[#2a14b4]" };
  return null;
}

export default function StreakCounter({ streak }: Props) {
  const t = useTranslations("student");
  const info = getStreakInfo(streak);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (info) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [streak]);

  return (
    <AnimatePresence>
      {show && info && (
        <motion.div
          key={`streak-${streak}`}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)]"
        >
          <span className={`material-symbols-outlined text-[18px] ${info.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {info.icon}
          </span>
          <span className="font-body font-bold text-sm text-[#121c2a]">{t(info.messageKey)}</span>
          <span className="font-body font-bold text-xs text-[#2a14b4] bg-[#e3dfff] px-2 py-0.5 rounded-full">
            {streak}x
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
