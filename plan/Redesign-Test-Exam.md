# Redesign: Test Exam Experience — Complete Implementation Plan

## Vision

Transform the test exam flow from a single-page scroll into a **phased, server-persisted, full-lifecycle experience** covering: teacher creates/publishes → student starts → student does (with auto-save) → student submits → teacher grades/comments → student views results → student retakes for mastery.

Inspired by the "Intellectual Sanctuary" design system (Aura Lexicon).
Reference designs: `design/test_exam/ielts_*` screens (listening, reading, writing, review/submission).

---

## Current State → Target

| Aspect | Today | Target |
|--------|-------|--------|
| Layout | All questions on one scrollable page | Phased navigation (one exercise at a time) |
| Status | `draft` / `published` only | Test-level: `DRAFT` / `ACTIVE` / `INACTIVE` — Session-level: `DOING` / `GRADING` / `GRADED` |
| Persistence | localStorage only, lost if cleared | Server-side auto-save (3s interval) + localStorage fallback |
| Review | Simple modal with answered count | Full review phase with per-section summaries, flagged questions |
| Header/Footer | Sticky header only | Sticky header (breadcrumb + timer + progress bar) + sticky footer (Previous / Next / Flag) |
| Teacher grading | Auto-graded on submit | Hybrid: auto-grade MCQ + teacher manual review for open-ended, per-question feedback |
| Student results | Ephemeral (shown once after submit, never again) | Persistent results page with teacher comments, explanations, analytics |
| Security | Client-side grading, `correctAnswer` exposed to browser | Server-side grading, `correctAnswer` never sent to client |
| Retakes | Not supported | Multi-attempt with `attemptNumber`, teacher-configurable `maxAttempts` |
| Notifications | None | In-app notifications for submit/graded/activated events |
| Exam integrity | None | Tab-switch logging, question shuffling, time anomaly detection |

---

## Data Structure: Phase Hierarchy

```
PracticeTest
├── Part 1 (TestSection level=PART)          ← Phase Group
│   ├── Group A (TestSection level=GROUP)     ← Sub-phase context
│   │   ├── Exercise 1 (level=EXERCISE)       ← Navigation Phase (student sees this)
│   │   │   ├── Question 1
│   │   │   ├── Question 2
│   │   │   └── Question 3
│   │   └── Exercise 2
│   │       └── Question 4-6
│   └── Group B
│       └── Exercise 3
│           └── Question 7-10
├── Part 2
│   └── ...
└── [Final Review Phase]                      ← Auto-generated, not a section
```

**Phase = Exercise-level section** (the leaf-level section containing questions).
If a test has no sections, the entire test is treated as a single phase.
The Final Review is always appended as the last phase.

---

## Minimum Viable Slice (MVS)

To reduce integration risk, the first testable end-to-end slice is **Phase 0 + 1 + 2 + 3** (Schema → APIs → Hooks → Exam UI). This delivers a working phased exam with server persistence and can be tested with a hardcoded entry point before the EntryGate and teacher grading are built.

**MVS delivers:** Phased exam navigation, server-side auto-save, question flagging, review phase, submit with server-side grading.

**After MVS:** Layer on EntryGate (Phase 4), teacher grading (Phase 5), student results (Phase 6), notifications (Phase 7), integrity (Phase 8), styling (Phase 9), polish (Phase 10).

---

## PHASE 0: Schema & Data Layer

All subsequent work depends on these schema changes.

**File:** `prisma/schema.prisma`

### Task 0.1 — `TestStatus` enum

Replace `status String @default("draft")` on `PracticeTest` (line ~190):

```prisma
enum TestStatus {
  DRAFT      // Teacher building (invisible to students)
  ACTIVE     // Students can start/take
  INACTIVE   // Visible but greyed out, not startable
}
```

Update `PracticeTest`:
```prisma
status TestStatus @default(DRAFT)
```

### Task 0.2 — New fields on `PracticeTest`

```prisma
totalTime        Int      @default(2700) @map("total_time")        // exam duration in seconds
maxAttempts      Int      @default(1)    @map("max_attempts")       // 0 = unlimited retakes
shuffleQuestions Boolean  @default(false) @map("shuffle_questions") // randomize question order within exercise phases
```

- `totalTime`: currently hardcoded as prop default in `ExamSession.tsx` line 51
- `maxAttempts`: enables retake mechanism (Assessment 1 P0 fix)
- `shuffleQuestions`: anti-cheating measure alongside existing `shuffleAnswers`

### Task 0.3 — `ExamSession` model

