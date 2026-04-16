# PRD: Teacher Result Detail & Grading Page

**Routes:**
- Full page: `/teacher/student-results/[resultId]`
- Modal: `ResultDetailModal` opened from `/teacher/student-results`
- Grade by Question: `GradeByQuestion` component (modal, opened from the practice-test detail page)

**Components:**
- `src/app/teacher/student-results/[resultId]/page.tsx`
- `src/components/teacher/ResultDetailModal.tsx`
- `src/components/teacher/GradeByQuestion.tsx`
- `src/components/teacher/ResultCommentSection.tsx`

**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Result Detail & Grading feature is the deepest layer of the teacher-facing assessment workflow. After a student completes an exam (especially one containing CUE_WRITING questions that require subjective evaluation), this page is where the teacher:

1. **Reviews** the student's complete answer record — every question, every response, with auto-grading already applied.
2. **Overrides** auto-grading decisions per answer (`teacherOverride: boolean`) when the system's binary correct/incorrect judgment does not capture the nuance of the student's response.
3. **Assigns partial credit** for CUE_WRITING answers (`teacherScore: float 0–1`) via a slider.
4. **Writes per-answer comments** (`teacherComment: string`) to give the student targeted feedback.
5. **Posts overall feedback** via the `ResultCommentSection` — test-level comments visible to the student on their result page.
6. **Marks the session as Graded** — transitions the `ExamSession.status` from `GRADING` → `GRADED`, unlocking correct answers on the student side.

There are two complementary entry points to grading:

- **ResultDetailModal** — quick inline review opened as an overlay from the results listing. This is the primary grading interface: teachers expand rows to grade individual answers without leaving the listing page. Suitable for most results.
- **Full detail page** — the permanent URL at `/teacher/student-results/[resultId]`. A server-rendered page with the answer table and `ResultCommentSection`. Used for bookmarking, sharing, and for results generated from practice mode (no exam session, no grading controls).
- **GradeByQuestion** — a cross-result grading interface opened from the Practice Test detail page. Lets teachers see all students' answers to one question at once and grade them in batch, navigating question-by-question with arrow keys.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Teacher | See the student's name, email, score, test name, topic, and submission date at the top of the detail view | I have full context before reviewing the answers |
| US-02 | Teacher | See a tab-switch warning if the student changed tabs during the exam | I can note potential academic integrity concerns before grading |
| US-03 | Teacher | See every question with the student's answer and whether it was auto-graded correct or incorrect | I can review the full submission without navigating away |
| US-04 | Teacher | Expand any answer row to see grading controls | I can grade an answer without opening a separate page |
| US-05 | Teacher | Click "Correct" or "Incorrect" to override the auto-grading for a question | I can fix cases where the system's binary judgment was wrong |
| US-06 | Teacher | Use a slider to assign a partial score (0–100%) to a CUE_WRITING answer | I can give credit proportional to the quality of the student's response |
| US-07 | Teacher | Write a per-question comment to explain my grading decision | The student understands why I changed their mark |
| US-08 | Teacher | Click Save on an individual answer to persist my grading | Changes are saved without affecting other answers in progress |
| US-09 | Teacher | Filter the answer table to show only answers that need manual review | I can focus on CUE_WRITING answers and ungraded submissions efficiently |
| US-10 | Teacher | Click "Mark as Graded" to finalize the result | The student sees their correct answers and the exam session closes |
| US-11 | Teacher | Write an overall comment on the result | I can give the student holistic feedback beyond individual question marks |
| US-12 | Teacher | See a "Needs Grading" button/badge when a session is in GRADING status | I am reminded to finalize the grade before the student can see correct answers |
| US-13 | Teacher | Navigate questions with arrow keys in GradeByQuestion | I can grade efficiently across many students without leaving the keyboard |
| US-14 | Teacher | See all students' answers to one question in GradeByQuestion | I can apply consistent grading standards across the class |
| US-15 | Teacher | See previous teacher comments when re-opening a graded answer | I know what feedback has already been given |
| US-16 | Teacher | Navigate back to the results listing from the full detail page | I can return to the overview without using the browser back button |

