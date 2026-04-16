# TDD: Student Practice & Exam Page

**Page:** `src/app/(student)/topics/[topicId]/practice/page.tsx`
**Stack:** Next.js 16 App Router, Prisma, NextAuth, next-intl, Framer Motion (motion/react)

---

## 1. Architecture Overview

```
Browser Request
      │
      ▼
[Server Component] practice/page.tsx
      │  ┌─────────────────────────────────┐
      │  │  1. auth() → redirect if anon   │
      │  │  2. Prisma: enrollment check    │
      │  │  3. Prisma: PracticeTest fetch  │
      │  │  4. mapQuestion() strip secrets │
      │  │  5. Branch: mode check          │
      │  └─────────────────────────────────┘
      │
      ├── mode = "practice"
      │       └─▶ <PracticeSession ... />   (Client Component)
      │
      └── mode = anything else
              │
              ├─▶ <ExamEntryGate ...>        (Client Component, pre-exam gate)
              │       └─▶ <ExamShell ... />  (Client Component, rendered as children)
              │
              ▼
          (Server also queries ExamSession for ExamEntryGate props)
```

The page is a **React Server Component** (RSC). All sensitive fields are stripped before serialisation. Client components receive plain JSON props — no server actions, no tRPC.

---

## 2. Route & Data Flow

### 2.1 Page Route

```
GET /topics/[topicId]/practice?testId=<optional>
```

**Params:**
- `topicId` (path): resolved via `await params`
- `testId` (query, optional): resolved via `await searchParams`

**Authentication:** `auth()` from NextAuth. Redirects to `/login` if no session.

### 2.2 Server Data Fetching

Two Prisma queries run in sequence (sequential dependency):

**Query 1 — Enrollment check:**
```typescript
prisma.classEnrollment.findFirst({
  where: {
    userId: session.user.id,
    class: { topicAssignments: { some: { topicId } } },
  },
})
```
Result: if null → `notFound()`

**Query 2 — PracticeTest with questions and sections:**
```typescript
// If testId provided:
prisma.practiceTest.findUnique({
  where: { id: testId, topicId },
  include: {
    questions: { orderBy: { questionNumber: "asc" } },
    sections: { orderBy: { sortOrder: "asc" } },
  },
})

// Otherwise, first active test:
prisma.practiceTest.findFirst({
  where: {
    topicId,
    status: "ACTIVE",
    OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
    AND: [{ OR: [{ availableTo: null }, { availableTo: { gte: now } }] }],
  },
  include: { questions: {...}, sections: {...} },
})
```

**Query 3 (exam mode only) — ExamSession:**
```typescript
prisma.examSession.findFirst({
  where: { userId: session.user.id, practiceTestId: practiceTest.id },
  orderBy: { attemptNumber: "desc" },
  include: { practiceResult: { select: { id: true, score: true } } },
})
```

### 2.3 `mapQuestion()` — Security Transform

```typescript
function mapQuestion(q: any, includeCorrectAnswer: boolean) {
  return {
    id, questionNumber, content, questionType,
    answer1, answer2, answer3, answer4,
    ...(includeCorrectAnswer ? { correctAnswer, explanation, explanationMediaUrl, explanationMediaType } : {}),
    timer, contentMediaUrl, contentMediaType,
    answer1MediaUrl, answer1MediaType, answer2MediaUrl, answer2MediaType,
    answer3MediaUrl, answer3MediaType, answer4MediaUrl, answer4MediaType,
    difficulty, audioPlayLimit, sectionId, advancedData,
  };
}
```

Called as:
- Practice mode: `mapQuestion(q, true)`
- Exam mode: `mapQuestion(q, false)` — omits correctAnswer and all explanation fields

This transform runs **inside the RSC before serialisation**. It is not possible to bypass this by calling an API from the browser.

---

## 3. Component Tree

### 3.1 Practice Mode

