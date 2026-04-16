# PRD: Student Result Detail Page

**Route:** `/results/[resultId]`
**Component:** `src/app/(student)/results/[resultId]/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Result Detail page is the deepest layer of the student-facing assessment workflow. After a student submits a test and a teacher grades it, this page is where learning actually happens: the student sees what they got right, what they got wrong, why the correct answer is what it is, and what their teacher said about their individual responses.

The page is structured as a progressive reveal: a **score hero** occupies the top (the emotional gut-punch of the result), followed by **analytics panels** (difficulty breakdown, question-type performance, time distribution, attempt history), and finally the **answer review** — the detailed, question-by-question breakdown that is the core pedagogical value of the feature.

Correct answers and explanations are gated behind the `GRADED` status — a student awaiting teacher grading sees their own answers but not the model answers. Teacher feedback (per-question comments, score overrides) is always shown when present, regardless of grading status.

A motivational confetti animation fires for scores ≥ 80%, matching the celebration moment in `ResultsScreen` used in the practice-mode flow.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Student | See my total score prominently at the top of the page | I immediately know how well I did without scrolling |
| US-02 | Student | See my score color-coded green / purple / red | I can emotionally register my performance at a glance |
| US-03 | Student | See a confetti animation when I scored ≥ 80% | The platform celebrates my success and makes learning feel rewarding |
| US-04 | Student | See how I performed on Easy, Medium, and Hard questions separately | I can identify whether my difficulty with the test is systematic or question-type-specific |
| US-05 | Student | See a breakdown of my accuracy by question type (MCQ, Gap Fill, etc.) | I can understand which skill areas need the most practice |
| US-06 | Student | See a time distribution chart showing how long I spent on each section | I can identify where I rushed or got stuck during the exam |
| US-07 | Student | See all my previous attempts for this test in a history timeline | I can track my improvement across retakes |
| US-08 | Student | Review every question with my answer marked correct or incorrect | I can learn from my mistakes on a question-by-question basis |
| US-09 | Student | See the correct answer only after the teacher has graded my exam | I cannot cheat on retakes by looking up answers before submitting |
| US-10 | Student | See the teacher's explanation for each question | I understand the reasoning behind the correct answer, not just the answer itself |
| US-11 | Student | See my teacher's per-question comment when they have left feedback | I receive personalized guidance from my teacher |
| US-12 | Student | See when a teacher has overridden my auto-graded answer | I understand that the final mark reflects my teacher's judgment, not just the system |
| US-13 | Student | See overall test-level comments from my teacher | I receive holistic feedback beyond individual question corrections |
| US-14 | Student | Navigate back to the results list with a single click | I can return to my results history without using the browser back button |
| US-15 | Student | Navigate back to the topic from the bottom of the page | I can immediately continue studying the topic after reviewing my result |
| US-16 | Student | See an appropriate 404 page if I navigate to a result that is not mine | My data is protected and I see a clean error state rather than a crash |

---

## Functional Requirements

### FR-01: Authentication & Authorization
- The page is only accessible to authenticated users.
- Both the student layout and the page component itself verify the session with `auth()`.
- The Prisma query uses `where: { id: resultId, userId: session.user.id }` — a student cannot access another student's result even if they know the CUID.
- If the result does not exist or belongs to another user, `notFound()` is called, rendering the Next.js 404 page.

### FR-02: Primary Data Fetch
- A single `prisma.practiceResult.findUnique` query with the following includes:
  - `practiceTest`: `{ id, title, topicId, topic: { title } }`.
  - `studentAnswers`: all answers for the result, including `question` fields: `{ questionNumber, content, questionType, correctAnswer, explanation, difficulty, sectionId }`. Ordered by `question.questionNumber ASC`.
  - `comments`: test-level teacher comments, including `user.name`. Ordered `createdAt ASC`.
  - `examSession`: `{ status, attemptNumber, gradedAt }`.

### FR-03: Attempt History Fetch
- A secondary `prisma.practiceResult.findMany` query retrieves all attempts the student has made for this test:
  ```
  where: { userId: session.user.id, practiceTestId: result.practiceTest.id }
  orderBy: { completedAt: "asc" }
  select: { id, score, completedAt, examSession: { attemptNumber } }
  ```
- The current result is highlighted in the list.
- This section is only rendered when `allAttempts.length > 1`.

### FR-04: Score Display
- Score is `Math.round(result.score)`.
- Displayed as a large `text-5xl` percentage in the score hero.
- Color thresholds:
  - `>= 80` → `text-[#1b6b51]` (green).
  - `50–79` → `text-[#2a14b4]` (purple).
  - `< 50` → `text-[#7b0020]` (red).
- Subtitle: `{correctCount} / {totalQuestions} correct`.

### FR-05: Confetti on High Score
- When `score >= 80`, a confetti animation fires on client load.
- The confetti is implemented as a client-side effect; since this is a server component, the confetti must be housed in a dedicated `"use client"` child component (`ConfettiOverlay` or equivalent).
- The current implementation renders the confetti inline in the page — this requires the page to be partially client-rendered or to delegate confetti to a leaf client component.
- Confetti uses 40 colored circles (`motion.div`) falling from top to bottom using `motion/react`. Each particle is randomized in: start position (left %), color (6-color palette), rotation, and duration (2–4s). Particles fade to `opacity: 0` as they exit.
- Confetti auto-dismisses after 4000ms via `setTimeout`.

### FR-06: Difficulty Breakdown
- Computed server-side from `result.studentAnswers`:
  ```
  [1, 2, 3].map(level => {
    qs = studentAnswers where question.difficulty === level
    correct = qs where isCorrect === true
    return { level, label, total: qs.length, correct: correct.length }
  }).filter(d => d.total > 0)
  ```
- Only rendered when `byDifficulty.length > 1` (i.e., the test has questions of at least two difficulty levels).
- Labels: 1 → "Easy", 2 → "Medium", 3 → "Hard".
- Each difficulty bucket shows: percentage (`Math.round(correct/total * 100)%`), label, and `correct/total` fraction.

### FR-07: Question Type Performance
- Computed server-side using a `Map<questionType, { correct, total }>`.
- All `studentAnswers` are iterated; each `question.questionType` is a key.
- Each row shows: question type label (underscores replaced by spaces), `correct/total (pct%)`.
- Only rendered when `typeMap.size > 1`.

### FR-08: Time Distribution
- Computed server-side from `studentAnswers[].timeSpent` (stored in seconds as `Int?`).
- `totalTimeSpent` = sum of all `timeSpent` values (nulls treated as 0).
- `timeBySection` = `Map<sectionId, { label, time }>` where time is the sum of `timeSpent` for questions in that section.
- Questions without a `sectionId` are grouped under a `"general"` key with label `"General"`.
- Each section row shows: label, percentage of total time, time in minutes (`Math.round(time / 60)m`), and a filled progress bar.
- Only rendered when `totalTimeSpent > 0 && timeBySection.size > 1`.

### FR-09: Grading Status Gate
- `isGraded = result.examSession?.status === "GRADED"`.
- If `examSession` is null, `isGraded` defaults to `true` (legacy results without a session are treated as graded).
- When `isGraded === false`: correct answers, explanations, and explanation media are **withheld** from the answer review.
- When `isGraded === true`: correct answers and explanations are shown for incorrect answers only (no need to show correct answer for a question the student answered correctly).

### FR-10: Answer Review
- One row per `studentAnswer`, ordered by `questionNumber ASC`.
- Each row shows:
  - A numbered circle (green background for correct, red for incorrect) displaying `questionNumber`.
  - Question content text.
  - "Your answer: {selectedAnswer}" — colored green if correct, red if incorrect.
  - "Correct: {correctAnswer}" — shown only when `isGraded === true` and `effectiveCorrect === false`.
  - Teacher comment (if `teacherComment` is set) — lavender card with `chat` icon.
  - Explanation (if `isGraded === true` and `question.explanation` is set) — light blue card with `lightbulb` icon.
- `effectiveCorrect` = `sa.teacherOverride !== null ? sa.teacherOverride : sa.isCorrect`.
  - If the teacher overrides an auto-graded answer, `teacherOverride` takes precedence over `isCorrect`.
- Rows with `effectiveCorrect === false` have a subtle red background tint (`bg-[#ffdada]/5`).
- If `selectedAnswer` is empty (`""`), display `"(no answer)"`.

### FR-11: Teacher Override Visibility
- `teacherOverride` (boolean | null): when not null, overrides the auto-graded `isCorrect` in the display.
- `teacherScore` (float | null): currently stored but not yet displayed in the UI. Planned for a future "per-question score" panel.
- `teacherComment` (string | null): displayed as a comment card beneath the student's answer row.

### FR-12: Test-Level Comments
- Rendered below the answer review section.
- Only shown when `result.comments.length > 0`.
- Each comment: commenter name, date (`toLocaleDateString()`), comment content.
- Comments are ordered by `createdAt ASC` (teacher's first comment first).

### FR-13: Navigation
- Back link at the top: "← My Results" → `/results`.
- Back to topic button at the bottom: "← Back to Topic" → `/topics/{result.practiceTest.topicId}`.
- Both are `<Link>` components from Next.js.

### FR-14: Page Metadata
- `title: "Test Result"`.
- `description: "View your test result details and teacher feedback."`.

---

## Non-Functional Requirements

### NFR-01: Performance
- Two sequential Prisma queries (primary result + attempt history) execute on every page load.
- The primary query is the heavier one (includes student answers, comments, exam session). For typical tests (< 60 questions), this should complete in < 100ms.
- The attempt history query is lightweight (select-only, small result set).
- Future optimization: run both queries in parallel via `Promise.all`.

### NFR-02: Security
- The `where: { id: resultId, userId: session.user.id }` clause prevents IDOR attacks — students cannot read other students' results by guessing result IDs.
- Correct answers are only included in the rendered output when `isGraded === true`. The server never sends `correctAnswer` to the client when the session is in DOING or GRADING state.
- The attempt history query is also scoped to `userId === session.user.id`.

### NFR-03: Accessibility
- Score is always rendered as text, not solely as color.
- Colored numbered circles have text content (the question number), not color-only indicators.
- Progress bars (time distribution) include percentage text alongside the bar element.
- All interactive elements (back links, topic button) are native anchor elements — keyboard navigable.
- `<h1>` is the test title; `<h3>` elements are analytics section headers — correct hierarchy.

### NFR-04: Internationalisation
- The back-link label uses `t("myResults")` from the `"student"` namespace.
- Most section labels, answer review labels, and status messages are currently hardcoded in English and should be migrated to i18n keys in a future pass.
- The `ExamStatusBadge` is not used on this page (the score hero replaces it), but the grading-state message ("Your exam is being reviewed...") should be added to the `"exam"` namespace if a status message is added.

### NFR-05: Correctness of Analytics
- All analytics (difficulty, type, time) are computed server-side from the stored `studentAnswers`. They are derived views of the same data shown in the answer review, so they are always consistent — there is no possibility of a discrepancy between the summary and the detail.

---

## UI/UX Requirements

### Layout
- Outer wrapper: `max-w-3xl mx-auto px-4 py-8`.
- Back link: `inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#121c2a] mb-6`.
- Score hero: `text-center mb-8`.
- Analytics panels: `bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(18,28,42,0.04)] mb-4` each.
- Answer review: `bg-white rounded-2xl shadow-[...] overflow-hidden mb-4` with a header and `divide-y` rows.
- Comments section: same card style as analytics panels.
- Bottom CTA: `text-center mt-8`.

### Score Hero
- Test title: `text-xl font-body font-bold text-[#121c2a] mb-1`.
- Topic + attempt label: `text-sm font-body text-[#777586] mb-4`.
- Score: `text-5xl font-body font-bold mb-2`, color-coded.
- Fraction: `text-base font-body text-[#777586]` — `{correct} / {total} correct`.

### Confetti
- Fixed overlay, `pointer-events-none`, `z-50`, `overflow-hidden`.
- 40 particles, each `w-3 h-3 rounded-full`.
- Color palette: `#2a14b4`, `#f59e0b`, `#1b6b51`, `#7b0020`, `#4338ca`, `#a6f2d1`.
- Animation: `top: -5%` → `top: 105%`, with random rotation and `opacity: 0` on arrival.
- Duration: 2–4s per particle, stagger delay 0–0.8s.
- Auto-dismiss: `setTimeout(() => setShowConfetti(false), 4000)`.

### Analytics Panels
- Section header: `text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2`.
- Icon: `text-[16px] text-[#2a14b4]`.
- Difficulty grid: `grid-cols-3 gap-3`, each cell `text-center`.
  - Percentage: `text-lg font-body font-bold text-[#121c2a]`.
  - Label: `text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold`.
  - Fraction: `text-xs font-body text-[#c7c4d7]`.
- Type rows: `flex items-center justify-between`, type name `text-xs text-[#464554]`, stat `text-xs font-bold text-[#121c2a]`.
- Time bars: label `text-xs text-[#464554]`, stat `text-xs font-bold text-[#121c2a]`, bar track `h-1.5 rounded-full bg-[#f1ecf6]`, fill `bg-[#5e35f1]`.

### Attempt History
- Each row: `flex items-center justify-between px-3 py-2 rounded-lg`.
- Current attempt: `bg-[#e3dfff]/30 ring-1 ring-[#5e35f1]/20`.
- Other attempts: `bg-[#f8f9ff]`.
- Attempt label: `text-xs font-body font-bold text-[#777586]`.
- "Current" chip: `text-[9px] font-body font-bold text-[#5e35f1] bg-[#e3dfff] px-1.5 py-0.5 rounded`.
- Score: color-coded same thresholds as score hero.
- Date: `text-xs font-body text-[#c7c4d7]`.

### Answer Review
- Header bar: `px-5 py-3.5 border-b border-[#c7c4d7]/15`.
- Section title: `font-body font-bold text-base text-[#121c2a] flex items-center gap-2`.
- Each answer row: `px-5 py-4`, optional `bg-[#ffdada]/5` for incorrect.
- Number circle: `w-7 h-7 rounded-full`, green = `bg-[#a6f2d1]/30 text-[#1b6b51]`, red = `bg-[#ffdada]/30 text-[#7b0020]`.
- Question content: `text-sm font-body text-[#121c2a] font-medium mb-2`.
- Answer labels: `text-xs font-body`, correct = `text-[#1b6b51]`, incorrect = `text-[#7b0020]`.
- Teacher comment card: `bg-[#f7f2fa] rounded-lg p-3 flex items-start gap-2`.
- Explanation card: `bg-[#f8f9ff] rounded-lg p-3 flex items-start gap-2`.

### Bottom CTA (Back to Topic)
- Button: `inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-body font-bold text-white bg-[#2a14b4] hover:bg-[#4338ca] shadow-lg shadow-[#2a14b4]/15 transition-all`.

---

## Edge Cases

| Case | Expected Behavior |
|------|------------------|
| `resultId` belongs to a different user | `notFound()` — renders 404 page |
| `resultId` does not exist in the database | `notFound()` — renders 404 page |
| Session is `GRADING` | Answer review shows student's answers; correct answers and explanations are hidden |
| Session is `DOING` | Same as GRADING — correct answers hidden |
| `examSession` is null (legacy result) | `isGraded` defaults to `true`; correct answers are shown |
| Score is exactly 80% | Confetti fires; color is green |
| Score is exactly 79% | No confetti; color is purple |
| Score is 0% | Score hero shows "0%", color is red; all answer rows show incorrect |
| All questions correct | All numbered circles are green; no "Correct:" lines shown in review |
| No `sectionId` on any question | Time distribution panel has a single "General" bucket — hidden (requires `size > 1`) |
| `timeSpent` is null on all answers | `totalTimeSpent === 0` — time distribution panel is hidden entirely |
| `byDifficulty.length === 1` | Difficulty panel is hidden (no breakdown value when all questions are the same difficulty) |
| `typeMap.size === 1` | Question type panel is hidden |
| `teacherOverride === true` on an incorrect answer | `effectiveCorrect === true` — numbered circle turns green; row loses red tint; "Correct:" line disappears |
| `teacherOverride === false` on a correct answer | `effectiveCorrect === false` — numbered circle turns red; row gets red tint |
| `teacherComment` is present but `isGraded === false` | Comment card is still shown — teacher feedback is always visible |
| `selectedAnswer` is empty string | Displays `"(no answer)"` |
| `explanation` is set but `isGraded === false` | Explanation is hidden |
| Only one attempt (`allAttempts.length === 1`) | Attempt history panel is hidden |
| `result.comments.length === 0` | Teacher comments panel is hidden entirely |
| Very long question content | Text wraps naturally; no truncation in the answer review |
| Very long teacher comment | Text wraps; no truncation |
| `practiceTest.topicId` is null | Back-to-topic button would link to `/topics/undefined` — should validate in a future hardening pass |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Page render time (TTFB) | < 500ms (P95) | Server timing / Vercel Analytics |
| Confetti trigger rate for high scores | 100% of page loads where score >= 80 | Client-side event log |
| Answer review scroll depth | > 80% of sessions scroll past the analytics panels to the answer review | Scroll depth analytics |
| Teacher comment visibility rate | > 50% of graded results have at least one teacher comment | DB query on `teacherComment IS NOT NULL` |
| Correct answer display correctness | 100% — shown only when GRADED | Automated test: mock session with GRADING status, verify no correctAnswer in rendered HTML |
| Zero accessibility violations | 0 critical WCAG 2.1 AA violations | axe-core in CI |
| Confetti auto-dismiss within 4s | 100% | Manual QA + visual regression |
| "Back to Topic" CTA click rate | > 40% of result detail sessions | Path analytics (result → topic) |