---

## Functional Requirements

### FR-01: Full Detail Page — Server Component

- `StudentResultDetailPage` (`src/app/teacher/student-results/[resultId]/page.tsx`) is a React Server Component.
- Auth check: `auth()` → redirect to `/login` if no session; redirect to `/topics` if `role !== "TEACHER"`.
- Fetches `PracticeResult` by `id = resultId` via Prisma (does **not** scope to `userId` — teachers can view any result for their students).
- Includes: `user` (name, email), `practiceTest` (title, topic with language, questions ordered by `questionNumber ASC`), `studentAnswers` (with joined `question`, ordered by `question.questionNumber ASC`), `comments` (with `user.name`, ordered `createdAt ASC`).
- If result not found: `notFound()`.
- Derives student initials from `user.name` (first letter of each word, max 2, uppercase).
- Renders: back link, header (avatar + name + email + language chip), 4-stat grid, answer details table, `ResultCommentSection`.

### FR-02: Full Detail Page — Answer Details Table

- Static (no interactivity) table with columns: `#`, Question, Student Answer, Correct Answer, Result.
- Each row shows `sa.question.questionNumber`, `sa.question.content`, `sa.selectedAnswer`, `sa.question.correctAnswer`, and a `check_circle` or `cancel` Material Symbol based on `sa.isCorrect`.
- `selectedAnswer` colored green if `isCorrect`, red if not.
- `correctAnswer` always shown (teachers have no grading gate on the server-rendered page).
- This table does not have grading controls — it is a read-only summary. For grading, the teacher uses `ResultDetailModal`.

### FR-03: ResultDetailModal — Data Fetch

- `ResultDetailModal` is a `"use client"` component.
- On mount, calls `GET /api/teacher/student-results/{resultId}`.
- Response includes: student info, score, answers (with `questionType`, `teacherOverride`, `teacherScore`, `teacherComment`, `teacherGradedAt`, `contentMediaUrl`, `contentMediaType`), comments, `sessionId`, `sessionStatus`, `tabSwitchCount`.
- Re-fetches after every successful grade save or comment post to sync state.

### FR-04: ResultDetailModal — Expandable Grading Rows

- The answer table in the modal has an additional column: an expand chevron.
- Clicking a row (anywhere except interactive elements) toggles `expandedAnswer === a.id`.
- When expanded, a grading panel slides in below the row with:
  - "Correct" / "Incorrect" toggle buttons (`teacherOverride`).
  - For `questionType === "CUE_WRITING"`: a range slider (0–100, step 10) for `teacherScore`. Displayed value: `Math.round(score * 100)%`.
  - A text input for `teacherComment`.
  - A "Save" button that calls `PATCH /api/exam-session/{sessionId}/grade`.
- Previous `teacherComment` and `teacherScore` are pre-populated in the grading panel from the fetched data.
- Save button is disabled until at least one of `override`, `score`, or `comment` has been changed.
- During save, the button shows a spinner and is `disabled`.

### FR-05: ResultDetailModal — Needs Review Filter

- A checkbox labeled "Needs review" above the answer table.
- When checked (`showManualOnly === true`), the answer list filters to:
  - Rows where `questionType === "CUE_WRITING"`, OR
  - Rows where `teacherOverride === null` (not yet teacher-reviewed).
- This filter is a client-side filter over the already-fetched `data.answers` — no new API call.
- CUE_WRITING rows awaiting review get a left amber border (`border-l-3 border-l-[#f59e0b]`).

### FR-06: ResultDetailModal — Mark as Graded