```
page.tsx (RSC)
└── PracticeSession (Client)
    ├── useAudioManager (hook)
    ├── useMediaPreloader (hook)
    ├── useSessionDraft (hook)
    ├── CircularTimer (Client)
    ├── QuestionTransition (Client, motion/react)
    ├── AnswerFeedback (Client)
    │   └── Web Audio API (success/fail sounds)
    │   └── Vibration API (haptic)
    ├── StreakCounter (Client)
    ├── AudioPlayer (Client)
    ├── ReorderWords (Client)
    ├── CueWriting (Client)
    ├── TrueFalseList (Client)
    ├── MatchingPairs (Client)
    ├── PronunciationQ (Client)
    ├── WordBank (Client)
    └── ResultsScreen (Client, motion/react)
```

### 3.2 Exam Mode

```
page.tsx (RSC)
└── ExamEntryGate (Client)
    ├── ExamStatusBadge (Client)
    ├── Confetti (Client, inline, motion/react) — GRADED + excellent score only
    └── [children] ExamShell (Client)  ← rendered when started=true
        ├── useExamPhases (hook, memoised)
        ├── useExamSession (hook, state machine)
        ├── ExamHeader (Client)
        │   └── Question Palette (inline panel)
        ├── ExamPhase (Client)  ← when currentPhase.type === "exercise"
        │   ├── AudioPlayer (Client)
        │   └── QuestionRenderer × N (Client)
        │       ├── FlagButton (Client)
        │       ├── AudioPlayer (Client, per-question audio)
        │       ├── ReorderWords (Client)
        │       ├── CueWriting (Client)
        │       ├── PronunciationQ (Client)
        │       ├── MatchingPairs (Client)
        │       ├── WordBank (Client)
        │       └── [default] MCQ / TrueFalse buttons
        ├── ExamReview (Client)  ← when currentPhase.type === "review"
        └── ExamFooter (Client)  ← when status === "DOING"
```

---

## 4. Hooks

### 4.1 `useExamPhases`

**Location:** `src/hooks/useExamPhases.ts` (symlinked from `src/components/student/useExamPhases.ts`)
**Signature:**
```typescript
function useExamPhases(
  sections: Section[],
  questions: ExamQuestion[],
  shuffleQuestions: boolean,
  shuffleSeed: string
): Phase[]
```

**Algorithm:**
1. Build `sectionMap: Map<id, Section>` for O(1) parent lookup
2. `buildBreadcrumb(sectionId)` — walks up `parentId` chain, returns `string[]` root-first
3. `findAncestors(sectionId)` — extracts `partTitle` and `groupTitle` for review grouping
4. `getChildren(parentId)` — filters sections by parentId, sorts by `sortOrder`
5. `getQuestions(sectionId)` — filters questions by `sectionId`, sorts by `questionNumber`, optionally shuffles with `seededShuffle`
6. `walkSection(section)` — depth-first recursion. Leaf nodes (EXERCISE level or no children) with questions produce a Phase
7. Root call: `walkSection` on all sections where `parentId === null`
8. After tree walk: unsectioned questions appended as a "General" phase
9. Fallback: if `phases.length === 0`, all questions become one phase
10. Always append `{ id: "review", type: "review" }` as the final phase

**Memoisation:** Wrapped in `useMemo` with deps `[sections, questions, shuffleQuestions, shuffleSeed]`

**`seededShuffle<T>(arr, seed)`:**
- Pure deterministic Fisher-Yates
- Seed is hashed via: `hash = ((hash << 5) - hash + charCode) | 0` for each character (Bernstein hash variant)
- Each swap index: `j = Math.abs(hash) % (i + 1)` where hash is evolved per iteration
- Same seed + same input = same output; different seed = different output

