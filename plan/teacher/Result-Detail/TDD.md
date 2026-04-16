# TDD: Teacher Result Detail & Grading

**Routes:**
- Full page: `/teacher/student-results/[resultId]`
- Modal: `ResultDetailModal` (overlay from listing page)
- Grade by Question: `GradeByQuestion` (modal from practice-test detail page)

**Components:**
- `src/app/teacher/student-results/[resultId]/page.tsx`
- `src/components/teacher/ResultDetailModal.tsx`
- `src/components/teacher/GradeByQuestion.tsx`
- `src/components/teacher/ResultCommentSection.tsx`

**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture

### Rendering Strategy

The feature is split across three rendering contexts:

**1. Full detail page** — React Server Component (RSC). Authenticates, fetches all result data via Prisma in a single query, renders a static read-only summary with `ResultCommentSection` as a client island for comment posting.

**2. ResultDetailModal** — Pure client component (`"use client"`). Fetches via REST API on mount. Manages all grading interactions locally, persisting to the API with individual PATCH calls per answer. Lives in `StudentResultsTable` state (`selectedResultId`).

**3. GradeByQuestion** — Pure client component (`"use client"`). Question-centric view: fetches all submissions for one question at a time. Keyboard-driven navigation. Lives as a modal triggered from the Practice Test detail page.

### File Responsibilities

| File | Role |
|------|------|
| `src/app/teacher/student-results/[resultId]/page.tsx` | RSC: auth, Prisma fetch, static read-only answer table, mounts `ResultCommentSection` |
| `src/app/teacher/student-results/[resultId]/loading.tsx` | Suspense skeleton for the full detail page |
| `src/components/teacher/ResultDetailModal.tsx` | Client: full grading interface as a modal; fetches, grades, comments, marks as graded |
| `src/components/teacher/GradeByQuestion.tsx` | Client: cross-student question grading modal; keyboard navigation |
| `src/components/teacher/ResultCommentSection.tsx` | Client: teacher comment display + compose form; used on full detail page |
| `src/components/ModalOverlay.tsx` | Generic overlay: backdrop, ESC close, click-outside close |
| `src/components/Tooltip.tsx` | Tooltip for tab-switch indicator in the listing |
| `src/app/api/teacher/student-results/[resultId]/route.ts` | `GET` — fetch full result detail for the modal |
| `src/app/api/teacher/student-results/[resultId]/comments/route.ts` | `POST` — add teacher comment to a result |
| `src/app/api/exam-session/[sessionId]/route.ts` | `PATCH` — grade answers + optional `markAsGraded` |
| `src/app/api/teacher/practice-tests/[testId]/answers-by-question/route.ts` | `GET` — all submissions for one question across all students |
| `src/lib/prisma.ts` | Singleton Prisma client |
| `src/lib/auth.ts` | `auth()` — NextAuth server session helper |

---

## Route & Data Flow

### Full Detail Page

```
Browser GET /teacher/student-results/[resultId]
  → TeacherLayout (RSC): auth() → redirect("/login") | role guard → redirect("/topics")
  → StudentResultDetailPage (RSC):
      ├── auth() (second check in page component)
      ├── await params → { resultId }
      ├── getTranslations("teacher")
      ├── prisma.practiceResult.findUnique({
      │     where: { id: resultId },
      │     include: { user, practiceTest (+ topic + language + questions), studentAnswers (+ question), comments (+ user) }
      │   })
      ├── if (!result) → notFound()
      ├── Derive: initials, score color class
      └── Return JSX → streamed HTML
            └── ResultCommentSection (Client island)
                  └── POST /api/teacher/student-results/{resultId}/comments
                  └── router.refresh() on success
```

### ResultDetailModal Flow

