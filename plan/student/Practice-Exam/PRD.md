# PRD: Student Practice & Exam Page

**Page:** `src/app/(student)/topics/[topicId]/practice/page.tsx`
**Mode selector:** query param `?testId=` (optional)
**Status:** Production

---

## 1. Overview

The Practice & Exam page is the core learning interaction surface of the VC Class platform. It serves two distinct and mutually exclusive modes determined by the `PracticeTest.mode` field:

- **Practice Mode** (`mode = "practice"`) — formative, self-paced, immediate feedback after each question. Designed to reinforce vocabulary and language skills through guided repetition.
- **Test/Exam Mode** (`mode != "practice"`) — summative, timed, proctored-by-design. Designed to assess student achievement with server-side grading, atomic submission, and integrity controls.

A single URL (`/topics/[topicId]/practice?testId=...`) serves both modes. The server component decides which rendering path to take and enforces data security before any props reach the client.

---

## 2. User Stories

### Practice Mode

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| P-01 | Student | answer one question at a time | I can focus without overwhelm |
| P-02 | Student | see immediate visual and audio feedback | I know instantly if I was right or wrong |
| P-03 | Student | feel haptic feedback on mobile | the response feels physical and engaging |
| P-04 | Student | see a countdown timer per question | I stay aware of pacing |
| P-05 | Student | track my streak of correct answers | I feel motivated to stay on track |
| P-06 | Student | see smooth animations between questions | the experience feels fluid, not jarring |
| P-07 | Student | see my score and breakdown at the end | I know how well I performed |
| P-08 | Student | see confetti for a high score | I feel a sense of accomplishment |
| P-09 | Student | see which questions I got wrong | I can focus on what needs review |
| P-10 | Student | have my session saved as a draft | I can resume if I accidentally leave |

### Test/Exam Mode

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| E-01 | Student | see exam instructions before starting | I know the rules before committing |
| E-02 | Student | resume an in-progress exam | a page refresh does not cost me my work |
| E-03 | Student | see my saved progress on the resume screen | I know how much I have done |
| E-04 | Student | navigate between question sections | I can work on whichever part I choose |
| E-05 | Student | flag questions for review | I can revisit uncertain answers |
| E-06 | Student | see a question palette at any time | I can jump to any question quickly |
| E-07 | Student | have my answers auto-saved every 3 seconds | I will not lose work due to network issues |
| E-08 | Student | see the timer change color when time is low | I am visually warned without having to watch constantly |
| E-09 | Student | navigate with keyboard arrow keys | I can move efficiently without the mouse |
| E-10 | Student | review all my answers before submitting | I feel confident before making a final submission |
| E-11 | Student | see a per-part summary on the review screen | I know exactly which sections are complete |
| E-12 | Student | be auto-submitted when time runs out | the exam ends fairly even if I forget |
| E-13 | Student | see my score immediately after submission (if auto-graded) | I get closure right away |
| E-14 | Student | see an awaiting-review state for open questions | I understand why a score is pending |
| E-15 | Student | retake the exam if attempts remain | I can try to improve my score |
| E-16 | Teacher | receive a notification when a student submits | I can review results promptly |

---

## 3. Functional Requirements

### 3.1 Common to Both Modes

**FR-C-01: Access Control**
The page must verify that the student is enrolled in a class that has the given `topicId` assigned before rendering any content. If no enrollment is found, return `notFound()`.

**FR-C-02: Test Resolution**
- If `testId` query param is present, fetch that specific `PracticeTest` for the given `topicId`.
- If `testId` is absent, fetch the first `ACTIVE` `PracticeTest` where `availableFrom <= now` and `availableTo >= now` (or either is null).
- If no test or no questions are found, return `notFound()`.

**FR-C-03: Mode Detection**
`mode !== "practice"` is treated as exam mode. All other values (e.g., `"test"`, `"exam"`) activate the exam path.

---

### 3.2 Practice Mode

**FR-P-01: Question Presentation**
Questions are presented one at a time in sequence, rendered by `PracticeSession`. The student answers, sees feedback, then moves to the next question. There is no back-navigation during practice.

