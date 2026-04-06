import { useCallback } from "react";

type DraftData = {
  currentIndex: number;
  answers: unknown[];
  streak: number;
  startedAt: number;
  testUpdatedAt?: string;
};

const STORAGE_KEY_PREFIX = "vc-practice-draft-";

export function useSessionDraft(testId: string) {
  const key = `${STORAGE_KEY_PREFIX}${testId}`;

  const saveDraft = useCallback(
    (data: DraftData) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // storage full or unavailable
      }
    },
    [key],
  );

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as DraftData;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // silent
    }
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}
