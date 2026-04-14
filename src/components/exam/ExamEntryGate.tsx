"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ExamStatusBadge from "./ExamStatusBadge";

type Props = {
  topicId: string;
  practiceTestId: string;
  testTitle: string;
  testStatus: string;
  questionCount: number;
  totalTime: number;
  maxAttempts: number;
  partsCount: number;
  // Session data (from server query)
  sessionStatus?: string | null;
  sessionAttemptNumber?: number;
  sessionTimeRemaining?: number;
  sessionAnsweredCount?: number;
  sessionLastSavedAt?: string | null;
  sessionResultId?: string | null;
  sessionScore?: number | null;
  canRetake?: boolean;
  nextAttemptNumber?: number;
  // Children: the ExamShell component to render when starting
  children: React.ReactNode;
};

export default function ExamEntryGate({
  topicId,
  practiceTestId,
  testTitle,
  testStatus,
  questionCount,
  totalTime,
  maxAttempts,
  partsCount,
  sessionStatus,
  sessionAttemptNumber,
  sessionTimeRemaining,
  sessionAnsweredCount,
  sessionLastSavedAt,
  sessionResultId,
  sessionScore,
  canRetake,
  nextAttemptNumber,
  children,
}: Props) {
  const router = useRouter();
  const t = useTranslations("exam");
  const [started, setStarted] = useState(false);
  const [startingRetake, setStartingRetake] = useState(false);

  const effectiveStatus = sessionStatus || testStatus;

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} minutes`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  // If exam is started (user clicked Start/Continue), render the ExamShell
  if (started) {
    return <>{children}</>;
  }

  // ── Scenario 3: DOING — Resume prompt ──
  if (effectiveStatus === "DOING") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#fef3c7] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-[#92400e]">pending</span>
          </div>
          <ExamStatusBadge testStatus={testStatus} sessionStatus={sessionStatus} />
          <h2 className="font-body text-2xl font-bold text-[#121c2a] mt-4 mb-2">{t("resumeYourExam")}</h2>
          <p className="text-sm font-body text-[#777586] mb-6">{testTitle}</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[18px] text-[#5e35f1] mb-1 block">timer</span>
              <p className="text-lg font-body font-bold text-[#121c2a]">
                {sessionTimeRemaining != null ? formatDuration(sessionTimeRemaining) : "--"}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("remaining")}</p>
            </div>
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[18px] text-[#1b6b51] mb-1 block">check_circle</span>
              <p className="text-lg font-body font-bold text-[#121c2a]">
                {sessionAnsweredCount ?? 0}/{questionCount}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("answered")}</p>
            </div>
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[18px] text-[#777586] mb-1 block">save</span>
              <p className="text-sm font-body font-bold text-[#121c2a]">
                {sessionLastSavedAt ? formatDate(sessionLastSavedAt) : "--"}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("lastSaved")}</p>
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full py-4 rounded-full font-body font-bold text-sm text-white exam-cta
              shadow-lg shadow-[#5e35f1]/20 uppercase tracking-widest
              flex items-center justify-center gap-3 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            {t("continueExam")}
          </button>
        </div>
      </div>
    );
  }

  // ── Scenario 1: INACTIVE ──
  if (testStatus === "INACTIVE") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#e5e0ed]/50 flex items-center justify-center mx-auto mb-4 opacity-50">
            <span className="material-symbols-outlined text-[32px] text-[#777586]">block</span>
          </div>
          <h2 className="font-body text-xl font-bold text-[#777586] mb-2">
            {t("examNotAvailable")}
          </h2>
          <p className="text-sm font-body text-[#777586]">
            {t("examNotAvailableDesc")}
          </p>
        </div>
      </div>
    );
  }

  // ── Scenario 2: ACTIVE, no session — Instructions ──
  if (testStatus === "ACTIVE" && !sessionStatus) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <ExamStatusBadge testStatus={testStatus} sessionStatus={sessionStatus} />
            <h2 className="font-body text-2xl font-bold text-[#121c2a] mt-4 mb-2">{testTitle}</h2>
            <p className="text-sm font-body text-[#777586]">{t("reviewDetails")}</p>
          </div>

          {/* Exam info cards */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[20px] text-[#5e35f1] mb-1 block">quiz</span>
              <p className="text-lg font-body font-bold text-[#121c2a]">{questionCount}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("questions")}</p>
            </div>
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[20px] text-[#5e35f1] mb-1 block">timer</span>
              <p className="text-lg font-body font-bold text-[#121c2a]">{formatDuration(totalTime)}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("timeLimit")}</p>
            </div>
            {partsCount > 0 && (
              <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-[20px] text-[#5e35f1] mb-1 block">list</span>
                <p className="text-lg font-body font-bold text-[#121c2a]">{partsCount}</p>
                <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("parts")}</p>
              </div>
            )}
            <div className="bg-[#f8f9ff] rounded-xl p-4 text-center">
              <span className="material-symbols-outlined text-[20px] text-[#5e35f1] mb-1 block">replay</span>
              <p className="text-lg font-body font-bold text-[#121c2a]">
                {maxAttempts === 0 ? t("unlimited") : maxAttempts}
              </p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold">{t("attempts")}</p>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-white rounded-xl p-5 shadow-[0_10px_20px_rgba(94,53,241,0.04)] mb-8">
            <h3 className="font-body font-bold text-sm text-[#121c2a] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#5e35f1]">info</span>
              {t("examRules")}
            </h3>
            <ul className="space-y-2 text-sm font-body text-[#464554]">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#1b6b51] mt-0.5">check</span>
                {t("ruleAutoSave")}
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#1b6b51] mt-0.5">check</span>
                {t("ruleFlagNav")}
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#1b6b51] mt-0.5">check</span>
                {t("ruleReview")}
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#f59e0b] mt-0.5">warning</span>
                {t("ruleAutoSubmit")}
              </li>
            </ul>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full py-4 rounded-full font-body font-bold text-sm text-white exam-cta
              shadow-lg shadow-[#5e35f1]/20 uppercase tracking-widest
              flex items-center justify-center gap-3 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            {t("startExam")}
          </button>
        </div>
      </div>
    );
  }

  // ── Scenario 4: GRADING ──
  if (effectiveStatus === "GRADING") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#dbeafe] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-[#2563eb]">hourglass_top</span>
          </div>
          <ExamStatusBadge testStatus={testStatus} sessionStatus={sessionStatus} />
          <h2 className="font-body text-xl font-bold text-[#121c2a] mt-4 mb-2">{t("examSubmittedTitle")}</h2>
          <p className="text-sm font-body text-[#777586] mb-6">
            {t("examSubmittedDesc")}
          </p>
          {sessionLastSavedAt && (
            <p className="text-xs font-body text-[#777586]">
              {t("submitted")}: {formatDate(sessionLastSavedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Scenario 5 & 6: GRADED ──
  if (effectiveStatus === "GRADED") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#e3dfff] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-[#5e35f1]">verified</span>
          </div>
          <ExamStatusBadge testStatus={testStatus} sessionStatus={sessionStatus} />
          <h2 className="font-body text-xl font-bold text-[#121c2a] mt-4 mb-2">{testTitle}</h2>
          {sessionScore !== null && sessionScore !== undefined && (
            <p className="text-4xl font-body font-bold text-[#5e35f1] mb-1">{sessionScore}%</p>
          )}
          {typeof sessionAttemptNumber === "number" && sessionAttemptNumber > 1 && (
            <p className="text-xs font-body text-[#777586] mb-4">
              {t("attempt", { current: sessionAttemptNumber, max: maxAttempts > 0 ? maxAttempts : "∞" })}
            </p>
          )}
          <div className="flex flex-col gap-3 mt-6">
            {sessionResultId && (
              <button
                onClick={() => router.push(`/results/${sessionResultId}`)}
                className="w-full py-3 rounded-full font-body font-bold text-sm text-white exam-cta
                  shadow-lg shadow-[#5e35f1]/20"
              >
                {t("viewFullResults")}
              </button>
            )}
            {canRetake && nextAttemptNumber && (
              <button
                onClick={async () => {
                  setStartingRetake(true);
                  try {
                    const res = await fetch("/api/exam-session", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ practiceTestId, attemptNumber: nextAttemptNumber }),
                    });
                    if (res.ok) setStarted(true);
                  } finally {
                    setStartingRetake(false);
                  }
                }}
                disabled={startingRetake}
                className="w-full py-3 rounded-full font-body font-bold text-sm text-[#5e35f1]
                  bg-[#e3dfff] hover:bg-[#d4cef5] transition-colors disabled:opacity-50"
              >
                {startingRetake ? t("starting") : t("retakeExam")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