**FR-P-02: Immediate Feedback — AnswerFeedback**
After the student submits an answer, `AnswerFeedback` is shown immediately:
- Correct: positive visual cue (green), success sound via Web Audio API, haptic pulse via Vibration API
- Incorrect: negative visual cue (red), failure sound via Web Audio API, haptic pulse via Vibration API
- The correct answer is revealed if the student was wrong
- Explanation text and media (if present) are shown

**FR-P-03: Audio Feedback (Web Audio API)**
Sound cues are synthesised in-browser using `AudioContext` — no audio files are required. The hook `useAudioManager` manages the `AudioContext` lifecycle to avoid browser autoplay restrictions.

**FR-P-04: Haptic Feedback (Vibration API)**
On supported devices, `navigator.vibrate()` is called with a short pattern on correct answers and a longer pattern on incorrect. Silently no-ops on unsupported devices.

**FR-P-05: Per-Question Timer — CircularTimer**
Each question has a `timer` field (seconds). A `CircularTimer` SVG component counts down visually. When it reaches zero, the question is auto-submitted as unanswered. The timer resets on each new question.

**FR-P-06: Streak Counter**
A `StreakCounter` component tracks consecutive correct answers. Breaking the streak resets it to zero. The max streak is recorded for the results screen.

**FR-P-07: Question Transitions — QuestionTransition**
Animated transitions (slide-in, fade) are applied between questions using `motion` (Framer Motion). Animation direction may reflect forward/backward movement.

**FR-P-08: Answer Shuffling**
When `shuffleAnswers = true`, the `PracticeSession` shuffles answer options per question using a deterministic seed so the order is consistent within a session but randomised across sessions.

**FR-P-09: Media Preloading — useMediaPreloader**
The next question's media assets (audio, images) are preloaded while the student is on the current question to avoid loading delays.

**FR-P-10: Session Draft — useSessionDraft**
Progress is saved to `localStorage` as a draft so students can resume if the page is refreshed mid-session. On mount, the draft is restored if present.

**FR-P-11: Results Screen — ResultsScreen**
On completing all questions:
- Score percentage (correct / total × 100)
- Confetti animation if score >= 80%
- Difficulty breakdown (Easy / Medium / Hard) showing correct vs total per level
- List of incorrectly answered questions with the correct answer
- Speed bonus count (questions answered within a threshold)
- POST to `/api/practice/[practiceId]/result` to persist the result
- Navigation back to topic

---

### 3.3 Test/Exam Mode

**FR-E-01: correctAnswer Stripping (Security)**
The server component `mapQuestion()` MUST NOT include `correctAnswer`, `explanation`, `explanationMediaUrl`, or `explanationMediaType` in the props passed to client components when `isTestMode = true`. This is enforced unconditionally at the server boundary.

**FR-E-02: ExamEntryGate — 6 Scenarios**
The `ExamEntryGate` component renders one of six views before the exam shell is shown:

| Scenario | Condition | View |
|----------|-----------|------|
| 1. INACTIVE | `testStatus === "INACTIVE"` | "Exam not available" lock screen |
| 2. Instructions | `testStatus === "ACTIVE"` and no session | Exam info cards + rules + Start button |
| 3. DOING Resume | `sessionStatus === "DOING"` | Time remaining, answered count, last-saved timestamp + Continue button |
| 4. GRADING | `sessionStatus === "GRADING"` | Awaiting review state, submission timestamp |
| 5. GRADED | `sessionStatus === "GRADED"` | Score ring, motivational message, confetti if excellent, View Results + Retake buttons |
| 6. Max Attempts | `sessionStatus === "GRADED"` and `canRetake === false` | Score ring, no retake button |

**FR-E-03: ExamShell — Orchestrator**
`ExamShell` is the top-level client orchestrator for the active exam. It:
- Calls `useExamPhases` to build the Phase list
- Calls `useExamSession` to manage state
- Registers keyboard listeners for arrow-key navigation
- Renders `ExamHeader`, `ExamPhase` or `ExamReview`, and `ExamFooter`
- Renders a loading spinner while `status === "loading"`
- Renders an error + retry while `status === "error"`
- Renders a post-submit result card when `submitResult` is set

**FR-E-04: useExamPhases — Phase Building**
Builds a flat, ordered list of `Phase[]` from the section tree:
- Root → PART → GROUP → EXERCISE depth-first traversal
- Each EXERCISE-level section with at least one question = one Phase
- Unsectioned questions (no `sectionId`) collapse into a single "General" phase
- If no sections exist, all questions are a single phase
- A `review` phase is always appended as the final phase
- Breadcrumb for each phase walks up the parent chain
- `shuffleQuestions = true` applies a seeded Fisher-Yates shuffle per section

