"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import QuestionEditor from "@/components/teacher/QuestionEditor";
import EditableTitle from "@/components/teacher/EditableTitle";

type Test = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  questionCount: number;
};

type Question = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: string;
  answer1: string;
  answer2: string | null;
  answer3: string | null;
  answer4: string | null;
  correctAnswer: string;
  timer: number;
};

type TestDetail = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  questions: Question[];
};

type Props = {
  tests: Test[];
};

export default function PracticeTestGrid({ tests }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTestId) {
      let cancelled = false;
      setLoading(true);
      fetch(`/api/teacher/practice-tests/${selectedTestId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => { if (!cancelled) setDetail(data); })
        .catch(() => { if (!cancelled) toast.error(t("classUpdateFailed")); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    } else {
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestId]);

  // Body scroll lock + escape key
  useEffect(() => {
    if (selectedTestId) {
      document.body.style.overflow = "hidden";
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSelectedTestId(null);
      };
      window.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKey);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedTestId]);

  const closeModal = useCallback(() => setSelectedTestId(null), []);

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <motion.div
            key={test.id}
            layoutId={`test-card-${test.id}`}
            onClick={() => setSelectedTestId(test.id)}
            className="group bg-white rounded-xl ambient-shadow p-8 transition-colors duration-200 border border-transparent hover:border-[#2a14b4]/10 hover:bg-[#f5f3ff] cursor-pointer"
            style={{ borderRadius: 12 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2a14b4]">quiz</span>
              </div>
              <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                {tLang(t, test.languageName)}
              </span>
            </div>

            <h3 className="font-body font-bold text-2xl text-[#121c2a] mb-1 group-hover:text-[#2a14b4] transition-colors">
              {test.title}
            </h3>
            <p className="text-sm text-[#464554] font-body mb-6">
              {test.topicTitle}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[#c7c4d7]/15">
              <div className="flex gap-6">
                <div className="flex items-center gap-1.5 text-xs text-[#777586] font-body">
                  <span className="material-symbols-outlined text-[14px]">help</span>
                  {test.questionCount} {t("questionsCount")}
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold text-white bg-[#2a14b4] transition-all invisible group-hover:visible"
                onClick={(e) => { e.stopPropagation(); setSelectedTestId(test.id); }}
              >
                {t("viewDetails")}
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Shared Element Modal */}
      <AnimatePresence>
        {selectedTestId && (
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop: blur layer + dark overlay separated for smooth transition */}
            <motion.div
              className="fixed inset-0"
              onClick={closeModal}
              style={{ WebkitBackdropFilter: "var(--blur)" } as React.CSSProperties}
              initial={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
              animate={{ backdropFilter: "blur(8px)", "--blur": "blur(8px)" } as Record<string, string>}
              exit={{ backdropFilter: "blur(0px)", "--blur": "blur(0px)" } as Record<string, string>}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              className="fixed inset-0 bg-black/40"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Panel — shared layoutId morphs from the card */}
            <motion.div
              layoutId={`test-card-${selectedTestId}`}
              className="relative z-10 w-full max-w-4xl bg-[#f8f9ff] rounded-2xl shadow-xl my-auto"
              style={{ borderRadius: 16 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
                {/* Close button */}
                <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
                  <button
                    onClick={closeModal}
                    className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <motion.div
                  className="px-6 md:px-8 pb-6 md:pb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-24">
                      <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-3xl">progress_activity</span>
                    </div>
                  ) : detail ? (
                    <div className="space-y-6">
                      {/* Header */}
                      <div>
                        <EditableTitle testId={detail.id} title={detail.title} />
                        <p className="text-[#777586] font-body mt-1">
                          {detail.topicTitle} &middot; {tLang(t, detail.languageName)}
                        </p>
                      </div>

                      {/* Questions */}
                      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-6">
                        <h2 className="font-body font-bold text-xl text-[#121c2a] mb-4">
                          {t("questionsLabel")} ({detail.questions.length})
                        </h2>
                        <div className="space-y-4">
                          {detail.questions.map((q) => (
                            <QuestionEditor key={q.id} question={q} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