**Types:**
```typescript
type Section = {
  id: string; parentId: string | null; level: "PART" | "GROUP" | "EXERCISE";
  title: string; description: string | null; sortOrder: number;
  mediaUrl: string | null; mediaType: string | null;
}

type ExamQuestion = {
  id: string; questionNumber: number; content: string; questionType: string;
  answer1: string; answer2/3/4: string | null; timer: number;
  sectionId: string | null; advancedData: string | null;
  contentMediaUrl?; contentMediaType?; difficulty?; audioPlayLimit?;
  answer1-4MediaUrl?; answer1-4MediaType?;
}

type Phase = {
  id: string; type: "exercise" | "review"; title: string;
  breadcrumb: string[]; questions: ExamQuestion[];
  sectionMedia?: { url: string; type: string };
  sectionDescription?: string | null;
  partTitle?: string; groupTitle?: string;
}
```

---

### 4.2 `useExamSession`

**Location:** `src/hooks/useExamSession.ts` (symlinked from `src/components/student/useExamSession.ts`)
**Signature:**
```typescript
function useExamSession(opts: {
  practiceTestId: string;
  phases: Phase[];
  totalTime: number;
}): ExamSessionState
```

**State:**
```typescript
sessionId: string | null           // ExamSession.id from server
status: "loading"|"DOING"|"GRADING"|"GRADED"|"error"
attemptNumber: number
currentPhaseIndex: number
answers: Record<string, string>    // questionId → selected answer value
flaggedQuestions: Set<string>      // questionIds that are bookmarked
timeRemaining: number              // seconds
tabSwitchCount: number
saveStatus: "idle"|"saving"|"saved"|"error"
lastSavedAt: Date | null
isDirty: boolean
isSubmitting: boolean
submitResult: { status, score, resultId, correctCount, totalQuestions } | null
```

**Refs (stable, no re-render on change):**
```typescript
timerRef        // setInterval handle for countdown
autoSaveRef     // setInterval handle for auto-save
sessionIdRef    // mirrors sessionId state (avoids stale closure in intervals)
submittedRef    // boolean flag, prevents double submit
performSaveRef  // mirrors performSave callback (avoids interval teardown on state changes)
isDirtyRef      // mirrors isDirty state (read inside auto-save interval)
```

**Effects lifecycle:**
1. **Init effect** (`[practiceTestId]`): POST `/api/exam-session`, parse response, merge localStorage if newer
2. **Timer effect** (`[status]`): `setInterval(1s)` decrements `timeRemaining`; calls `handleSubmit()` at 0
3. **Auto-save effect** (`[status]`): `setInterval(3s)` calls `performSaveRef.current()` if dirty and sessionId exists
4. **Tab switch effect** (`[status]`): `visibilitychange` listener increments `tabSwitchCount`
5. **beforeunload effect** (`[status, answers, flaggedQuestions, timeRemaining, currentPhaseIndex]`): sync localStorage write

**`performSave` callback:**
- Created with `useCallback`, deps include answers, flaggedQuestions, timeRemaining, currentPhaseIndex, tabSwitchCount, practiceTestId
- Saves to localStorage first (sync)
- Then PATCHes server (async)
- `performSaveRef.current = performSave` is updated on every render to keep ref fresh without re-registering the 3s interval

**`handleSubmit` callback:**
```
1. Guard: if submittedRef.current → return
2. submittedRef.current = true
3. setIsSubmitting(true)
4. clearInterval(timerRef), clearInterval(autoSaveRef)
5. PATCH /save (best-effort final save)
6. POST /submit
7. On success: setSubmitResult(data), setStatus(data.status), localStorage.removeItem
8. On network failure: submittedRef.current = false (allows retry)
9. finally: setIsSubmitting(false)
```

**Derived values (computed in return, not state):**
```typescript
isFirstPhase:      currentPhaseIndex === 0
isLastContentPhase: currentPhaseIndex === contentPhases.length - 1
isReviewPhase:     currentPhase?.type === "review"
isTimeWarning:     timeRemaining <= 300 && timeRemaining > 60
isTimeCritical:    timeRemaining <= 60
```

---

### 4.3 Supporting Hooks