- Rendered only when `data.sessionStatus === "GRADING"`.
- A "Mark as Graded" button in the answer table header calls `PATCH /api/exam-session/{sessionId}/grade` with `{ markAsGraded: true, grades: [] }`.
- On success: `toast.success("Marked as graded")` and `fetchDetail()` to refresh the modal data.
- After this call, the session transitions `GRADING → GRADED`, the button disappears, and the student can now see correct answers on their side.

### FR-07: ResultDetailModal — Teacher Feedback Comments

- Below the answer table, a feedback section renders existing `data.comments` and a textarea for new comments.
- Posting a comment calls `POST /api/teacher/student-results/{resultId}/comments` with `{ content: string }`.
- On success: `toast.success(t("commentPosted"))`, clears the textarea, calls `fetchDetail()`.
- Displays existing comments with commenter name, formatted date, and content.

### FR-08: ResultCommentSection — Server Page Comment System

- Used on the full server-rendered detail page (`/teacher/student-results/[resultId]`).
- Receives `resultId` and pre-fetched `comments[]` as props.
- Displays existing comments (same UI as the modal).
- Posts new comments via `POST /api/teacher/student-results/{resultId}/comments`.
- On success: `router.refresh()` to reload the server component and show the new comment.

### FR-09: GradeByQuestion — Cross-Result Question View

- `GradeByQuestion` is a `"use client"` modal component, opened from the Practice Test detail page.
- Props: `testId: string`, `onClose: () => void`.
- On mount (and on `questionNumber` change), fetches `GET /api/teacher/practice-tests/{testId}/answers-by-question?questionNumber={n}`.
- Response: `{ question, totalQuestions, testTitle, submissions[] }`.
- Each `submission` contains: `studentAnswerId`, `studentName`, `studentId`, `selectedAnswer`, `isCorrect`, `teacherOverride`, `teacherScore`, `teacherComment`, `sessionId`, `sessionStatus`, `attemptNumber`.
- Renders the question content + type + correct answer in a header band, then lists all student submissions.

### FR-10: GradeByQuestion — Inline Submission Grading

- Each submission card shows: student avatar initials, student name, answer text, effective correctness icon.
- Grading controls per card:
  - "Correct" / "Incorrect" toggle buttons.
  - For `CUE_WRITING`: range slider for `teacherScore`.
  - Comment text input (pre-populated with existing `teacherComment`).
  - "Save" button calling `PATCH /api/exam-session/{sessionId}/grade`.
- CUE_WRITING cards with `teacherOverride === null` get amber left border highlighting.
- On successful save: `toast.success("Grade saved")`, `fetchData()` re-fetch.

### FR-11: GradeByQuestion — Navigation

- Question navigation: "Previous" / "Next" buttons + keyboard `ArrowLeft` / `ArrowRight`.
- `questionNumber` is 1-indexed; Previous is disabled at Q1, Next at Q{totalQuestions}.
- Question number indicator in the modal header: `Q{n} / {totalQuestions}`.
- Navigation clears all pending local grading state (`setGrades({})`).

### FR-12: PATCH /api/exam-session/[sessionId]/grade

- Accepts: `{ grades: GradeInput[], markAsGraded?: boolean }`.
- `GradeInput`: `{ studentAnswerId, teacherOverride?, teacherScore?, teacherComment? }`.
- For each `GradeInput`, updates `StudentAnswer`: sets `teacherOverride`, `teacherScore`, `teacherComment`, `teacherGradedAt = now()`.
- If `markAsGraded === true`: updates `ExamSession.status = "GRADED"` and recalculates the `PracticeResult.score` based on teacher overrides.
- Score recalculation: `correctCount = studentAnswers.filter(sa => (sa.teacherOverride ?? sa.isCorrect)).length`, `score = correctCount / totalQuestions * 100`.
- Auth: teacher must own a class containing the session's user.

---

## Non-Functional Requirements