**FR-E-05: useExamSession — State Machine**
On mount, POSTs to `/api/exam-session` to create or resume a session. Manages:
- Navigation state (`currentPhaseIndex`, `goToPhase`, `nextPhase`, `prevPhase`)
- Answer state (`answers: Record<string, string>`, `setAnswer`)
- Flag state (`flaggedQuestions: Set<string>`, `toggleFlag`)
- Timer countdown (`timeRemaining`, `isTimeWarning` at ≤300s, `isTimeCritical` at ≤60s)
- Auto-save every 3 seconds if `isDirty` via a stable ref-based interval
- Tab switch detection via `visibilitychange` event, counter incremented to `tabSwitchCount`
- `beforeunload` handler saves to `localStorage` synchronously
- Auto-submit when `timeRemaining` reaches 0
- Submit flow: final save → POST to submit endpoint → set `submitResult`

**FR-E-06: Auto-Save Mechanism**
- Auto-save interval fires every 3 seconds when `status === "DOING"`
- Only PATCHes the server if `isDirtyRef.current === true` (ref avoids stale closures without re-registering the interval)
- Also saves to `localStorage` on every save call as a secondary backup
- `saveStatus` reflects `"saved"` / `"saving"` / `"error"` / `"idle"` for the UI indicator

**FR-E-07: Resume from localStorage vs Server**
On session init, if a `localStorage` draft exists with a `lastSavedAt` newer than the server's `lastSavedAt`, the local version is used and `isDirty = true` is set to sync it back to the server on next save.

**FR-E-08: ExamHeader**
Sticky header containing:
- Grid icon toggling the Question Palette slide-out panel
- Breadcrumb (full path on desktop, last crumb on mobile)
- Auto-save status text (`saved N seconds ago`, `saving...`, `offline`)
- Timer pill: neutral (purple) → warning (amber, pulsing) at ≤5 min → critical (red, pulsing) at ≤1 min
- Progress bar (answered / total) across the top of the header

**FR-E-09: Question Palette**
A slide-out panel showing a grid of all question numbers colour-coded:
- Purple fill = answered
- Amber fill with ring = flagged
- Grey = unanswered
- Clicking a number navigates to that question's phase

**FR-E-10: ExamPhase**
Renders a single phase:
- Phase title and optional description
- Section-level media (audio player or image) pinned above the questions
- List of `QuestionRenderer` components for each question in the phase
- Scrolls to top on phase change

**FR-E-11: QuestionRenderer — 10 Question Types**
Dispatches to the correct input widget based on `questionType`:

| Type | Widget |
|------|--------|
| MULTIPLE_CHOICE | Lettered option buttons (A/B/C/D) |
| TRUE_FALSE | Lettered option buttons |
| GAP_FILL | Single text `<input>` |
| REORDER_WORDS | `ReorderWords` drag-and-drop component |
| CUE_WRITING | `CueWriting` multi-field component |
| PRONUNCIATION | `PronunciationQ` with underlined parts |
| STRESS | `PronunciationQ` with stress positions |
| CLOZE_PASSAGE | Single text `<input>` (inline passage rendered separately) |
| MATCHING | `MatchingPairs` column-pairing component |
| WORD_BANK | `WordBank` fill-blank-from-bank component |

Answer shuffling (`shuffleAnswers`) applies a deterministic seed (`shuffleSeed + questionId`) so shuffled order is consistent across re-renders but varies by question.

**FR-E-12: FlagButton**
A bookmark toggle rendered in the top-right corner of each question card. Calls `onToggleFlag` which updates `flaggedQuestions` in session state.

**FR-E-13: ExamFooter**
Sticky glassmorphism footer:
- Previous button (disabled on first phase)
- Centre: question range label (e.g., "Q 1–5 of 40")
- Next button (becomes "Review" on last content phase, renders checklist icon)
- On review phase, footer is hidden (footer conditionally rendered only when `status === "DOING"`)