**`useAudioManager`** (`src/hooks/useAudioManager.ts`)
- Manages a single `AudioContext` instance
- `play(HTMLMediaElement)` pauses all others and plays the given element
- Handles browser autoplay policy by resuming context on first user gesture

**`useMediaPreloader`** (`src/hooks/useMediaPreloader.ts`)
- Accepts a question list and current index
- Preloads `contentMediaUrl` of `currentIndex + 1` question via `new Image()` or `Audio()` as appropriate

**`useSessionDraft`** (`src/hooks/useSessionDraft.ts`)
- Reads/writes a practice session draft to `localStorage` under key `practice-draft-{practiceTestId}`
- Used only in practice mode

---

## 5. Database Queries

### 5.1 Models Involved

```
PracticeTest
  id, title, topicId, status, mode, totalTime, maxAttempts
  shuffleQuestions, shuffleAnswers, showReviewMoment
  availableFrom, availableTo

Question
  id, practiceTestId, sectionId, questionNumber, questionType
  content, answer1-4, correctAnswer, explanation, explanationMediaUrl, explanationMediaType
  timer, contentMediaUrl, contentMediaType, answer1-4MediaUrl, answer1-4MediaType
  difficulty, audioPlayLimit, advancedData

TestSection
  id, practiceTestId, parentId, level (PART|GROUP|EXERCISE)
  title, description, sortOrder, mediaUrl, mediaType

ExamSession
  id, userId, practiceTestId, attemptNumber
  status (DOING|GRADING|GRADED)
  answersJson (Json: Record<questionId, answer>)
  flaggedJson (Json: string[])
  timeRemaining, currentPhaseIndex, tabSwitchCount
  ipAddress, userAgent
  startedAt, lastSavedAt, submittedAt, gradedAt
  practiceResultId

PracticeResult
  id, userId, practiceTestId
  totalQuestions, correctCount, incorrectCount, score
  createdAt

StudentAnswer
  id, practiceResultId, questionId, userId
  selectedAnswer, isCorrect, attemptNumber, timeSpent
```

### 5.2 Query Patterns

| Query | Location | Pattern |
|-------|----------|---------|
| Enrollment check | page.tsx | `findFirst` with nested relation filter |
| PracticeTest by testId | page.tsx | `findUnique` with `include` |
| PracticeTest first-active | page.tsx | `findFirst` with date window `OR/AND` |
| ExamSession latest | page.tsx | `findFirst` ordered by `attemptNumber desc` |
| Create ExamSession | POST /api/exam-session | `create` |
| Update ExamSession (save) | PATCH /api/exam-session/[id]/save | `update` |
| Atomic claim (submit) | POST /api/exam-session/[id]/submit | `updateMany WHERE status=DOING` |
| Load questions for grading | POST /api/exam-session/[id]/submit | `findUnique` with `include: { practiceTest: { include: { questions: true } } }` |
| Create PracticeResult + StudentAnswers | POST /api/exam-session/[id]/submit | `create` with nested `studentAnswers.create` (array) |
| Save practice result | POST /api/practice/[practiceId]/result | `create` with nested create |

---

## 6. API Endpoints

### 6.1 `POST /api/exam-session`

**Purpose:** Create a new exam session or resume an existing DOING session.

**Request body:** `{ practiceTestId: string }`

**Auth:** Required. Checks enrollment via class→topicAssignment relation.

**Logic:**
1. Verify test exists and `status === "ACTIVE"` → 403 if not
2. Verify enrollment → 403 if not enrolled
3. `findFirst` existing session ordered by `attemptNumber desc`
4. Branch by `existingSession.status`:
   - `DOING` → return session data for resume (no new record created)
   - `GRADING` → return status + attemptNumber only
   - `GRADED` → compute `canRetake`, return with `nextAttemptNumber`
   - `null` (no session) → `create` new session with `attemptNumber: 1`, capture `ipAddress` and `userAgent`

