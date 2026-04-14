"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Phase } from "./useExamPhases";

type SessionStatus = "DOING" | "GRADING" | "GRADED" | "loading" | "error";

export type ExamSessionState = {
  // Session
  sessionId: string | null;
  status: SessionStatus;
  attemptNumber: number;

  // Navigation
  phases: Phase[];
  currentPhaseIndex: number;
  goToPhase: (index: number) => void;
  nextPhase: () => void;
  prevPhase: () => void;
  isFirstPhase: boolean;
  isLastContentPhase: boolean;
  isReviewPhase: boolean;
  currentPhase: Phase | null;

  // Answers
  answers: Record<string, string>;
  setAnswer: (questionId: string, value: string) => void;

  // Flags
  flaggedQuestions: Set<string>;
  toggleFlag: (questionId: string) => void;

  // Timer
  timeRemaining: number;
  isTimeWarning: boolean;
  isTimeCritical: boolean;

  // Tab integrity
  tabSwitchCount: number;

  // Auto-save
  saveStatus: "saved" | "saving" | "error" | "idle";
  lastSavedAt: Date | null;
  isDirty: boolean;

  // Submit
  isSubmitting: boolean;
  submitResult: { status: string; score: number; resultId: string; correctCount: number; totalQuestions: number } | null;
  submit: () => Promise<void>;
};

type InitOptions = {
  practiceTestId: string;
  phases: Phase[];
  totalTime: number;
};