**FR-E-14: ExamReview**
Summary screen shown when the student reaches the review phase:
- Per-part summary cards: answered/total, progress bar, flagged count, unanswered count
- Warning banner if there are unanswered or flagged questions
- "Review Part X" deep-link back to the first phase of each part
- Confirmation checkbox (must be checked to unlock submit)
- Submit button with spinner state during submission

**FR-E-15: Submission — Atomic Claim**
The submit endpoint uses `updateMany WHERE status = "DOING"` as an atomic compare-and-swap. If `count === 0`, the session was already claimed by a concurrent request and a 409 is returned. This prevents double-submission.

**FR-E-16: Server-Side Grading**
On submit, the server reads all `Question` records (including `correctAnswer`) from the database — the client never sends correct answers. `isQuestionCorrect()` is called per question. `CUE_WRITING` always returns `false` (requires manual grading); the session status becomes `GRADING` instead of `GRADED` when any such question is present.

**FR-E-17: Retake Flow**
When `canRetake = true` on the GRADED screen, clicking "Retake" calls `PUT /api/exam-session` with `{ practiceTestId, attemptNumber: nextAttemptNumber }` to create a new `ExamSession`. On success, `started = true` which renders the `ExamShell` child and `useExamSession` initialises with the new session.

**FR-E-18: Integrity — Tab Switch Detection**
`document.visibilitychange` events are counted and stored as `tabSwitchCount` on the session. This value is sent on every save and is available to teachers via the `ExamSession` record for review.

**FR-E-19: Integrity — Time Anomaly Detection**
On each PATCH (save), the server computes `serverElapsed = now - lastSavedAt`. If `clientTimeDelta < 0` (client reported more time remaining than before) and `serverElapsed > 2`, the server overrides with its own calculated `timeRemaining = max(0, session.timeRemaining - serverElapsed)`.

**FR-E-20: Copy/Paste Prevention**
`ExamShell` intercepts `onCopy`, `onCut`, `onPaste`, and `onContextMenu` events at the wrapper div. The events are only blocked when the target element is NOT an `INPUT` or `TEXTAREA` (to allow typing in text fields). `userSelect: none` is applied to the wrapper.

---

## 4. Non-Functional Requirements

**NFR-01: Performance**
- Server component renders synchronously with two Prisma queries; no client waterfalls on initial load
- `useExamPhases` is memoised via `useMemo`; rebuilds only when sections, questions, or shuffleQuestions change
- Answer shuffle uses a lightweight integer-hash rather than a crypto function
- Media for next question is preloaded in practice mode while current question is displayed

**NFR-02: Reliability**
- Auto-save every 3 seconds prevents data loss in exam mode
- `localStorage` acts as a tertiary backup; loaded on resume if newer than server
- Submit endpoint gracefully rolls back `ExamSession.status` to `DOING` if `PracticeResult` creation fails
- Submit is idempotent: if `status !== "DOING"` and a result exists, returns the existing result with 200

**NFR-03: Security**
- `correctAnswer` and explanation fields are stripped server-side before any client props are serialised
- `ExamSession` ownership is verified on every PATCH and POST (userId check)
- Enrollment check runs on every page load (not cached)
- Atomic claim prevents concurrent submission race conditions

**NFR-04: Accessibility**
- All interactive controls meet 44×44px minimum touch target size
- Keyboard navigation (arrow keys) for exam section traversal
- `aria-label` on icon-only buttons (FlagButton, palette toggle)
- Colour changes for timer state are always accompanied by a secondary cue (pulse animation, icon)

**NFR-05: Offline Tolerance**
- Auto-save to `localStorage` on `beforeunload` ensures answers are not lost on network drop
- `saveStatus === "error"` surfaces a cloud-off icon in the header without blocking the student

**NFR-06: Internationalisation**
- All user-facing strings use `useTranslations("exam")` or `useTranslations("student")`
- No hardcoded English strings in JSX (date formatting uses `toLocaleDateString`)

---

## 5. UI/UX Requirements

**UX-01: Visual Design System**
The page uses CSS custom properties (`--exam-primary`, `--exam-surface`, `--exam-on-surface`, etc.) for theming, allowing teacher-configurable colour overrides without code changes. The default palette is a lavender/indigo scheme.