### NFR-01: Performance
- `ResultDetailModal` fetches client-side on open — latency depends on the API. The API query includes student answers, questions, comments, and exam session: target ≤ 400ms (P95).
- `GradeByQuestion` fetches on every question navigation. Target: ≤ 200ms per question (small, focused query).
- Grade saves (`PATCH`) are per-answer, not bulk — target ≤ 150ms round-trip.
- The full detail server page (`/[resultId]`) makes one Prisma query with ~7 joins: target ≤ 200ms TTFB.

### NFR-02: Security
- The `PATCH /api/exam-session/{sessionId}/grade` endpoint verifies the teacher-student class relationship before writing any grading data.
- The `GET /api/teacher/student-results/{resultId}` API scopes to the teacher's students — a teacher cannot view or grade results for students outside their classes.
- `teacherOverride`, `teacherScore`, and `teacherComment` fields are only writable via the grading API, not directly by students.

### NFR-03: Data Integrity
- Grade saves are per-answer (individual `PATCH` calls). This prevents a partial failure from corrupting an entire result.
- `markAsGraded: true` recalculates the score from the current state of all `studentAnswers` for that result — teachers must save individual grades before marking as graded to ensure the score is correct.
- `onDelete: Cascade` on `studentAnswers.practiceResultId` ensures orphaned answer data is cleaned up when a result is deleted.

### NFR-04: Accessibility
- Status transitions (Correct/Incorrect override buttons) use background color + text to indicate state — not color alone.
- The "Mark as Graded" button has a visible label, not just an icon.
- The `GradeByQuestion` modal traps focus when open.
- Comment textareas and inputs have visible labels (or `aria-label`).

### NFR-05: Internationalisation
- Column headers, labels, and button text in `ResultDetailModal` use `t("...")` from the `"teacher"` namespace where keys exist.
- Several grading-specific labels are currently hardcoded in English and should be migrated (see TDD i18n section).

---

## UI/UX Requirements

### Full Detail Page Layout
- Outer: `space-y-8` within the teacher shell content area.
- Back link: `inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4]`.
- Header row: `flex flex-col sm:flex-row sm:items-start justify-between gap-4`.
- Avatar circle: `w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-[#e3dfff] text-[#2a14b4]`.
- Stat grid: `grid-cols-2 md:grid-cols-4 gap-4`.
- Stat card: `bg-white rounded-2xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-5`.
- Answer table: `bg-white rounded-2xl shadow-[...] overflow-hidden overflow-x-auto`.

### ResultDetailModal Layout
- `ModalOverlay` with `panelClass="max-w-4xl"`.
- Inner: `bg-[#f8f9ff] max-h-[90vh] overflow-y-auto rounded-2xl`.
- Stats grid: `grid-cols-2 md:grid-cols-4 gap-3` with shadow `0px_10px_20px_rgba(18,28,42,0.04)`.
- Tab switch warning: `bg-[#fef3c7]/50 rounded-xl p-3 flex items-center gap-2`.
- Answer table header: `px-5 py-3.5 border-b border-[#c7c4d7]/15 flex items-center justify-between`.
- Expanded grading panel: `px-5 pb-4 pt-2 bg-[#f8f9ff]/50`.

### Score Color Coding (both views)
- `score >= 80` → `text-[#1b6b51]`
- `score >= 50 && score < 80` → `text-[#2a14b4]`
- `score < 50` → `text-[#7b0020]`

### Answer Row States (in modal table)
- Default: `hover:bg-[#a6f2d1]/10` (correct) or `hover:bg-[#ffdada]/10` (incorrect).
- CUE_WRITING awaiting review: amber left border `border-l-3 border-l-[#f59e0b]`.
- Selected/expanded: `bg-[#f8f9ff]/50` for grading panel background.

### Override Toggle Buttons
- Correct (active): `bg-[#1b6b51] text-white`.
- Correct (inactive): `bg-[#a6f2d1]/30 text-[#1b6b51] hover:bg-[#a6f2d1]/50`.
- Incorrect (active): `bg-[#7b0020] text-white`.
- Incorrect (inactive): `bg-[#ffdada]/30 text-[#7b0020] hover:bg-[#ffdada]/50`.
- All: `px-3 py-1.5 rounded-full text-xs font-body font-bold`.

