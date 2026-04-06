"use client";

import { motion, AnimatePresence } from "motion/react";

type Props = {
  questionIndex: number;
  contentMediaType?: string | null;
  children: React.ReactNode;
};

function getTypeBadge(type?: string | null): { label: string; icon: string } | null {
  if (type === "audio") return { label: "Listening", icon: "headphones" };
  if (type === "video") return { label: "Video", icon: "play_circle" };
  if (type === "image") return { label: "Visual", icon: "visibility" };
  return null;
}

export default function QuestionTransition({ questionIndex, contentMediaType, children }: Props) {
  const badge = getTypeBadge(contentMediaType);

  return (
    <div className="relative">
      {/* Type badge flash */}
      <AnimatePresence>
        {badge && (
          <motion.div
            key={`badge-${questionIndex}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute -top-8 left-0 z-20"
          >
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-widest ${
              contentMediaType === "audio" ? "bg-[#a6f2d1]/40 text-[#1b6b51]"
              : contentMediaType === "video" ? "bg-[#ffdada]/40 text-[#7b0020]"
              : "bg-[#e3dfff] text-[#2a14b4]"
            }`}>
              <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
              {badge.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