```
StudentResultsTable: selectedResultId set → ResultDetailModal mounts
  └── useEffect: fetchDetail()
        └── GET /api/teacher/student-results/{resultId}
              → auth + role check + teacher-scope check
              → prisma.practiceResult.findUnique (full include)
              → returns ResultDetail shape
        └── setData(ResultDetail)

Teacher expands row → setExpandedAnswer(answerId)
Teacher changes grading controls → setGradingStates (local state only)
Teacher clicks Save →
  → PATCH /api/exam-session/{sessionId}/grade
        { grades: [{ studentAnswerId, teacherOverride, teacherScore, teacherComment }] }
  → API: verify teacher-student relationship
  → UPDATE student_answers SET teacher_override=..., teacher_score=..., teacher_comment=..., teacher_graded_at=now()
  → fetchDetail() (re-fetch to sync)
  → setExpandedAnswer(null)

Teacher clicks "Mark as Graded" →
  → PATCH /api/exam-session/{sessionId}/grade { markAsGraded: true, grades: [] }
  → API: UPDATE exam_sessions SET status='GRADED'
  → API: recalculate PracticeResult.score from current studentAnswers
  → fetchDetail()

Teacher posts comment →
  → POST /api/teacher/student-results/{resultId}/comments { content }
  → INSERT into comments
  → fetchDetail()
```

### GradeByQuestion Flow

```
PracticeTestDetailPage (teacher): "Grade by Question" button clicked
  → GradeByQuestion modal mounts with { testId }

questionNumber state: 1

useEffect [testId, questionNumber]:
  → fetchData()
        → GET /api/teacher/practice-tests/{testId}/answers-by-question?questionNumber={n}
              → auth + role check + teacher ownership of test
              → prisma.question.findFirst({ where: { practiceTestId, questionNumber: n } })
              → prisma.studentAnswer.findMany({
                    where: { question: { practiceTestId, questionNumber: n }, user: { in: teacherStudentIds } },
                    include: { user, practiceResult: { include: { examSession } } }
                })
              → returns { question, totalQuestions, testTitle, submissions[] }
        → setQuestion, setSubmissions, setTotalQuestions, setTestTitle
        → setGrades({}) (clear pending local state)

Teacher grades submission:
  → setGrades({ [studentAnswerId]: { override, score, comment } }) (local only)
  → Save →
        → PATCH /api/exam-session/{sessionId}/grade { grades: [{ ... }] }
        → fetchData() (re-fetch current question)

Keyboard navigation:
  ArrowLeft → setQuestionNumber(n - 1) (if n > 1)
  ArrowRight → setQuestionNumber(n + 1) (if n < totalQuestions)
```

---

## Component Tree

### Full Detail Page

```
TeacherLayout (RSC)
  └── TeacherShell (Client) → Sidebar + content
        └── StudentResultDetailPage (RSC)
              ├── [back link] → /teacher/student-results
              ├── [header]
              │     ├── [avatar circle]  initials + bg-[#e3dfff]
              │     ├── [name + email]
              │     └── [language chip]
              ├── [stat grid] 2×2 → 1×4
              │     ├── Test name card
              │     ├── Topic card
              │     ├── Score card (color-coded)
              │     └── Date card
              ├── [answer details table]
              │     ├── <thead>: # | Question | Student Answer | Correct Answer | Result
              │     └── <tbody>: [answer rows] × N
              │           ├── Q{n}
              │           ├── question.content
              │           ├── selectedAnswer (color-coded)
              │           ├── question.correctAnswer
              │           └── check_circle / cancel icon
              └── ResultCommentSection (Client)
                    ├── [comment list] × N
                    └── [compose textarea + send button]
```

### ResultDetailModal