```prisma
enum ExamSessionStatus {
  DOING      // Student actively taking test
  GRADING    // Submitted, awaiting teacher review
  GRADED     // Teacher finished grading
}

model ExamSession {
  id                String            @id @default(cuid())
  userId            String            @map("user_id")
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceTestId    String            @map("practice_test_id")
  practiceTest      PracticeTest      @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  status            ExamSessionStatus @default(DOING)
  attemptNumber     Int               @default(1) @map("attempt_number")

  // Progress tracking
  currentPhaseIndex Int               @default(0) @map("current_phase_index")
  timeRemaining     Int               @map("time_remaining")
  answersJson       Json              @default("{}") @map("answers_json")
  flaggedJson       Json              @default("[]") @map("flagged_json")

  // Exam integrity
  tabSwitchCount    Int               @default(0) @map("tab_switch_count")
  ipAddress         String?           @map("ip_address")
  userAgent         String?           @map("user_agent")

  // Timestamps
  startedAt         DateTime          @default(now()) @map("started_at")
  lastSavedAt       DateTime          @default(now()) @map("last_saved_at")
  submittedAt       DateTime?         @map("submitted_at")
  gradedAt          DateTime?         @map("graded_at")

  // Link to final result
  practiceResultId  String?           @unique @map("practice_result_id")
  practiceResult    PracticeResult?   @relation(fields: [practiceResultId], references: [id])

  @@unique([userId, practiceTestId, attemptNumber])
  @@map("exam_sessions")
}
```

**Key decisions:**
- `Json` type (not `String`) for `answersJson`/`flaggedJson` — Prisma 7.5 supports it; eliminates manual parse/stringify and adds DB-level validation.
- `@@unique([userId, practiceTestId, attemptNumber])` — supports multiple attempts per student per test. Each retake creates a new session with `attemptNumber + 1`.
- `tabSwitchCount`, `ipAddress`, `userAgent` — basic exam integrity signals, logged at session creation and updated during auto-save.

Add relations: `examSessions ExamSession[]` on `User` and `PracticeTest`; `examSession ExamSession?` on `PracticeResult`.

### Task 0.4 — Teacher grading fields on `StudentAnswer`

```prisma
teacherOverride  Boolean?  @map("teacher_override")    // null=not reviewed, true=correct, false=incorrect
teacherScore     Float?    @map("teacher_score")        // partial credit 0.0-1.0
teacherComment   String?   @map("teacher_comment")      // per-question feedback
teacherGradedAt  DateTime? @map("teacher_graded_at")    // audit: when was this graded
```

Test-level comments stay on the existing `Comment` model. Per-question feedback lives on `StudentAnswer`. `teacherGradedAt` provides an audit trail for grade changes.

### Task 0.5 — `Notification` model

```prisma
enum NotificationType {
  EXAM_SUBMITTED    // student submitted → notify teacher
  EXAM_GRADED       // teacher graded → notify student
  TEST_ACTIVATED    // teacher published test → notify enrolled students
}

model Notification {
  id          String           @id @default(cuid())
  userId      String           @map("user_id")
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        NotificationType
  referenceId String           @map("reference_id")  // examSessionId or practiceTestId
  read        Boolean          @default(false)
  createdAt   DateTime         @default(now()) @map("created_at")

  @@map("notifications")
}
```

Add `notifications Notification[]` to `User` model.

### Task 0.6 — Migration & data backfill

**Migration strategy (not seed — handles real production data):**

1. Create enums and new models via Prisma migration
2. SQL data migration script:
   - Map `status = 'draft'` → `DRAFT`, `status = 'published'` → `ACTIVE`
   - Handle any unexpected status values: default to `DRAFT` with a warning log
   - For each existing `PracticeResult`: create a corresponding `ExamSession` with `status = GRADED`, `attemptNumber = 1`, `submittedAt = completedAt`, `gradedAt = completedAt`
3. Update `prisma/seed.ts` to use new enum values

**Files needing string→enum updates after migration:**
- `src/app/(student)/topics/[topicId]/page.tsx` (line 56: `status: "published"` → `"ACTIVE"`)
- `src/app/(student)/topics/[topicId]/practice/page.tsx` (line 49: same)
- `src/components/teacher/PracticeTestGrid.tsx` (status toggle logic, lines 184-314)
- `src/app/api/teacher/practice-tests/route.ts`
- `src/app/api/practice-tests/import/route.ts`
- `prisma/seed.ts` (line 270)

---

## PHASE 1: API Routes & Server Logic

### Task 1.1 — Shared grading utility

**New file:** `src/lib/grading.ts`

Extract `isQuestionCorrect` from `src/components/student/ExamSession.tsx` (lines 108-133) into a shared server utility. Handles all 10 question types: MCQ, TRUE_FALSE, GAP_FILL, REORDER_WORDS, CUE_WRITING, PRONUNCIATION, STRESS, MATCHING, WORD_BANK, CLOZE_PASSAGE.

**Security critical:** The submit API grades answers server-side using correct answers from the database. The client never receives `correctAnswer`.

### Task 1.2 — Strip `correctAnswer` from client props

**Modify:** `src/app/(student)/topics/[topicId]/practice/page.tsx` (lines 69-97)

Currently line 78 maps `correctAnswer: q.correctAnswer` to the client. **Remove this field** from the question data passed to ExamShell. The client component must not know correct answers during the exam.

For `PracticeSession` (practice mode with immediate feedback): `correctAnswer` is still needed client-side. Keep it for practice mode only. For exam mode (sections exist): strip it.

### Task 1.3 — Create/resume session: `POST /api/exam-session`

**New file:** `src/app/api/exam-session/route.ts`