**Response (new session):** `{ sessionId, status, attemptNumber, answers, flagged, currentPhaseIndex, timeRemaining, startedAt, lastSavedAt }` — 201

**Response (resume):** Same shape, 200

---

### 6.2 `PUT /api/exam-session`

**Purpose:** Create a new session for a retake (new attempt number).

**Request body:** `{ practiceTestId: string, attemptNumber: number }`

**Auth:** Required. Checks enrollment.

**Logic:**
1. Verify test and enrollment
2. `test.maxAttempts !== 0 && attemptNumber > test.maxAttempts` → 403
3. `create` new session with given `attemptNumber`, `timeRemaining = test.totalTime`

**Response:** Same shape as POST → 201

---

### 6.3 `PATCH /api/exam-session/[sessionId]/save`

**Purpose:** Auto-save in-progress answers, timer, and navigation state.

**Request body:** `{ answers, flagged, timeRemaining, currentPhaseIndex, tabSwitchCount }`

**Auth:** Required. Ownership check: `examSession.userId === session.user.id` → 404 if mismatch.

**Logic:**
1. Load `ExamSession`
2. Verify `status === "DOING"` → 403 if not
3. **Time anomaly detection:**
   ```
   serverElapsed = floor((now - examSession.lastSavedAt) / 1000)
   clientTimeDelta = examSession.timeRemaining - timeRemaining
   if clientTimeDelta < 0 && serverElapsed > 2:
     adjustedTimeRemaining = max(0, examSession.timeRemaining - serverElapsed)
   else:
     adjustedTimeRemaining = timeRemaining
   ```
4. `update` session with all fields, `lastSavedAt = now`

**Response:** `{ success: true, lastSavedAt, timeRemaining }` — 200

---

### 6.4 `POST /api/exam-session/[sessionId]/submit`

**Purpose:** Grade and finalise the exam session.

**Request body:** `{ confirmed: true }` (currently unused server-side, reserved)

**Auth:** Required. Ownership check.

**Logic:**
1. Load session + practiceTest + questions (one query via include)
2. Verify ownership → 404
3. If `status !== "DOING"` and `practiceResultId` exists → return existing result (idempotent)
4. If `status !== "DOING"` and no result → 403
5. **Atomic claim:** `updateMany WHERE { id, status: "DOING" }` → if count = 0, return 409
6. For each question: call `isQuestionCorrect(question, answers[q.id] || "")`; count `correctCount`
7. If any `requiresManualGrading(q.questionType)` → `needsManualGrading = true`
8. `prisma.practiceResult.create` with nested `studentAnswers.create` array
   - On failure: rollback → `examSession.update { status: "DOING" }` → 500
9. `finalStatus = needsManualGrading ? "GRADING" : "GRADED"`
10. `examSession.update { status: finalStatus, submittedAt, gradedAt?, practiceResultId }`
11. Non-critical: create teacher `Notification` record (try/catch, failure ignored)

**Response:** `{ status, score, resultId, correctCount, totalQuestions }` — 200

---

### 6.5 `POST /api/practice/[practiceId]/result`

**Purpose:** Save practice mode results (no server-side grading needed — client has correctAnswer).

**Request body:**
```typescript
{
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    attempts: number;
    timeSpent?: number;
  }>;
}
```

**Auth:** Required.

**Logic:** `prisma.practiceResult.create` with nested `studentAnswers.create`

**Response:** Created `PracticeResult` record — 201

---

## 7. State Management

The page uses **local React state only** — no global store (no Redux, Zustand, or React Context). Each mode is entirely self-contained.

### Practice Mode State (inside `PracticeSession`)
```
currentIndex: number         // which question the student is on
answers: AnswerRecord[]      // { questionId, selectedAnswer, isCorrect, attempts, timeSpent }
showFeedback: boolean        // whether AnswerFeedback is visible
streak: number               // consecutive correct answers
maxStreak: number
speedBonusCount: number      // answers within time threshold
isFinished: boolean          // triggers ResultsScreen
shuffledOptions: string[][]  // per-question shuffled answer arrays
```