```
ModalOverlay (Client) panelClass="max-w-4xl"
  └── bg-[#f8f9ff] scrollable container
        └── ResultDetailModal (Client)
              ├── [close button] sticky top
              ├── [loading spinner]       (conditional: loading)
              ├── [error state]           (conditional: !loading && !data)
              └── [content]              (conditional: data)
                    ├── [header]
                    │     ├── [avatar + name + email]
                    │     └── [language chip]
                    ├── [stat grid] 2×2 → 1×4
                    ├── [tab switch warning]   (conditional: tabSwitchCount > 0)
                    ├── [answer details section]
                    │     ├── [section header]
                    │     │     ├── "Needs review" checkbox
                    │     │     └── "Mark as Graded" button  (conditional: sessionStatus === "GRADING")
                    │     └── <table> (with overflow-x-auto)
                    │           ├── <thead>: # | Question | Student Answer | Correct Answer | Result | chevron
                    │           └── <tbody>: [answer rows] × N (filtered by showManualOnly)
                    │                 ├── [main row] → onClick: setExpandedAnswer
                    │                 │     ├── Q{n}
                    │                 │     ├── content (with media type icon if contentMediaType set)
                    │                 │     ├── selectedAnswer (truncated 30 chars, color-coded)
                    │                 │     ├── correctAnswer (truncated 30 chars)
                    │                 │     ├── effectiveCorrect icon (teacherOverride ?? isCorrect)
                    │                 │     └── expand chevron
                    │                 └── [expanded grading panel]  (conditional: expandedAnswer === a.id)
                    │                       ├── previous feedback display  (conditional: a.teacherComment)
                    │                       ├── "Correct" / "Incorrect" toggle buttons
                    │                       ├── score slider  (conditional: CUE_WRITING)
                    │                       ├── comment input
                    │                       └── Save button
                    └── [feedback section]
                          ├── [comment list] × N
                          └── [compose textarea + send button]
```

### GradeByQuestion

```
[fixed overlay]
  └── [modal panel] w-full max-w-4xl max-h-[90vh] flex flex-col
        ├── [header] sticky
        │     ├── "Grade by Question" title + testTitle
        │     ├── Q{n} / {total} indicator
        │     └── [close button]
        ├── [question band]  (conditional: question && !loading)
        │     ├── [type + submission count label]
        │     ├── [question content]
        │     └── [correct answer]
        ├── [scrollable submissions list]
        │     ├── [loading spinner]   (conditional: loading)
        │     ├── [empty state]       (conditional: !loading && submissions.length === 0)
        │     └── [submission cards] × N
        │           ├── [student avatar + name]
        │           ├── [effectiveCorrect icon]
        │           ├── [answer text block]
        │           ├── [previous comment display]  (conditional: sub.teacherComment && !grade.comment)
        │           └── [grading controls]
        │                 ├── "Correct" / "Incorrect" toggle buttons
        │                 ├── score slider  (conditional: CUE_WRITING)
        │                 ├── comment input
        │                 └── Save button
        └── [footer navigation]
              ├── Previous button (disabled if Q1)
              ├── "Use ← → arrow keys to navigate" hint
              └── Next button (disabled if Q{totalQuestions})
```

---

## Database Queries

### GET /api/teacher/student-results/[resultId]

