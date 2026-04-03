"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Panel width class, default "max-w-2xl" */
  panelClass?: string;
};

export default function ModalOverlay({
  open,
  onClose,
  children,
  panelClass = "max-w-2xl",
}: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKey);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop: blur + dark overlay separated for smooth transition */}
          <motion.div
            className="fixed inset-0"
            onClick={onClose}
            style={{ WebkitBackdropFilter: "var(--blur)" } as React.CSSProperties}
            initial={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
            animate={{ backdropFilter: "blur(8px)", "--blur": "blur(8px)" } as Record<string, string>}
            exit={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Panel */}
          <motion.div
            className={`relative z-10 w-full ${panelClass} bg-white rounded-2xl shadow-xl my-auto`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.3 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