Request: `{ practiceTestId }`

Logic:
1. Auth check (student), verify test is `ACTIVE`, verify enrollment access
2. Find latest `ExamSession` for this user + test (highest `attemptNumber`)
   - If DOING: return session data for resume
   - If GRADING: return status only (no action)
   - If GRADED: check `maxAttempts` — if more attempts allowed, allow new session creation with `attemptNumber + 1`; otherwise return status only
   - If none: create new session with `timeRemaining = PracticeTest.totalTime`, record `ipAddress` + `userAgent` from request headers
3. Return: `{ sessionId, status, attemptNumber, answers, flagged, currentPhaseIndex, timeRemaining, startedAt }`

### Task 1.4 — Auto-save: `PATCH /api/exam-session/[sessionId]/save`

**New file:** `src/app/api/exam-session/[sessionId]/save/route.ts`

Request: `{ answers, flagged, timeRemaining, currentPhaseIndex, tabSwitchCount? }`

Logic:
1. Verify session is DOING and belongs to user
2. **Time anomaly check:** compare server elapsed time (`now - lastSavedAt`) with client-reported time delta. If client reports *more* time remaining than expected (clock manipulation), flag the session but still save.
3. Update fields + `lastSavedAt = now()`
4. Rate limit: max 1 save per 2 seconds per session

### Task 1.5 — Submit: `POST /api/exam-session/[sessionId]/submit`

**New file:** `src/app/api/exam-session/[sessionId]/submit/route.ts`

Logic:
1. Load test questions with correct answers from DB
2. Grade each answer server-side using `src/lib/grading.ts` — client sends only `selectedAnswer`, never `isCorrect`
3. Create `PracticeResult` + `StudentAnswer` records
4. If all auto-gradable (no CUE_WRITING): set `GRADED` + `gradedAt`; otherwise: set `GRADING`
5. Set `submittedAt`, link `practiceResultId`
6. **Create notification:** `EXAM_SUBMITTED` → teacher (find teacher via class enrollment chain)
7. Return: `{ status, score?, resultId }`

### Task 1.6 — Teacher grading: `PATCH /api/exam-session/[sessionId]/grade`

**New file:** `src/app/api/exam-session/[sessionId]/grade/route.ts`

Request: `{ grades: [{ studentAnswerId, teacherOverride, teacherScore?, teacherComment? }], markAsGraded? }`

Logic:
1. Auth check (teacher), verify access via enrollment
2. Update each `StudentAnswer` with override fields + set `teacherGradedAt = now()`
3. If `markAsGraded` or all answers reviewed: recalculate `PracticeResult` score, set session `GRADED` + `gradedAt`
4. **Create notification:** `EXAM_GRADED` → student
5. Return updated result

### Task 1.7 — Student results APIs

**New files:**
- `src/app/api/student/results/route.ts` — list all results with session status, attempt numbers
- `src/app/api/student/results/[resultId]/route.ts` — full detail with answers, teacher comments (per-question + test-level), correct answers (only if GRADED), question explanations

### Task 1.8 — Notification APIs

**New files:**
- `src/app/api/notifications/route.ts` — `GET` unread count + recent list; `PATCH` mark as read
- Notification creation happens inside submit/grade/activate endpoints (Tasks 1.5, 1.6)

---

## PHASE 2: Core Client Hooks

### Task 2.1 — `useExamPhases`

**New file:** `src/hooks/useExamPhases.ts`

Pure computation (useMemo). Input: `sections[]`, `questions[]`, `shuffleQuestions: boolean`. Output: `Phase[]`.

```ts
type Phase = {
  id: string;
  type: "exercise" | "review";
  title: string;
  breadcrumb: string[];           // ["Part 1", "Listening", "Form Completion"]
  questions: Question[];
  sectionMedia?: { url: string; type: string };
  partTitle?: string;
  groupTitle?: string;
};
```

Logic:
1. Walk section tree → find EXERCISE-level leaves → build breadcrumbs via parent chain
2. Sort by PART → GROUP → EXERCISE sort order
3. If `shuffleQuestions`: randomize question order within each phase (seeded by sessionId for consistency across page reloads)
4. Handle unsectioned questions as a single "General" phase
5. Append `{ type: "review" }` final phase

### Task 2.2 — `useExamSession`

**New file:** `src/hooks/useExamSession.ts`

Central state machine:
- On mount: `POST /api/exam-session` to create/resume
- State: `answers`, `flaggedQuestions`, `currentPhaseIndex`, `timeRemaining`, `sessionId`, `saveStatus`, `attemptNumber`
- Actions: `setAnswer`, `toggleFlag`, `nextPhase`, `prevPhase`, `goToPhase(index)`, `submit`
- Timer: decrement every second; auto-submit on expiry
- Resume: hydrate from server response, compare with localStorage `lastSavedAt`
- **Tab switch tracking:** listen to `document.visibilitychange`, increment `tabSwitchCount`, include in auto-save payload

### Task 2.3 — `useExamAutoSave`

**New file:** `src/hooks/useExamAutoSave.ts`