```typescript
// Teacher scope verification
const studentIds = await getTeacherStudentIds(session.user.id);

const result = await prisma.practiceResult.findUnique({
  where: { id: resultId },
  include: {
    user: { select: { name: true, email: true } },
    practiceTest: {
      include: {
        topic: { include: { language: { select: { name: true, code: true } } } },
      },
    },
    studentAnswers: {
      include: {
        question: {
          select: {
            questionNumber: true,
            content: true,
            questionType: true,
            correctAnswer: true,
            contentMediaUrl: true,
            contentMediaType: true,
            difficulty: true,
          },
        },
      },
      orderBy: { question: { questionNumber: "asc" } },
    },
    comments: {
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    },
    examSession: {
      select: { id: true, status: true, attemptNumber: true, tabSwitchCount: true },
    },
  },
});

// Verify teacher can access this result
if (!result || !studentIds.includes(result.userId)) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

Tables: `practice_results`, `users`, `practice_tests`, `topics`, `languages`, `student_answers`, `questions`, `comments`, `exam_sessions`.

### PATCH /api/exam-session/[sessionId]/grade

```typescript
// Verify teacher owns a class with this session's student
const session_record = await prisma.examSession.findUnique({
  where: { id: sessionId },
  select: { id: true, userId: true, practiceResultId: true, status: true },
});
if (!session_record || !studentIds.includes(session_record.userId)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// Grade each answer
for (const grade of grades) {
  await prisma.studentAnswer.update({
    where: { id: grade.studentAnswerId },
    data: {
      ...(grade.teacherOverride !== undefined && { teacherOverride: grade.teacherOverride }),
      ...(grade.teacherScore !== undefined && { teacherScore: grade.teacherScore }),
      ...(grade.teacherComment !== undefined && { teacherComment: grade.teacherComment }),
      teacherGradedAt: new Date(),
    },
  });
}

// Mark as graded + recalculate score
if (markAsGraded) {
  const allAnswers = await prisma.studentAnswer.findMany({
    where: { practiceResultId: session_record.practiceResultId },
    select: { isCorrect: true, teacherOverride: true },
  });
  const correctCount = allAnswers.filter(
    (sa) => sa.teacherOverride !== null ? sa.teacherOverride : sa.isCorrect
  ).length;
  const totalQuestions = allAnswers.length;
  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  await prisma.$transaction([
    prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "GRADED" },
    }),
    prisma.practiceResult.update({
      where: { id: session_record.practiceResultId },
      data: { score, correctCount },
    }),
  ]);
}
```

### GET /api/teacher/practice-tests/[testId]/answers-by-question

```typescript
const question = await prisma.question.findFirst({
  where: { practiceTestId: testId, questionNumber },
  select: { id: true, questionNumber: true, content: true, questionType: true, correctAnswer: true },
});

const totalQuestions = await prisma.question.count({ where: { practiceTestId: testId } });