### Exam Mode State (distributed across hooks)
```
useExamSession:
  sessionId, status, attemptNumber
  currentPhaseIndex, answers, flaggedQuestions
  timeRemaining, tabSwitchCount
  saveStatus, lastSavedAt, isDirty
  isSubmitting, submitResult

ExamHeader (local):
  paletteOpen: boolean

ExamReview (local):
  confirmed: boolean

ExamEntryGate (local):
  started: boolean
  startingRetake: boolean
```

---

## 8. Grading Logic

**Location:** `src/lib/grading.ts`

```typescript
function isQuestionCorrect(question: GradableQuestion, selectedAnswer: string): boolean
function requiresManualGrading(questionType: string): boolean
```

**Per-type grading rules:**

| Question Type | Grading Method |
|--------------|----------------|
| MULTIPLE_CHOICE | Case-insensitive trimmed string match vs `correctAnswer` |
| TRUE_FALSE | Case-insensitive trimmed string match |
| GAP_FILL | Case-insensitive trimmed string match |
| PRONUNCIATION | Case-insensitive trimmed string match |
| STRESS | Case-insensitive trimmed string match |
| CLOZE_PASSAGE | Case-insensitive trimmed string match |
| WORD_BANK | Parse `selectedAnswer` as `Record<string, string>`, parse `advancedData.sentences`, compare each `filled[i]` vs `sentence.answer` case-insensitive; all must match |
| MATCHING | Parse `selectedAnswer` as `number[][]`, parse `advancedData.correctPairs`, compare sorted JSON strings |
| REORDER_WORDS | Parse `selectedAnswer` as CSV string, compare vs `advancedData.correctOrder.join(",")` |
| CUE_WRITING | Always `false`; `requiresManualGrading` returns `true` |

**Score formula:** `score = (correctCount / totalQuestions) * 100`

**Manual grading path:** If `needsManualGrading = true`, `ExamSession.status = "GRADING"` and teachers must review and update `PracticeResult` manually.

---

## 9. Security

### 9.1 correctAnswer Stripping

`mapQuestion(q, false)` in `page.tsx` is the single choke-point:
- It runs in the RSC before React serialises props to the client bundle
- The spread is explicitly allowlisted (not `...q` spread), making accidental leakage impossible even if Prisma returns extra fields
- `explanation`, `explanationMediaUrl`, `explanationMediaType` are also stripped (they may hint at the correct answer)

### 9.2 Ownership Verification

Every mutating API endpoint follows this pattern:
```typescript
const examSession = await prisma.examSession.findUnique({ where: { id: sessionId } });
if (!examSession || examSession.userId !== session.user.id) {
  return NextResponse.json({ error: "Session not found" }, { status: 404 });
}
```

404 is returned rather than 403 to avoid disclosing session existence to unauthorised users.

### 9.3 Atomic Submit Claim

```typescript
const claimed = await prisma.examSession.updateMany({
  where: { id: sessionId, status: "DOING" },
  data: { status: "GRADING" },
});
if (claimed.count === 0) {
  return NextResponse.json({ error: "Session already submitted" }, { status: 409 });
}
```

This is a compare-and-swap at the database level. Even if two requests arrive simultaneously, only one will see `count > 0`. The second gets a 409 and the UI shows the existing result.

### 9.4 Rollback Pattern

```typescript
try {
  result = await prisma.practiceResult.create({ ... });
} catch {
  await prisma.examSession.update({ where: { id: sessionId }, data: { status: "DOING" } });
  return NextResponse.json({ error: "Failed to save results. Please try again." }, { status: 500 });
}
```

The session is restored to `DOING` so the student can retry submission without starting a new session.

---

## 10. Integrity

### 10.1 Tab Switch Detection

```typescript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setTabSwitchCount(prev => prev + 1);
});
```