- Tracks dirty flag on answer/flag/phase/tabSwitch changes
- Every 3 seconds if dirty: PATCH save endpoint + write localStorage
- On `beforeunload`: final sync save
- Exposes `saveStatus: "saved" | "saving" | "error"` and `lastSavedAt: Date`
- Retry once after 5s on failure; show offline indicator on consecutive failures

---

## PHASE 3: Exam UI Components

All new files in `src/components/exam/`.

**i18n requirement:** Every UI string in these components must use `useTranslations("exam")`. Add all new keys to translation message files as part of each component task.

### Task 3.1 — `QuestionRenderer`

**New file:** `src/components/exam/QuestionRenderer.tsx`

Extract rendering logic from `ExamSession.tsx` lines 216-342. Props:

```tsx
type Props = {
  question: Question;
  answer: string;
  onAnswer: (value: string) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  disabled: boolean;
  showResult?: boolean;
};
```

Dispatches to existing question type components (**reused as-is, no modifications**):
- `src/components/student/ReorderWords.tsx`
- `src/components/student/CueWriting.tsx`
- `src/components/student/PronunciationQ.tsx`
- `src/components/student/MatchingPairs.tsx`
- `src/components/student/WordBank.tsx`
- `src/components/student/TrueFalseList.tsx`
- `src/components/student/AudioPlayer.tsx`

Each question card: question number badge, content + media, answer area, `FlagButton` in top-right.

### Task 3.2 — `FlagButton`

**New file:** `src/components/exam/FlagButton.tsx`

Toggle: outline `bookmark` icon (unflagged) → filled amber `bookmark` (flagged). 44px touch target.

### Task 3.3 — `ExamHeader`

**New file:** `src/components/exam/ExamHeader.tsx`

Layout:
- Left: Breadcrumb (Part > Group > Exercise); collapse to title-only on mobile
- Right: Timer badge (purple → amber pulse at 5min → red pulse at 1min)
- Right: Save status with timestamp — "Saved 10s ago" / "Saving..." / "Offline" (with appropriate icon)
- Below: Slim gradient progress bar (answered / total across all phases)
- **Question palette toggle** (hamburger/grid icon): opens slide-out panel showing all question numbers as a grid. Each number shows status: answered (filled), unanswered (outline), flagged (amber). Click any number → `goToPhase(phaseIndex)` + scroll to question. Panel collapses on selection.

Timer display:
- Format: `MM:SS` for under 1 hour, `H:MM:SS` for longer
- Color shift: normal → warning (amber pulse at 5min) → critical (red pulse at 1min)
- On time expiry: auto-submit with confirmation toast

### Task 3.4 — `ExamFooter`

**New file:** `src/components/exam/ExamFooter.tsx`

Layout (per `design/test_exam/ielts_writing/screen.png`):
- Left: `← PREVIOUS` (disabled on first phase)
- Center: "Q 1-5 of 40" range indicator
- Right: `NEXT →` (label → "REVIEW" on last content phase)

Design:
- Glassmorphism background (70% opacity, 24px backdrop-blur)
- Gradient CTA for Next button (primary → primary-container)
- Ghost/text style for Previous
- 44px minimum touch targets
- Safe area padding: `env(safe-area-inset-bottom)`

### Task 3.5 — `ExamPhase`

**New file:** `src/components/exam/ExamPhase.tsx`

Renders one exercise-phase: title, section description, section media (pinned audio/image), questions via `QuestionRenderer`. Auto-scroll to top on phase change. Generous 1.5rem spacing between questions. No border lines — background tonal shifts only.

### Task 3.6 — `ExamReview`

**New file:** `src/components/exam/ExamReview.tsx`

Per design reference (`design/test_exam/ielts_test_review_submission/screen.png`):
- Per-Part summary cards: answered/total progress, flagged count (amber), unanswered count (muted)
- "Review Part N" links → `goToPhase(firstPhaseOfPart)`
- "Attention Required" banner if unanswered or flagged remain
- Confirmation checkbox: "I have reviewed all my answers and am ready to submit"
- Submit button: gradient CTA, disabled until checkbox checked

### Task 3.7 — `ExamShell`

**New file:** `src/components/exam/ExamShell.tsx`

Top-level orchestrator. **Replaces** the old `src/components/student/ExamSession.tsx`.

```
┌──────────────────────────────────────────────┐
│  ExamHeader (sticky top)                     │
│  [Breadcrumb] [Palette]     [Timer] [Save]   │
│  ┌─ Progress bar ──────────────────────────┐ │
├──────────────────────────────────────────────┤
│                                              │
│  ExamPhase | ExamReview (scrollable)         │
│                                              │
├──────────────────────────────────────────────┤
│  ExamFooter (sticky bottom)                  │
│  [← Previous]    Q 4/40    [Next →]         │
└──────────────────────────────────────────────┘
```

Behavior:
- Full viewport layout, content scrolls between fixed header/footer
- Keyboard: Left/Right arrows for phase navigation
- Wires all hooks (`useExamPhases`, `useExamSession`, `useExamAutoSave`)
- Handles both sectioned and non-sectioned tests (non-sectioned = single phase + review)
- **Copy/paste prevention:** `onContextMenu={e => e.preventDefault()}`, `user-select: none` on the exam content area during active DOING sessions