**UX-02: Motion**
- `motion` (Framer Motion) is used for confetti particles and question transition animations
- CSS `animate-pulse` is used for timer warning/critical states
- CSS `animate-spin` is used for loading and submitting spinners
- Confetti: 40 particles, randomised position, colour, size, delay, and fall duration

**UX-03: Responsive Design**
- Header breadcrumb: full path on `md+`, last crumb only on mobile
- Footer navigation labels: hidden on `<sm`, visible on `sm+`
- Question palette grid: 8 columns on mobile, 10 on `sm+`
- Content area: `px-4` on mobile, `px-8` on `md+`

**UX-04: Timer Visual States**
- > 5 minutes: purple pill (neutral)
- ≤ 5 minutes (300s): amber pill with pulse
- ≤ 1 minute (60s): red pill with pulse

**UX-05: Score Moods**
Both the ExamEntryGate (GRADED scenario) and ExamShell (submitResult) use a three-tier mood system:
- ≥ 80%: trophy icon, green palette, confetti
- 50–79%: trending-up icon, purple palette
- < 50%: fitness-center icon, amber palette

**UX-06: Empty States**
All loading and error states provide a clear icon, heading, description, and a recovery action (Retry button, Back to Topic button).

---

## 6. Edge Cases

| # | Scenario | Expected Behaviour |
|---|----------|--------------------|
| EC-01 | Student opens exam in two tabs | Second tab resumes the same DOING session; both auto-saves merge (server wins on timeRemaining) |
| EC-02 | Network drops during auto-save | `saveStatus = "error"`, header shows cloud-off icon; next auto-save retries automatically |
| EC-03 | Student submits, response is lost (network timeout) | `submittedRef` is reset to `false`; the submit button becomes active again |
| EC-04 | Timer reaches 0 with answers unsaved | Auto-save is attempted before submit call in `handleSubmit` (best-effort) |
| EC-05 | `advancedData` JSON is malformed | Each component wraps parsing in try/catch; falls back to basic MCQ or empty state |
| EC-06 | Test has no sections | All questions are placed in a single "Questions" phase |
| EC-07 | Test has sections but a question has no `sectionId` | Questions without `sectionId` are grouped in a "General" phase after sectioned phases |
| EC-08 | Student visits page with expired `testId` | Server returns the test (no expiry check per testId); availability check only applies to the first-active-test fallback |
| EC-09 | `maxAttempts = 0` | Treated as unlimited; `canRetake` is always true after grading |
| EC-10 | `CUE_WRITING` questions present | Session status becomes `GRADING` after submit; ExamShell shows "awaiting review" state |
| EC-11 | Student reloads during submit | `submittedRef = true` prevents double-submit from the same session; server atomic claim handles concurrent requests |
| EC-12 | `localStorage` parse fails on resume | Silently falls back to server data |

---

## 7. Security Requirements

**SR-01:** `correctAnswer`, `explanation`, `explanationMediaUrl`, and `explanationMediaType` MUST NOT appear in any client-rendered component props or API responses in exam mode.

**SR-02:** Every API endpoint for exam sessions MUST verify `session.user.id === examSession.userId` before performing any read or write.

**SR-03:** Enrollment access MUST be verified on page load; it is not sufficient to rely on a previously established session.

**SR-04:** The submit endpoint MUST use an atomic `updateMany WHERE status = "DOING"` claim pattern to prevent double-grading.

**SR-05:** Server-side grading reads `correctAnswer` from the database; the client answer blob is never trusted for scoring.

**SR-06:** Time manipulation is detected server-side (see FR-E-19); adjusted `timeRemaining` is returned and stored.

**SR-07:** Copy/paste and context menu are blocked for non-input elements to prevent easy answer extraction from the DOM.

---

## 8. Success Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Submission success rate | POST /submit returns 2xx / total submit attempts | > 99% |
| Auto-save reliability | PATCH /save succeeds / total auto-save attempts | > 98% |
| Resume accuracy | Sessions resumed with correct state / total resumes | > 99.5% |
| Double-submission rate | 409 responses / total submit requests | < 0.1% |
| Time-to-first-question | Server component render + hydration + session init | < 3s on 4G |
| Practice completion rate | Students who reach ResultsScreen / students who start | > 75% |
| Exam completion rate | Sessions with status GRADED or GRADING / sessions created | > 90% |
| Score saving accuracy | PracticeResults with correct `correctCount` / total graded | 100% |