- Runs only while `status === "DOING"`
- Count is sent to the server on every PATCH and stored on `ExamSession.tabSwitchCount`
- Teachers can inspect this field in the admin panel
- Does not automatically penalise the student (UI only shows a warning, not enforced disqualification)

### 10.2 Time Anomaly Detection (Server)

On each PATCH /save:
```
serverElapsed = (now - examSession.lastSavedAt) / 1000
clientTimeDelta = examSession.timeRemaining - incoming.timeRemaining
```

If `clientTimeDelta < 0` (client is claiming the clock went backwards) AND `serverElapsed > 2` (at least 2 seconds have genuinely passed):
```
adjustedTimeRemaining = max(0, examSession.timeRemaining - serverElapsed)
```

The adjusted value is stored and returned to the client, correcting any client-side clock manipulation.

### 10.3 beforeunload / localStorage Backup

On page unload:
1. `saveToLocalStorage()` runs synchronously (no async operations allowed in `beforeunload`)
2. Stores `{ answers, flagged, timeRemaining, currentPhaseIndex, lastSavedAt }`
3. On next session init, compared against server `lastSavedAt`; the newer copy wins

### 10.4 Copy/Paste Prevention

Applied at the `ExamShell` wrapper `<div>`:
```tsx
onContextMenu={(e) => e.preventDefault()}
onCopy={(e) => { if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") e.preventDefault(); }}
onCut={(e) => { ... same ... }}
onPaste={(e) => { ... same ... }}
style={{ userSelect: "none" }}
```

Carve-outs for `INPUT`/`TEXTAREA` allow students to type in gap-fill, cue-writing, and other text entry fields.

---

## 11. Styling & Responsive Design

### 11.1 CSS Custom Properties (Exam Theme)

All exam components use CSS custom properties for colours:

| Property | Default | Role |
|----------|---------|------|
| `--exam-primary` | `#5e35f1` | Primary purple |
| `--exam-surface` | `#fdf8fe` | Page background |
| `--exam-surface-low` | `#f7f2fa` | Subtle hover state |
| `--exam-surface-container` | `#f1ecf6` | Unanswered palette chips |
| `--exam-surface-highest` | `#e5e0ed` | Dividers, track |
| `--exam-on-surface` | `#33313a` | Primary text |
| `--exam-on-surface-variant` | `#777586` | Secondary text |

Utility classes:
- `exam-cta` — primary gradient button background
- `exam-ghost-border` — 1px border on answer option cards
- `exam-glass` — glassmorphism footer background

### 11.2 Breakpoints

| Context | Mobile | `sm` (640px+) | `md` (768px+) |
|---------|--------|--------------|--------------|
| Header padding | `px-4` | — | `px-8` |
| Breadcrumb | Last crumb | — | Full path |
| Footer nav labels | Hidden | Visible | — |
| Palette grid columns | 8 | 10 | — |
| Content max-width | Full | — | Constrained via `max-w-2xl` on review |
| Exam info cards | 2 columns | — | — |
| Resume stat cards | 3 columns | — | — |

### 11.3 Animation Classes

```css
/* Confetti — defined in globals.css or tailwind config */
@keyframes confetti-fall {
  to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
```

Framer Motion is used in `ResultsScreen` and `ExamEntryGate` for confetti particles and card entrance animations.

### 11.4 SVG Score Ring (ExamEntryGate — GRADED)

```
r = 58, C = 2π × 58 ≈ 364.4
strokeDasharray = C
strokeDashoffset = C - (C × score / 100)
```

The circle is rotated `-90deg` so the stroke starts at the top. The offset transition (`transition-all duration-1000 ease-out`) animates the ring fill on mount.

---

## 12. i18n Keys

All strings use `next-intl`. Namespace `"exam"` covers exam mode; namespace `"student"` covers practice mode.

### Namespace: `exam`