**Deprecation note:** After ExamShell is complete and tested, delete `src/components/student/ExamSession.tsx`. Update `src/app/(student)/topics/[topicId]/practice/page.tsx` to route all test modes through ExamShell (sectioned tests get multiple phases, non-sectioned tests get a single phase). The `PracticeSession` component remains only for `mode: "practice"` (flashcard-style with immediate feedback, attempts, re-queuing).

---

## PHASE 4: Entry Gate & Status System

### Task 4.1 — `ExamStatusBadge`

**New file:** `src/components/exam/ExamStatusBadge.tsx`

| Effective Status | Label | Color | Icon |
|---|---|---|---|
| ACTIVE (no session) | "Available" | Green | `play_circle` |
| INACTIVE | "Unavailable" | Gray 50% | `block` |
| DOING | "In Progress" | Amber | `pending` |
| GRADING | "Awaiting Grade" | Blue | `hourglass_top` |
| GRADED | "View Results" | Purple | `verified` |

Session status takes priority over test status.

### Task 4.2 — `ExamEntryGate`

**New file:** `src/components/exam/ExamEntryGate.tsx`

Pre-exam lobby. **Six scenarios:**

1. **INACTIVE:** "This exam is not yet available" — no action. Show availability window if `availableFrom`/`availableTo` set.

2. **ACTIVE, no session — Exam Instructions:**
   - Test title, description
   - Metadata: question count, time limit, number of parts, question types summary
   - Rules: "You can flag questions for review", "Your progress is saved automatically", "You can navigate between sections"
   - "Start Exam" gradient CTA
   - On click: create `ExamSession`, enter ExamShell

3. **ACTIVE, session DOING — Resume:**
   - "Resume Your Exam"
   - Time remaining, questions answered, last saved timestamp
   - "Continue Exam" gradient CTA

4. **GRADING:** "Exam Submitted — awaiting teacher review" — submission timestamp, no action.

5. **GRADED — View Results:**
   - Score summary, "View Full Results" CTA → student result detail page
   - If retakes allowed (`attemptNumber < maxAttempts` or `maxAttempts = 0`): "Retake Exam" secondary CTA → creates new session with `attemptNumber + 1`
   - Show attempt history if multiple attempts exist

6. **GRADED, max attempts reached:** "View Results" only, no retake button.

### Task 4.3 — Update practice page routing

**Modify:** `src/app/(student)/topics/[topicId]/practice/page.tsx`

- Query latest ExamSession for user + test
- For `mode: "test"` (both sectioned and non-sectioned): render `ExamEntryGate` which launches `ExamShell`
- For `mode: "practice"`: keep current `PracticeSession` flow (immediate feedback, re-queuing — fundamentally different UX)
- **Strip `correctAnswer`** from question props for test mode (keep for practice mode)

### Task 4.4 — Update topic detail test cards

**Modify:** `src/app/(student)/topics/[topicId]/page.tsx` (lines 233-293)

- Batch query latest ExamSession for each test for this user
- Show `ExamStatusBadge` on each test card
- Show attempt count if multiple attempts ("Attempt 2 of 3")
- Per-card click → routes to practice page with `testId` param
- INACTIVE tests: reduced opacity, not clickable
- GRADED tests: show score on card, click to view results

---

## PHASE 5: Teacher Grading Interface

### Task 5.1 — Per-question grading in `ResultDetailModal`

**Modify:** `src/components/teacher/ResultDetailModal.tsx` (lines 193-260)

Enhance each answer table row:
- Click row to expand grading section
- "Mark Correct" / "Mark Incorrect" toggle buttons (`teacherOverride`)
- For CUE_WRITING: partial credit slider (0-100%) → `teacherScore`
- Per-question comment textarea → `teacherComment`
- Save button per row → PATCH `/api/exam-session/[sessionId]/grade`
- Visual: ungraded CUE_WRITING rows highlighted with amber left border
- **"Show only manual review needed" filter** — hides auto-gradable questions, shows only CUE_WRITING and questions where auto-grade may be disputed
- "Mark All as Graded" button at bottom for bulk completion

### Task 5.2 — Grade-by-question view

**New file:** `src/components/teacher/GradeByQuestion.tsx`

Alternative grading workflow — teacher selects a question number, sees all students' answers side-by-side:

```
┌─────────────────────────────────────────────┐
│  Question 7: "Write a sentence using..."    │
│  Type: CUE_WRITING | 28 submissions         │
├─────────────────────────────────────────────┤
│  Student A:  "The cat sat on..."    [0.5] [Comment] │
│  Student B:  "A dog was running..." [1.0] [Comment] │
│  Student C:  "She go to school..."  [0.0] [Comment] │
│  ...                                        │
│  [← Q6]                     [Q8 →]          │
└─────────────────────────────────────────────┘
```

- Navigate between questions with prev/next
- Score input + comment per student per question
- Keyboard: number keys (0-5) for quick scoring, Tab to next student
- Accessible from the teacher student-results page as a "Grade by Question" tab/toggle

