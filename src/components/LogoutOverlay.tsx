"use client";

import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
};

export default function LogoutOverlay({ open }: Props) {
  const t = useTranslations("auth");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="logout-overlay"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#0a0a14]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            {/* Orbiting dots spinner */}
            <div
              className="relative w-12 h-12"
              style={{ animation: "logout-spin 1s steps(8, end) infinite" }}
            >
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-[6px] h-[6px] rounded-full bg-white"
                  style={{
                    top: "50%",
                    left: "50%",
                    marginTop: -3,
                    marginLeft: -3,
                    transform: `rotate(${i * 45}deg) translateY(-18px)`,
                    opacity: 0.15 + (i / 7) * 0.85,
                  }}
                />
              ))}
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-white/90 font-body text-xl font-medium tracking-wide">
                {t("loggingOut")}
              </p>
              <p className="text-white/45 font-body text-sm tracking-wide">
                {t("loggingOutHint")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