```
loadingExam, failedToLoad, checkConnection, retry
examNotAvailable, examNotAvailableDesc
reviewDetails, questions, timeLimit, parts, attempts, unlimited
examRules, ruleAutoSave, ruleFlagNav, ruleReview, ruleAutoSubmit
startExam, continueExam
resumeYourExam, remaining, answered, lastSaved
examSubmittedTitle, examSubmittedDesc, submitted
awaitingGrade, submittedAwaitingReview, backToTopic
resultExcellent, resultExcellentDesc, resultGood, resultGoodDesc, resultKeepGoing, resultKeepGoingDesc
yourScore, attempt (with params: current, max), viewFullResults, retakeExam, starting
readyForSubmission, reviewProgress
answeredCount (param: count), flaggedCount (param: count), unansweredCount (param: count)
reviewPart (param: part), attentionRequired, confirmSubmit
submitExam, submitting, questionsAnswered (params: answered, total)
saving, saved, savedAgo (param: seconds), savedMinAgo (param: minutes), offline
questionPalette, previous, next, review
typeYourAnswer
loadingExam, failedToLoad, checkConnection, retry
examSubmitted, awaitingReview, correct (used in result card)
```

### Namespace: `student`

```
(Practice mode strings — score, difficulty labels, confetti, etc.)
```

---

## 13. Error Handling

| Scenario | Layer | Behaviour |
|----------|-------|-----------|
| Not authenticated | RSC | `redirect("/login")` |
| Not enrolled | RSC | `notFound()` |
| No active test | RSC | `notFound()` |
| Session init fails | `useExamSession` | `status = "error"`, retry button triggers `window.location.reload()` |
| Auto-save fails | `useExamSession` | `saveStatus = "error"`, cloud-off icon in header; retried on next 3s tick |
| Submit network failure | `useExamSession` | `submittedRef = false`, `isSubmitting = false`; student can retry |
| PracticeResult create fails | Submit endpoint | Rollback `status = "DOING"`, 500 with user-facing message |
| Double submit (race) | Submit endpoint | 409 Conflict; client shows existing result |
| `advancedData` parse error | `QuestionRenderer` | `try/catch` returns `null`; component falls through to MCQ default |
| Missing grading data | `isQuestionCorrect` | `if (!selectedAnswer) return false` |
| Notification creation fails | Submit endpoint | `try/catch` silently ignored |

---

## 14. Performance Considerations

### 14.1 Server Component Data Loading
- The RSC runs two sequential Prisma queries for enrollment + test, plus one more for exam mode (ExamSession)
- These are not parallelised because the test query depends on `topicId` from `params` (same request)
- No `fetch()` calls, no external APIs — all local Prisma

### 14.2 Client Initialisation
- `useExamPhases` is `useMemo`-wrapped; rebuilds only when inputs change (effectively once per mount)
- `useExamSession` POSTs on mount; subsequent renders do not re-run the init effect (dep `[practiceTestId]`)
- The 3s auto-save interval has stable deps via refs — no teardown/re-registration on answer changes

### 14.3 Answer Shuffle
- The deterministic hash shuffle runs in O(n) per question on first render and is memoised per question via `useMemo` in `QuestionRenderer`
- Deps are individual option values (`rawOpts[0..3]`) rather than the array object to avoid referential equality issues

### 14.4 Question Palette Rendering
- Palette is rendered lazily (only when `paletteOpen = true`)
- Each button is a simple `<button>` with class computation; no virtualisation needed (<100 questions typical)

### 14.5 Media
- Practice mode: `useMediaPreloader` preloads next question's media as a side effect
- Exam mode: `AudioPlayer` instances are mounted lazily per question, managed by `useAudioManager` to enforce single-playback

### 14.6 Bundle
- `ExamShell` and all exam components are already client components; no dynamic imports needed
- `motion/react` (Framer Motion) is used selectively — only `ResultsScreen` and `ExamEntryGate` import it; the exam shell itself does not (keeping the main exam path lighter)