**New API:** `GET /api/teacher/practice-tests/[testId]/answers-by-question?questionNumber=7` — returns all student answers for a specific question across all submissions.

### Task 5.3 — Grading status in results table

**Modify:** `src/components/teacher/StudentResultsTable.tsx`

- Add "Status" column (DOING/GRADING/GRADED badge)
- Add "Needs Grading" filter (GRADING status) — default active
- Sort GRADING submissions to top
- "Mark as Graded" quick action on table rows
- Show `tabSwitchCount` as a warning icon if > 0 ("Student left the tab 3 times")

### Task 5.4 — Update teacher results APIs

**Modify:**
- `src/app/api/teacher/student-results/route.ts` — join ExamSession for status, add `status` filter, include `tabSwitchCount`, `attemptNumber`
- `src/app/api/teacher/student-results/[resultId]/route.ts` — include `teacherOverride`, `teacherScore`, `teacherComment`, `teacherGradedAt` per answer; include session status and integrity data

### Task 5.5 — Teacher test settings UI update

**Modify:** `src/components/teacher/PracticeTestGrid.tsx`

Add to the test settings panel:
- `totalTime` field (minutes input, stored as seconds)
- `maxAttempts` field (0 = unlimited, default 1)
- `shuffleQuestions` toggle
- `INACTIVE` status option (alongside DRAFT and ACTIVE)

---

## PHASE 6: Student Results Viewing

### Task 6.1 — Student results list page

**New file:** `src/app/(student)/results/page.tsx`

Server component listing all PracticeResults for student:
- Test name, topic, score, date, session status badge, attempt number
- Click → result detail page
- Filter by status (GRADING/GRADED)
- Sort by date descending

### Task 6.2 — Student result detail page

**New file:** `src/app/(student)/results/[resultId]/page.tsx`

Full result breakdown:
- Score summary (score %, correct/total, time spent)
- **Analytics section:**
  - Performance by difficulty level (Easy/Medium/Hard breakdown)
  - Performance by question type (MCQ accuracy vs GAP_FILL accuracy, etc.)
  - Time distribution per part ("You spent 60% of time on Part 1 which had 30% of questions")
- Per-question review: question content, student answer, correct answer (only if GRADED), teacher comment (if any), explanation text (from `Question.explanation`)
- Test-level comments from `Comment` model
- Attempt history (if multiple attempts): score trend across attempts

### Task 6.3 — Wire into existing flows

- `ExamEntryGate` GRADED scenario → link to result detail page
- Topic detail test cards (GRADED) → link to result detail page
- **Add "My Results" link to `StudentNavbar`** (`src/app/(student)/layout.tsx`)
- Add notification badge counter to `StudentNavbar` (uses `GET /api/notifications` unread count)

---

## PHASE 7: Notifications

### Task 7.1 — Notification creation (server-side)

Notifications are created inside existing API endpoints — no separate "send notification" endpoint:
- **On exam submit** (Task 1.5): create `EXAM_SUBMITTED` notification for the teacher
- **On grade complete** (Task 1.6): create `EXAM_GRADED` notification for the student
- **On test status change to ACTIVE** (teacher practice-tests API): create `TEST_ACTIVATED` notification for all enrolled students

### Task 7.2 — Notification UI

**New file:** `src/components/NotificationBell.tsx`

- Bell icon with unread count badge in both student and teacher nav bars
- Click → dropdown list of recent notifications
- Each notification: icon + message + timestamp + read/unread indicator
- Click notification → navigate to relevant page (result detail, grading modal, etc.)
- "Mark all as read" action

### Task 7.3 — Notification APIs

**New file:** `src/app/api/notifications/route.ts`

- `GET`: return unread count + paginated list for authenticated user
- `PATCH`: mark specific notifications or all as read

---

## PHASE 8: Exam Integrity

### Task 8.1 — Tab switch detection

In `useExamSession` (Task 2.2):
- Listen to `document.addEventListener('visibilitychange')`
- On tab leave: increment `tabSwitchCount` in state
- Include in auto-save payload → persisted to `ExamSession.tabSwitchCount`
- Display to teacher in grading view (Task 5.3)

### Task 8.2 — Time anomaly detection

In save endpoint (Task 1.4):
- On each save: compare `now() - lastSavedAt` (server elapsed) vs the decrease in `timeRemaining` (client reported)
- If client claims more time remaining than physically possible (clock rewound): log anomaly flag on session
- Don't block the save — just record it for teacher review

### Task 8.3 — Question shuffling

In `useExamPhases` (Task 2.1):
- If `PracticeTest.shuffleQuestions` is true: shuffle question order within each exercise phase
- Use `sessionId` as seed for deterministic shuffle (same order on page reload, different per student)
- `shuffleAnswers` (existing field): shuffle answer option order per question — implement in `QuestionRenderer`

---

## PHASE 9: Styling & Design System

### Task 9.1 — Exam CSS tokens

**Modify:** `src/app/globals.css`

