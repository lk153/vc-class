"use client";

import { useMemo } from "react";

export type Section = {
  id: string;
  parentId: string | null;
  level: "PART" | "GROUP" | "EXERCISE";
  title: string;
  description: string | null;
  sortOrder: number;
  mediaUrl: string | null;
  mediaType: string | null;
};

export type ExamQuestion = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: string;
  answer1: string;
  answer2: string | null;
  answer3: string | null;
  answer4: string | null;
  timer: number;
  sectionId: string | null;
  advancedData: string | null;
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  difficulty?: number;
  audioPlayLimit?: number | null;
  answer1MediaUrl?: string | null;
  answer1MediaType?: string | null;
  answer2MediaUrl?: string | null;
  answer2MediaType?: string | null;
  answer3MediaUrl?: string | null;
  answer3MediaType?: string | null;
  answer4MediaUrl?: string | null;
  answer4MediaType?: string | null;
};

export type Phase = {
  id: string;
  type: "exercise" | "review";
  title: string;
  breadcrumb: string[];
  questions: ExamQuestion[];
  sectionMedia?: { url: string; type: string };
  sectionDescription?: string | null;
  partTitle?: string;
  groupTitle?: string;
};

/**
 * Builds a flat ordered list of navigable phases from section tree + questions.
 * Each EXERCISE-level section = one phase. Unsectioned questions = fallback phase.
 * Final phase is always the review phase.
 */
export function useExamPhases(
  sections: Section[],
  questions: ExamQuestion[],
  shuffleQuestions: boolean = false,
  shuffleSeed: string = ""
): Phase[] {
  return useMemo(() => {
    const phases: Phase[] = [];
    const sectionMap = new Map(sections.map((s) => [s.id, s]));

    // Build breadcrumb by walking up parent chain
    function buildBreadcrumb(sectionId: string): string[] {
      const crumbs: string[] = [];
      let current: Section | undefined = sectionMap.get(sectionId);
      while (current) {
        crumbs.unshift(current.title);
        current = current.parentId ? sectionMap.get(current.parentId) : undefined;
      }
      return crumbs;
    }

    // Find parent PART and GROUP titles for a section
    function findAncestors(sectionId: string): { partTitle?: string; groupTitle?: string } {
      let partTitle: string | undefined;
      let groupTitle: string | undefined;
      let current: Section | undefined = sectionMap.get(sectionId);
      while (current) {
        if (current.level === "PART") partTitle = current.title;
        if (current.level === "GROUP") groupTitle = current.title;
        current = current.parentId ? sectionMap.get(current.parentId) : undefined;
      }
      return { partTitle, groupTitle };
    }

    // Get children sorted by sortOrder
    function getChildren(parentId: string | null): Section[] {
      return sections
        .filter((s) => s.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Get questions for a section
    function getQuestions(sectionId: string): ExamQuestion[] {
      const qs = questions
        .filter((q) => q.sectionId === sectionId)
        .sort((a, b) => a.questionNumber - b.questionNumber);
      return shuffleQuestions ? seededShuffle(qs, shuffleSeed + sectionId) : qs;
    }

    // Walk tree depth-first — create phases for EXERCISE-level sections
    function walkSection(section: Section) {
      const children = getChildren(section.id);

      if (section.level === "EXERCISE" || children.length === 0) {
        // Leaf section — create a phase
        const sectionQuestions = getQuestions(section.id);
        if (sectionQuestions.length > 0) {
          const { partTitle, groupTitle } = findAncestors(section.id);
          phases.push({
            id: section.id,
            type: "exercise",
            title: section.title,
            breadcrumb: buildBreadcrumb(section.id),
            questions: sectionQuestions,
            sectionMedia:
              section.mediaUrl && section.mediaType
                ? { url: section.mediaUrl, type: section.mediaType }
                : undefined,
            sectionDescription: section.description,
            partTitle,
            groupTitle,
          });
        }
      }

      // Recurse into children
      for (const child of children) {
        walkSection(child);
      }
    }

    // Start from root sections
    const rootSections = getChildren(null);
    for (const root of rootSections) {
      walkSection(root);
    }

    // Handle unsectioned questions
    const unsectioned = questions
      .filter((q) => !q.sectionId)
      .sort((a, b) => a.questionNumber - b.questionNumber);

    if (unsectioned.length > 0) {
      const qs = shuffleQuestions ? seededShuffle(unsectioned, shuffleSeed + "unsectioned") : unsectioned;
      phases.push({
        id: "unsectioned",
        type: "exercise",
        title: "General",
        breadcrumb: ["General"],
        questions: qs,
      });
    }

    // If no sections at all, create a single phase with all questions
    if (phases.length === 0 && questions.length > 0) {
      const qs = shuffleQuestions
        ? seededShuffle([...questions].sort((a, b) => a.questionNumber - b.questionNumber), shuffleSeed)
        : [...questions].sort((a, b) => a.questionNumber - b.questionNumber);
      phases.push({
        id: "all",
        type: "exercise",
        title: "Questions",
        breadcrumb: ["Questions"],
        questions: qs,
      });
    }

    // Append review phase
    phases.push({
      id: "review",
      type: "review",
      title: "Review",
      breadcrumb: ["Review"],
      questions: [],
    });

    return phases;
  }, [sections, questions, shuffleQuestions, shuffleSeed]);
}

/**
 * Deterministic shuffle using a seed string.
 * Same seed + same array = same output (consistent across page reloads).
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