const answers = await prisma.studentAnswer.findMany({
  where: {
    question: { practiceTestId: testId, questionNumber },
    userId: { in: studentIds },
  },
  include: {
    user: { select: { name: true, id: true } },
    practiceResult: {
      include: {
        examSession: { select: { id: true, status: true, attemptNumber: true } },
      },
    },
  },
  orderBy: { answeredAt: "asc" },
});
```

Tables: `questions`, `student_answers`, `users`, `practice_results`, `exam_sessions`.

### POST /api/teacher/student-results/[resultId]/comments

```typescript
await prisma.comment.create({
  data: {
    practiceResultId: resultId,
    userId: session.user.id,
    content,
  },
});
```

Table: `comments`.

---

## API Endpoints

### GET /api/teacher/student-results/[resultId]

**Auth:** Session required, `role === "TEACHER"`, result must belong to teacher's student.

**Response shape:**
```typescript
{
  id: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;        // ISO 8601
  student: { name: string; email: string };
  testName: string;
  topicName: string;
  language: string;
  sessionId: string | null;
  sessionStatus: "DOING" | "GRADING" | "GRADED" | null;
  tabSwitchCount: number;
  answers: {
    id: string;
    questionNumber: number;
    content: string;
    questionType: string;
    contentMediaUrl: string | null;
    contentMediaType: string | null;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number | null;
    teacherOverride: boolean | null;
    teacherScore: number | null;
    teacherComment: string | null;
    teacherGradedAt: string | null;
  }[];
  comments: {
    id: string;
    content: string;
    userName: string;
    createdAt: string;
  }[];
}
```

### PATCH /api/exam-session/[sessionId]/grade

**Auth:** Session required, `role === "TEACHER"`, teacher must have the session's student in a class.

**Request body:**
```typescript
{
  grades: {
    studentAnswerId: string;
    teacherOverride?: boolean | null;
    teacherScore?: number | null;   // 0–1 float
    teacherComment?: string;
  }[];
  markAsGraded?: boolean;
}
```

**Response:** `{ success: true }` or `{ error: string }`.

### POST /api/teacher/student-results/[resultId]/comments

**Auth:** Session required, `role === "TEACHER"`.

**Request body:** `{ content: string }`

**Response:** `{ id: string; content: string; userName: string; createdAt: string }` or `{ error: string }`.

### GET /api/teacher/practice-tests/[testId]/answers-by-question

**Auth:** Session required, `role === "TEACHER"`, teacher must own the test.

**Query params:** `?questionNumber={n}` (1-indexed integer)

**Response:**
```typescript
{
  question: {
    id: string;
    questionNumber: number;
    content: string;
    questionType: string;
    correctAnswer: string;
  } | null;
  totalQuestions: number;
  testTitle: string;
  submissions: {
    studentAnswerId: string;
    studentName: string;
    studentId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    teacherOverride: boolean | null;
    teacherScore: number | null;
    teacherComment: string | null;
    sessionId: string | null;
    sessionStatus: string | null;
    attemptNumber: number;
  }[];
}
```

---

## State Management

### StudentResultDetailPage (RSC)
No client state. All data resolved server-side. `ResultCommentSection` manages its own form state locally.

### ResultCommentSection (Client)
| Variable | Type | Description |
|----------|------|-------------|
| `content` | `string` | Textarea value |
| `posting` | `boolean` | Spinner state during POST |

### ResultDetailModal (Client)
| Variable | Type | Description |
|----------|------|-------------|
| `data` | `ResultDetail \| null` | Full result detail from API |
| `loading` | `boolean` | Fetch state |
| `feedbackContent` | `string` | Comment textarea value |
| `posting` | `boolean` | Spinner state during comment POST |
| `expandedAnswer` | `string \| null` | Currently expanded row ID |
| `gradingStates` | `Record<answerId, GradeState>` | Per-answer pending changes (not yet saved) |
| `showManualOnly` | `boolean` | "Needs review" filter toggle |

`GradeState`:
```typescript
type GradeState = {
  override?: boolean | null;
  score?: number | null;
  comment?: string;
  saving?: boolean;
}
```

`gradingStates` is local-only. On every successful save or `fetchDetail()` call, the saved state is reflected in the fresh `data` from the API. The local `gradingStates` entry for that answer is not cleared until `expandedAnswer` is set to `null` — this preserves the panel's UI state if the teacher continues editing after a save.

### GradeByQuestion (Client)
| Variable | Type | Description |
|----------|------|-------------|
| `questionNumber` | `number` | Current question (1-indexed) |
| `totalQuestions` | `number` | Total questions in test |
| `testTitle` | `string` | Test display name |
| `question` | `QuestionData \| null` | Current question data |
| `submissions` | `Submission[]` | All student answers for current question |
| `loading` | `boolean` | Fetch state |
| `grades` | `Record<studentAnswerId, GradeState>` | Per-submission pending changes |

`grades` is cleared on every `fetchData()` call (i.e., on every question navigation and after every save). This is intentional — pending changes on one question are not carried over when navigating away.

---

## Styling

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Page/modal bg | `#f8f9ff` | Modal inner bg, expanded panel bg |
| Card bg | `#ffffff` | Stat cards, table container, comment section |
| Card shadow (full page) | `0px_20px_40px_rgba(18,28,42,0.04)` | Full page stat cards |
| Card shadow (modal) | `0px_10px_20px_rgba(18,28,42,0.04)` | Modal stat cards |
| Avatar bg | `#e3dfff` | Student initials circle |
| Avatar text | `#2a14b4` | Student initials |
| Language chip bg | `#a6f2d1` at 40% | Language chip |
| Language chip text | `#1b6b51` | Language chip |
| Score green | `#1b6b51` | ≥ 80% |
| Score purple | `#2a14b4` | 50–79% |
| Score red | `#7b0020` | < 50% |
| Tab switch warning bg | `#fef3c7` at 50% | Alert strip |
| Tab switch warning text | `#92400e` | Alert text + icon |
| CUE_WRITING pending left border | `#f59e0b` | `border-l-[#f59e0b]` |
| Override: Correct active | `#1b6b51` bg + white text | Selected override button |
| Override: Incorrect active | `#7b0020` bg + white text | Selected override button |
| Override: Correct inactive | `#a6f2d1` 30% + `#1b6b51` text | Unselected override button |
| Override: Incorrect inactive | `#ffdada` 30% + `#7b0020` text | Unselected override button |
| Save button | `#2a14b4` bg + white text | Grade save button |
| Save button hover | `#4338ca` | Grade save hover |
| Range slider accent | `#2a14b4` | `accent-[#2a14b4]` |
| Row divider | `#c7c4d7` at 10–15% | Table `divide-y` and `border-b` |
| Header bg (table) | `#eff4ff` at 50% | `<thead>` |
| Header text (table) | `#464554` at 70% | Column labels |
| Correct answer text | `#1b6b51` | `correctAnswer` cell |
| Incorrect answer text | `#7b0020` | `selectedAnswer` cell when wrong |
| Previous feedback text | `#464554` | Italic feedback display |
| GradeByQuestion correct answer label | `#1b6b51` | Answer key display |
| Submission card bg (default) | `#f8f9ff` | GradeByQuestion card |
| Submission card bg (pending CUE_WRITING) | `#fef3c7` at 20% | GradeByQuestion unreviewed card |
| Nav button text | `#777586` | Previous/Next nav buttons |
| Nav hint text | `#777586` | "Use ← → arrow keys" hint |