```css
--exam-surface: #fdf8fe;
--exam-surface-low: #f7f2fa;
--exam-surface-container: #f1ecf6;
--exam-surface-highest: #e5e0ed;
--exam-primary: #5e35f1;
--exam-primary-container: #6b45fe;
--exam-on-surface: #33313a;
--exam-on-surface-variant: #777586;

.exam-glass {
  background: rgba(253, 248, 254, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
.exam-cta {
  background: linear-gradient(45deg, var(--exam-primary), var(--exam-primary-container));
}
.exam-ghost-border {
  outline: 1px solid rgba(199, 196, 215, 0.15);
}
```

### Task 9.2 — Apply design rules across exam components

- **No-Line Rule:** Background tonal shifts between sections, not borders
- **Ambient shadows:** `rgba(94, 53, 241, 0.06)` instead of gray
- **Ghost borders:** 15% opacity only where absolutely needed
- **44px touch targets** on all interactive elements
- **1.5rem spacing** between question blocks

### Task 9.3 — Mobile responsive

- ExamHeader: collapse breadcrumb to current title; question palette as full-screen modal on mobile
- ExamFooter: full-width sticky with `env(safe-area-inset-bottom)`
- ExamReview: single-column part summaries
- Questions: full-width cards

---

## PHASE 10: Edge Cases & Polish

### Task 10.1 — Timer expiry
Auto-submit with toast "Time's up!" when `timeRemaining` hits 0. Save answers before submitting.

### Task 10.2 — Browser navigation guards
`beforeunload` warning during DOING session. Intercept back button with confirmation modal via Next.js router events.

### Task 10.3 — Network resilience
Auto-save retry (once after 5s). Offline indicator on consecutive failures. localStorage always up-to-date as fallback. On submit with no network: queue and retry on reconnect.

### Task 10.4 — Accessibility
Focus first question on phase change. Enter to select MCQ. Tab between questions. ARIA quiz/timer roles. `prefers-reduced-motion` disables scroll animations. Screen reader announces phase changes and timer warnings.

### Task 10.5 — Backward compatibility cutover
- Delete `src/components/student/ExamSession.tsx` after ExamShell is fully tested
- Update practice page routing to use ExamShell for all `mode: "test"` tests
- Verify existing bookmarks (`QuestionBookmark`) still work with new components
- Verify existing `useSessionDraft` hook is no longer needed for exam mode (replaced by server persistence); keep for practice mode only

---

## Dependency Graph

```
PHASE 0 (Schema) ──────────────┬───────────────────────────────┐
                                v                               v
PHASE 1 (APIs) ──────────> PHASE 2 (Hooks)              PHASE 9 (Styling)
                                │                         (apply incrementally)
                                v
                          PHASE 3 (Exam UI)
                                │
                    ┌───────────┼───────────┐
                    v           │           v
              PHASE 4          │     PHASE 5
              (Entry Gate)     │     (Teacher Grading)
                    │          │           │
                    v          v           v
              PHASE 6     PHASE 7     PHASE 8
              (Student     (Notifs)   (Integrity)
               Results)
                    │          │           │
                    └──────────┴───────────┘
                                │
                                v
                          PHASE 10 (Polish)
```

**MVS Milestone: Phase 0 + 1 + 2 + 3** → testable phased exam with server persistence.

---

## Files Summary

### New files (28)

| File | Phase |
|------|-------|
| `src/lib/grading.ts` | 1 |
| `src/app/api/exam-session/route.ts` | 1 |
| `src/app/api/exam-session/[sessionId]/save/route.ts` | 1 |
| `src/app/api/exam-session/[sessionId]/submit/route.ts` | 1 |
| `src/app/api/exam-session/[sessionId]/grade/route.ts` | 1 |
| `src/app/api/student/results/route.ts` | 1 |
| `src/app/api/student/results/[resultId]/route.ts` | 1 |
| `src/app/api/notifications/route.ts` | 1 |
| `src/app/api/teacher/practice-tests/[testId]/answers-by-question/route.ts` | 5 |
| `src/hooks/useExamPhases.ts` | 2 |
| `src/hooks/useExamSession.ts` | 2 |
| `src/hooks/useExamAutoSave.ts` | 2 |
| `src/components/exam/QuestionRenderer.tsx` | 3 |
| `src/components/exam/FlagButton.tsx` | 3 |
| `src/components/exam/ExamHeader.tsx` | 3 |
| `src/components/exam/ExamFooter.tsx` | 3 |
| `src/components/exam/ExamPhase.tsx` | 3 |
| `src/components/exam/ExamReview.tsx` | 3 |
| `src/components/exam/ExamShell.tsx` | 3 |
| `src/components/exam/ExamStatusBadge.tsx` | 4 |
| `src/components/exam/ExamEntryGate.tsx` | 4 |
| `src/components/teacher/GradeByQuestion.tsx` | 5 |
| `src/app/(student)/results/page.tsx` | 6 |
| `src/app/(student)/results/[resultId]/page.tsx` | 6 |
| `src/components/NotificationBell.tsx` | 7 |
| Migration files | 0 |
| Translation key files for `exam` namespace | 3 |
| Data backfill migration script | 0 |

### Modified files (13)