export function useExamSession({ practiceTestId, phases, totalTime }: InitOptions): ExamSessionState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(totalTime);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "idle">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: string; score: number; resultId: string; correctCount: number; totalQuestions: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const performSaveRef = useRef<() => Promise<void>>(async () => {});
  const isDirtyRef = useRef(false);

  // Keep refs in sync
  sessionIdRef.current = sessionId;
  isDirtyRef.current = isDirty;

  // ── Initialize: create or resume session ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/exam-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ practiceTestId }),
        });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();

        if (cancelled) return;

        setSessionId(data.sessionId);
        setStatus(data.status);
        setAttemptNumber(data.attemptNumber || 1);

        if (data.status === "DOING") {
          // Resume or new session
          const serverAnswers = typeof data.answers === "string"
            ? JSON.parse(data.answers) : (data.answers || {});
          const serverFlagged = typeof data.flagged === "string"
            ? JSON.parse(data.flagged) : (data.flagged || []);

          // Compare with localStorage
          const lsKey = `exam-session-${practiceTestId}`;
          const lsRaw = localStorage.getItem(lsKey);
          let useLocal = false;
          if (lsRaw) {
            try {
              const ls = JSON.parse(lsRaw);
              if (ls.lastSavedAt && data.lastSavedAt) {
                useLocal = new Date(ls.lastSavedAt) > new Date(data.lastSavedAt);
              }
            } catch { /* use server */ }
          }

          if (useLocal && lsRaw) {
            const ls = JSON.parse(lsRaw);
            setAnswers(ls.answers || {});
            setFlaggedQuestions(new Set(ls.flagged || []));
            setTimeRemaining(ls.timeRemaining ?? data.timeRemaining);
            setCurrentPhaseIndex(ls.currentPhaseIndex ?? data.currentPhaseIndex ?? 0);
            setIsDirty(true); // sync back to server on next save
          } else {
            setAnswers(serverAnswers);
            setFlaggedQuestions(new Set(serverFlagged));
            setTimeRemaining(data.timeRemaining);
            setCurrentPhaseIndex(data.currentPhaseIndex ?? 0);
          }

          setLastSavedAt(data.lastSavedAt ? new Date(data.lastSavedAt) : null);
          setSaveStatus("saved");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [practiceTestId]);

  // ── Timer countdown ──
  useEffect(() => {
    if (status !== "DOING" || submittedRef.current) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up — auto-submit
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save every 3 seconds (stable interval — only depends on status) ──
  useEffect(() => {
    if (status !== "DOING") return;

    autoSaveRef.current = setInterval(() => {
      if (!isDirtyRef.current || !sessionIdRef.current) return;
      performSaveRef.current();
    }, 3000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [status]);

  // ── Tab switch detection ──
  useEffect(() => {
    if (status !== "DOING") return;

    function handleVisibility() {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          setIsDirty(true);
          return next;
        });
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status]);

  // ── beforeunload: final save ──
  useEffect(() => {
    if (status !== "DOING") return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      // Save to localStorage synchronously
      saveToLocalStorage();
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, answers, flaggedQuestions, timeRemaining, currentPhaseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save functions ──
  function saveToLocalStorage() {
    const lsKey = `exam-session-${practiceTestId}`;
    localStorage.setItem(lsKey, JSON.stringify({
      answers,
      flagged: Array.from(flaggedQuestions),
      timeRemaining,
      currentPhaseIndex,
      lastSavedAt: new Date().toISOString(),
    }));
  }

  const performSave = useCallback(async () => {
    if (!sessionIdRef.current || submittedRef.current) return;
    setSaveStatus("saving");

    // Always save to localStorage first
    saveToLocalStorage();

    try {
      const res = await fetch(`/api/exam-session/${sessionIdRef.current}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          flagged: Array.from(flaggedQuestions),
          timeRemaining,
          currentPhaseIndex,
          tabSwitchCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveStatus("saved");
        setLastSavedAt(new Date(data.lastSavedAt));
        setIsDirty(false);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [answers, flaggedQuestions, timeRemaining, currentPhaseIndex, tabSwitchCount, practiceTestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep performSave ref in sync (avoids interval teardown on state changes)
  performSaveRef.current = performSave;

  // ── Actions ──
  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setIsDirty(true);
  }

  function toggleFlag(questionId: string) {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    setIsDirty(true);
  }

  function goToPhase(index: number) {
    if (index >= 0 && index < phases.length) {
      setCurrentPhaseIndex(index);
      setIsDirty(true);
    }
  }

  function nextPhase() {
    goToPhase(currentPhaseIndex + 1);
  }

  function prevPhase() {
    goToPhase(currentPhaseIndex - 1);
  }

  const handleSubmit = useCallback(async () => {
    if (!sessionIdRef.current || submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    // Stop timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    // Final save before submit
    try {
      await fetch(`/api/exam-session/${sessionIdRef.current}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          flagged: Array.from(flaggedQuestions),
          timeRemaining,
          currentPhaseIndex,
          tabSwitchCount,
        }),
      });
    } catch { /* best effort */ }

    // Submit
    try {
      const res = await fetch(`/api/exam-session/${sessionIdRef.current}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });

      if (res.ok) {
        const result = await res.json();
        setSubmitResult(result);
        setStatus(result.status);
        // Clear localStorage
        localStorage.removeItem(`exam-session-${practiceTestId}`);
      }
    } catch {
      // Submission failed — allow retry
      submittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, flaggedQuestions, timeRemaining, currentPhaseIndex, tabSwitchCount, practiceTestId]);

  const contentPhases = phases.filter((p) => p.type !== "review");
  const currentPhase = phases[currentPhaseIndex] || null;

  return {
    sessionId,
    status,
    attemptNumber,
    phases,
    currentPhaseIndex,
    goToPhase,
    nextPhase,
    prevPhase,
    isFirstPhase: currentPhaseIndex === 0,
    isLastContentPhase: currentPhaseIndex === contentPhases.length - 1,
    isReviewPhase: currentPhase?.type === "review",
    currentPhase,
    answers,
    setAnswer,
    flaggedQuestions,
    toggleFlag,
    timeRemaining,
    isTimeWarning: timeRemaining <= 300 && timeRemaining > 60,
    isTimeCritical: timeRemaining <= 60,
    tabSwitchCount,
    saveStatus,
    lastSavedAt,
    isDirty,
    isSubmitting,
    submitResult,
    submit: handleSubmit,
  };
}