### effectiveCorrect Logic in Render

```typescript
const effectiveCorrect = a.teacherOverride !== null && a.teacherOverride !== undefined
  ? a.teacherOverride
  : a.isCorrect;
```

Used to determine: icon (`check_circle` vs `cancel`), icon color, and row hover tint.

---

## i18n Keys

### Namespace: `"teacher"`

| Key | Value (en) | Usage |
|-----|-----------|-------|
| `backToResults` | "Back to Results" | Back link on full detail page |
| `testNameCol` | "Test" | Stat card label |
| `topicCol` | "Topic" | Stat card label |
| `scoreCol` | "Score" | Stat card label |
| `submittedDate` | "Submitted" | Stat card label |
| `answerDetails` | "Answer Details" | Table section header |
| `question` | "Question" | Column header |
| `studentAnswer` | "Student Answer" | Column header |
| `correctAnswer` | "Correct Answer" | Column header |
| `resultCol` | "Result" | Column header |
| `correctCol` | "Correct" | Used in correct count subtitle |
| `teacherFeedback` | "Teacher Feedback" | Comment section header |
| `addFeedback` | "Add Feedback" | Comment textarea placeholder + button |
| `commentPosted` | "Comment posted" | Toast success |
| `commentFailed` | "Failed to post comment" | Toast error |
| `noResults` | "No results found" | Modal empty state |

### Hardcoded Strings (future i18n migration)

| Current text | Suggested key | Namespace |
|-------------|---------------|-----------|
| "Mark as Graded" | `teacher.markAsGraded` | `teacher` |
| "Needs review" (filter checkbox) | `teacher.needsReview` | `teacher` |
| "Grade saved" | `teacher.gradeSaved` | `teacher` |
| "Failed to save grade" | `teacher.gradeFailed` | `teacher` |
| "Marked as graded" | `teacher.markedAsGraded` | `teacher` |
| "Failed to mark as graded" | `teacher.markAsGradedFailed` | `teacher` |
| "Correct" (override button) | `teacher.correct` | `teacher` |
| "Incorrect" (override button) | `teacher.incorrect` | `teacher` |
| "Score:" (slider label) | `teacher.scoreLabel` | `teacher` |
| "Add comment..." (placeholder) | `teacher.addComment` | `teacher` |
| "Previous:" (past feedback prefix) | `teacher.previousFeedback` | `teacher` |
| "Grade by Question" (modal title) | `teacher.gradeByQuestion` | `teacher` |
| "No submissions for this question" | `teacher.noSubmissions` | `teacher` |
| "Use ← → arrow keys to navigate" | `teacher.arrowKeyHint` | `teacher` |
| "Open full page" (modal link) | `teacher.openFullPage` | `teacher` |

---

## Error Handling

### Full Detail Page