### GradeByQuestion Layout
- Fixed fullscreen modal: `fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4`.
- Inner: `bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col`.
- Header: sticky at top; question info in a `bg-[#f8f9ff]` band below the header.
- Submission cards: `rounded-2xl p-4 bg-[#f8f9ff]` (default) or `bg-[#fef3c7]/20` (CUE_WRITING unreviewed).
- Footer navigation: `border-t border-[#c7c4d7]/15 flex items-center justify-between`.
- Arrow nav buttons: `flex items-center gap-1 px-4 py-2 rounded-full text-sm font-body`.

---

## Edge Cases

| Case | Expected Behavior |
|------|------------------|
| `resultId` does not exist | Server page: `notFound()`. Modal: API returns 404, modal shows error state. |
| `sessionId` is null (practice-mode result) | Modal: grading controls are hidden; "Cannot save: no exam session" toast if save attempted. PATCH API guard returns 404. |
| Session is already `GRADED` | "Mark as Graded" button is not rendered. Grading controls still visible (teacher can add/edit override). |
| Teacher overrides a correct answer as Incorrect | `effectiveCorrect = false`; row turns red; icon changes to `cancel`. Score recalculated on `markAsGraded`. |
| Teacher overrides an incorrect CUE_WRITING with a partial score | `teacherScore` stored as 0–1 float; grade contributes proportional credit on recalculation. |
| Student has no `selectedAnswer` (empty string) | Answer cell shows `(no answer)` in italic. |
| `tabSwitchCount === 0` | Tab switch warning is not rendered. |
| GradeByQuestion: question has zero submissions | Submissions list shows "No submissions for this question". |
| GradeByQuestion: teacher navigates away (ArrowRight) mid-grade | Local `grades` state is cleared by `setGrades({})` in `fetchData`; unsaved changes are lost. No confirmation dialog (acceptable — saves are per-answer). |
| PATCH request fails (network) | `toast.error("Failed to save")`; grading state preserved for retry. |
| PATCH `markAsGraded` fails | `toast.error("Failed to mark as graded")`; session remains `GRADING`. |
| Comment POST fails | `toast.error(t("commentFailed"))`; textarea content preserved for retry. |
| `ResultDetailModal` is open when the underlying result is deleted from the listing via bulk delete | Modal remains open with stale data; next fetch (if triggered) returns 404 and shows error state. |
| Very long `selectedAnswer` text (CUE_WRITING) | Answer cell wraps; no truncation in the expanded grading panel. In the collapsed row, truncated to 30 chars with `...`. |
| Score is exactly 0 after all overrides marked Incorrect | Score hero shows 0%, colored red. |
| `teacherScore` slider value is 0 | Student gets 0% credit for that answer; `teacherOverride` determines pass/fail display. |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Grade save latency (P95) | < 300ms | API timing in Vercel Analytics |
| "Mark as Graded" completion rate | > 90% of GRADING sessions are eventually marked GRADED | DB query: `ExamSession.status = "GRADING" AND completedAt < now() - 7d` |
| Per-answer override rate for CUE_WRITING | > 70% of CUE_WRITING answers receive a `teacherOverride` | DB: `StudentAnswer WHERE questionType = CUE_WRITING AND teacherOverride IS NOT NULL` |
| Teacher comment rate | > 40% of graded results have at least one comment | DB: `Comment.count WHERE practiceResultId IN graded results` |
| GradeByQuestion usage rate | > 20% of teachers use it at least once per week | Feature flag event tracking |
| Zero data loss on grade save failure | 100% | Error monitoring: alert if PATCH succeeds but DB write fails |
| Full detail page TTFB | < 400ms (P95) | Vercel Analytics |
| Zero IDOR incidents | 100% | Security audit: verify teacher-scoped DB queries in API |