| File | Phase | Changes |
|------|-------|---------|
| `prisma/schema.prisma` | 0 | TestStatus, ExamSession, StudentAnswer fields, Notification, PracticeTest fields |
| `prisma/seed.ts` | 0 | Use new enum values |
| `src/app/(student)/topics/[topicId]/page.tsx` | 0, 4 | Status enum, ExamStatusBadge, attempt count |
| `src/app/(student)/topics/[topicId]/practice/page.tsx` | 0, 1, 4 | Status enum, strip correctAnswer, EntryGate routing |
| `src/components/teacher/PracticeTestGrid.tsx` | 0, 5 | Status enum, new settings (totalTime, maxAttempts, shuffleQuestions) |
| `src/app/api/teacher/practice-tests/route.ts` | 0 | Status enum |
| `src/app/api/practice-tests/import/route.ts` | 0 | Status enum |
| `src/components/teacher/ResultDetailModal.tsx` | 5 | Per-question grading UI |
| `src/components/teacher/StudentResultsTable.tsx` | 5 | Status column, Needs Grading filter, tab switch indicator |
| `src/app/api/teacher/student-results/route.ts` | 5 | Join ExamSession, status filter |
| `src/app/api/teacher/student-results/[resultId]/route.ts` | 5 | Include grading fields, integrity data |
| `src/app/(student)/layout.tsx` | 6, 7 | My Results link, NotificationBell |
| `src/app/globals.css` | 9 | Exam design tokens |

### Deleted files (1)

| File | Phase | Reason |
|------|-------|--------|
| `src/components/student/ExamSession.tsx` | 10 | Replaced by ExamShell; delete after full testing |

### Reused as-is (7 components)

- `src/components/student/ReorderWords.tsx`
- `src/components/student/CueWriting.tsx`
- `src/components/student/PronunciationQ.tsx`
- `src/components/student/MatchingPairs.tsx`
- `src/components/student/WordBank.tsx`
- `src/components/student/TrueFalseList.tsx`
- `src/components/student/AudioPlayer.tsx`

---

## Key Design Decisions

1. **Phase = Exercise, not Question.** Students see all questions in an exercise together (like the IELTS designs). Reduces clicking while maintaining structure.

2. **Server-side session persistence.** `ExamSession` model eliminates localStorage fragility. 3-second auto-save balances server load with data safety.

3. **Multi-attempt with `attemptNumber`.** `@@unique([userId, practiceTestId, attemptNumber])` supports retakes. Teacher controls via `maxAttempts`. Each attempt is a separate session with its own result.

4. **Hybrid grading.** Auto-grade MCQ types server-side. Leave `GRADING` status for tests with CUE_WRITING until teacher reviews. Teacher can also override auto-grades.

5. **Server-side grading — `correctAnswer` never sent to client.** Fixes the critical security gap. Client sends only `selectedAnswer`; server determines correctness.

6. **`Json` type for answersJson/flaggedJson.** Prisma 7.5 supports it on PostgreSQL. Eliminates manual parse/stringify and adds DB-level JSON validation.

7. **Question palette for random access.** Slide-out panel in ExamHeader with question number grid. Preserves the navigability of the old sidebar while fitting the phased design.

8. **ExamShell handles both sectioned and non-sectioned tests.** Non-sectioned tests become a single phase + review. Eliminates the need for two parallel systems with different capabilities.

9. **Notifications are created server-side inside existing endpoints.** No separate notification service needed. Simple model with badge counter covers the critical feedback loop.

10. **Grade-by-question view.** Teachers can grade all students' answers to Q7 together, then Q8, etc. Faster and more consistent than per-student grading for large classes.

---

## Verification Plan

1. **Schema:** `npx prisma migrate dev` succeeds; backfill script creates ExamSessions for existing results
2. **Security:** Confirm `correctAnswer` is NOT in the client bundle (check DevTools Network tab for question data)
3. **MVS (Phase 0-3):** Start exam → navigate phases → flag questions → question palette jump → review phase → submit → server creates PracticeResult with server-graded scores
4. **Auto-save:** Start exam → answer questions → close tab → reopen → "Resume" with correct answers, flags, timer, phase
5. **Timer:** Let timer expire → auto-submit triggers → session becomes GRADING/GRADED
6. **Retakes:** Complete exam → GRADED → click "Retake" → new session with `attemptNumber = 2` → complete again → see attempt history
7. **Teacher grading (by student):** Submit CUE_WRITING test → GRADING → teacher opens result → grades per-question with comments → marks graded → status GRADED → student gets notification
8. **Teacher grading (by question):** Switch to "Grade by Question" view → select Q7 → see all students → quick-score with keyboard → navigate to Q8
9. **Student results:** After grading → notification badge → "My Results" page → full breakdown with teacher comments, correct answers, analytics
10. **Exam integrity:** Tab switch during exam → count displayed to teacher in grading view
11. **Status transitions:** Verify all 6 EntryGate scenarios render correctly
12. **Mobile:** Test header/footer sticky, question palette as modal, safe-area padding
13. **Notifications:** Submit → teacher sees badge → grade → student sees badge → click → navigate to result