| Error scenario | Handling |
|---------------|---------|
| `resultId` not found in DB | `notFound()` → Next.js 404 page |
| Unauthenticated request | `redirect("/login")` |
| Not a teacher | `redirect("/topics")` |
| Prisma throws | Uncaught → `src/app/error.tsx` error boundary |
| `result.examSession` is null | `sessionId` and grading controls not rendered; comment section still works |

### ResultDetailModal

| Error scenario | Handling |
|---------------|---------|
| `GET /api/teacher/student-results/{id}` returns 404 | `data` remains `null`; modal shows `t("noResults")` empty state |
| `GET` fetch throws (network) | Same — silent catch, empty state |
| `PATCH /grade` returns error | `toast.error("Failed to save grade")`; `saving` flag reset; panel stays open for retry |
| `PATCH /grade` attempted without `sessionId` | Guard: `toast.error("Cannot save grade: no exam session linked to this result")`; no PATCH sent |
| Comment POST fails | `toast.error(t("commentFailed"))`; `posting` reset; textarea content preserved |
| `markAsGraded` PATCH fails | `toast.error("Failed to mark as graded")`; status display not updated |

### GradeByQuestion

| Error scenario | Handling |
|---------------|---------|
| `GET /answers-by-question` fails | Silent catch; `loading` reset; submissions remain empty or stale |
| `PATCH /grade` attempted without `sessionId` | `toast.error("Cannot save: no exam session found for this result")`; no PATCH sent |
| `PATCH /grade` returns error | `toast.error("Failed to save")`; `saving` flag reset |
| ArrowLeft/Right on first/last question | Buttons and keyboard events are both guarded by `questionNumber > 1` and `questionNumber < totalQuestions` |

---

## Performance

### Query Optimization Roadmap

| Item | Priority | Implementation |
|------|----------|---------------|
| Add index on `(practice_result_id)` for `student_answers` | Medium | Covered by FK constraint; verify in DB |
| Add index on `(question_id, practice_test_id)` for answers-by-question query | Medium | `@@index([questionId])` on `StudentAnswer` |
| Run `getTeacherStudentIds` result in `unstable_cache` | Low | Cache with `["teacher-students", teacherId]` tag, 60s TTL |
| Batch grade saves (send all pending changes for a result at once) | Low | Add "Save all" in ResultDetailModal; accumulate in `gradingStates` |
| Recalculate score server-side in a single transaction | Already implemented | `prisma.$transaction` in PATCH endpoint |

### Client-Side Performance

- `fetchDetail` is `useCallback`-memoized in `ResultDetailModal` to prevent closure recreation.
- `gradingStates` is a `Record<string, GradeState>` updated with functional setter `(prev) => ({ ...prev, [id]: ... })` to avoid unnecessary re-renders of unchanged rows.
- `showManualOnly` filter is a pure client-side filter over `data.answers` — no API call, instant response.
- GradeByQuestion's `setGrades({})` on every question change prevents stale state accumulation and keeps memory usage bounded.

### Streaming Opportunity (Full Detail Page)

The full detail page makes one Prisma query with ~7 joins. If the query becomes slow (e.g., 200+ student answers), consider:

```tsx
// Candidate structure for future streaming
<Suspense fallback={<StatGridSkeleton />}>
  <ResultStatGrid resultId={resultId} />   {/* lighter query: just result + user */}
</Suspense>
<Suspense fallback={<AnswerTableSkeleton />}>
  <AnswerTableServer resultId={resultId} /> {/* heavier query: studentAnswers + questions */}
</Suspense>
```

This allows the stat header to paint immediately while the answer table (the bulk of the data) streams in.

### Bundle Notes

`ResultDetailModal` and `GradeByQuestion` are both `"use client"` components. They are imported by:
- `StudentResultsTable` → `ResultDetailModal`
- Practice test detail page → `GradeByQuestion`

If `ResultDetailModal` is rarely opened (teacher stays on the full detail page), the listing page bundle can be trimmed with:
```typescript
const ResultDetailModal = dynamic(
  () => import("@/components/teacher/ResultDetailModal"),
  { ssr: false }
);
```
This defers the modal code until the teacher first clicks a result row.
