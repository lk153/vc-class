"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const tLang = (name: string) => {
    const key = `lang_${name}`;
    return t.has(key) ? t(key) : name;
  };
  const router = useRouter();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (testId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/practice-tests/${testId}`);
      if (res.ok) {
        setDetail(await res.json());
      } else {
        toast.error(t("classUpdateFailed"));
      }
    } catch {
      toast.error(t("classUpdateFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedTestId) {
      fetchDetail(selectedTestId);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setDetail(null);
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedTestId, fetchDetail]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedTestId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <div
            key={test.id}
            onClick={() => setSelectedTestId(test.id)}
            className="group bg-white rounded-xl ambient-shadow p-8 transition-colors duration-200 border border-transparent hover:border-[#2a14b4]/10 hover:bg-[#f5f3ff] cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#2a14b4]">quiz</span>
              </div>
              <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#a6f2d1]/40 text-[#1b6b51]">
                {tLang(test.languageName)}
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
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedTestId && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[5vh] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTestId(null);
          }}
        >
          <div className="bg-[#f8f9ff] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
              <button
                onClick={() => setSelectedTestId(null)}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 md:px-8 pb-6 md:pb-8">
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
                      {detail.topicTitle} &middot; {tLang(detail.languageName)}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
