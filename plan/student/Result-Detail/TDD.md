# TDD: Student Result Detail Page

**Route:** `/results/[resultId]`
**Component:** `src/app/(student)/results/[resultId]/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture

### Rendering Strategy
`StudentResultDetailPage` is a **React Server Component** (RSC). It runs exclusively on the server: authenticates the session, fetches result data via Prisma, computes all analytics (difficulty, type, time) inline, and returns a fully-rendered HTML tree. No client-side fetching.

One exception: the **confetti animation**. Confetti requires `useEffect` and `useState`, which are client-only APIs. In the current implementation, the confetti block is conditionally rendered within the server page and uses `motion/react` animations — this works in the App Router because `motion/react` is compatible with RSCs as a boundary. However, if additional client interactivity is added to the page, those additions must be extracted into `"use client"` leaf components.

The `motion/react` library (`framer-motion` fork) is used only for confetti particles on this page. No other animations are present in the server-rendered output.

### File Responsibilities

| File | Role |
|------|------|
| `src/app/(student)/results/[resultId]/page.tsx` | RSC: auth guard, two DB queries, server-side analytics computation, full render |
| `src/app/(student)/layout.tsx` | Layout guard, `StudentNavbar`, shell |
| `src/lib/auth.ts` | `auth()` — NextAuth server session helper |
| `src/lib/prisma.ts` | Singleton Prisma client |
| `src/components/student/ResultsScreen.tsx` | Used in practice mode post-submission — **not used on this page**. The detail page reimplements the score hero directly in JSX. |
| `motion/react` | Confetti particle animation (client-side, leaf usage) |

---

## Route & Data Flow

```
Browser GET /results/[resultId]
  → Next.js dynamic segment: params.resultId resolved
  → StudentLayout: auth() → redirect("/login") if no session
  → StudentResultDetailPage:
      ├── auth() → redirect("/login") if no session
      ├── await params → { resultId }
      ├── getTranslations("student") → i18n function
      ├── prisma.practiceResult.findUnique({ where: { id: resultId, userId } })
      │     includes: practiceTest, studentAnswers (+ questions), comments, examSession
      ├── if (!result) → notFound()
      ├── server-side analytics computation:
      │     ├── byDifficulty[]      — group answers by question.difficulty
      │     ├── typeMap             — Map<questionType, {correct, total}>
      │     └── timeBySection       — Map<sectionId, {label, time}>
      ├── prisma.practiceResult.findMany(allAttempts for this test + user)
      └── Returns JSX → streamed HTML
```

No API route is consumed. The REST API at `GET /api/student/results/[resultId]` mirrors this data access pattern and is the correct endpoint for any future client-side or mobile use.

---

## Component Tree

```
StudentLayout (RSC)
  └── StudentNavbar (Client)
  └── <main>
        └── StudentResultDetailPage (RSC)
              ├── [back link]                     → /results (Link)
              │
              ├── [score hero]
              │     ├── [confetti overlay]         (motion.div × 40 — conditional, score >= 80)
              │     ├── [test title h1]
              │     ├── [topic + attempt subtitle]
              │     ├── [score percentage]         (color-coded)
              │     └── [correct/total fraction]
              │
              ├── [difficulty breakdown panel]     (conditional: byDifficulty.length > 1)
              │     └── [3-col grid] × N
              │
              ├── [question type panel]            (conditional: typeMap.size > 1)
              │     └── [type rows] × N
              │
              ├── [time distribution panel]        (conditional: totalTimeSpent > 0 && timeBySection.size > 1)
              │     └── [bar rows] × N
              │
              ├── [attempt history panel]          (conditional: allAttempts.length > 1)
              │     └── [attempt rows] × N         (current highlighted)
              │
              ├── [answer review panel]
              │     └── [answer rows] × N
              │           ├── [numbered circle]    (green/red)
              │           ├── [question content]
              │           ├── [student answer]     (color-coded)
              │           ├── [correct answer]     (conditional: isGraded && !effectiveCorrect)
              │           ├── [teacher comment]    (conditional: teacherComment != null)
              │           └── [explanation]        (conditional: isGraded && explanation != null)
              │
              ├── [teacher comments panel]         (conditional: result.comments.length > 0)
              │     └── [comment rows] × N
              │
              └── [back to topic button]           → /topics/[topicId] (Link)
```

---

## Database Queries

### Query 1 — Primary Result Fetch

```typescript
prisma.practiceResult.findUnique({
  where: { id: resultId, userId: session.user.id },
  include: {
    practiceTest: {
      select: { id: true, title: true, topicId: true, topic: { select: { title: true } } },
    },
    studentAnswers: {
      include: {
        question: {
          select: {
            questionNumber: true,
            content: true,
            questionType: true,
            correctAnswer: true,   // ⚠ gated: only sent to client if isGraded
            explanation: true,     // ⚠ gated: same
            difficulty: true,
            sectionId: true,
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
      select: { status: true, attemptNumber: true, gradedAt: true },
    },
  },
})
```

**Security note:** `correctAnswer` is fetched from the database in all cases (it's needed by the server for the `isGraded` conditional logic), but it is only included in the rendered JSX when `isGraded === true && !effectiveCorrect`. It is never serialized into a client-visible data attribute or sent as a JSON prop to a client component.

**Tables touched:** `practice_results`, `practice_tests`, `topics`, `student_answers`, `questions`, `comments`, `users` (for comment user), `exam_sessions`.

**Performance:** ~8 table joins for a full result with many answers. For a 60-question test, the `studentAnswers` include fetches 60 rows with joined question data. Expected: < 150ms on a warm connection.

### Query 2 — Attempt History

```typescript
prisma.practiceResult.findMany({
  where: {
    userId: session.user.id,
    practiceTestId: result.practiceTest.id,
  },
  orderBy: { completedAt: "asc" },
  select: {
    id: true,
    score: true,
    completedAt: true,
    examSession: { select: { attemptNumber: true } },
  },
})
```

**Row count:** Bounded by `maxAttempts` on the `PracticeTest`. Default max is 1; most results will have 1–3 rows.

**Performance:** < 10ms. Lightweight select-only query.

**Optimization opportunity:** These two queries are currently sequential. Wrapping them in `Promise.all` would reduce total DB time by the RTT of the second query:
```typescript
const [result, allAttempts] = await Promise.all([
  prisma.practiceResult.findUnique(...),
  prisma.practiceResult.findMany(...),
])
```
Note: `notFound()` must still be checked after the first resolves.

---

## Server-Side Analytics Computation

All analytics are computed inline in the RSC before the JSX return. No client-side computation is needed.

### Difficulty Breakdown

```typescript
const byDifficulty = [1, 2, 3].map((d) => {
  const qs = result.studentAnswers.filter((sa) => (sa.question.difficulty ?? 1) === d);
  const correct = qs.filter((sa) => sa.isCorrect).length;
  return { level: d, label: d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard", total: qs.length, correct };
}).filter((d) => d.total > 0);
```

- Complexity: O(n) where n = number of student answers.
- `difficulty ?? 1`: defaults to Easy (1) when difficulty is not set on a question.
- Panel hidden when `byDifficulty.length <= 1`.

### Question Type Performance

```typescript
const typeMap = new Map<string, { correct: number; total: number }>();
result.studentAnswers.forEach((sa) => {
  const type = sa.question.questionType;
  if (!typeMap.has(type)) typeMap.set(type, { correct: 0, total: 0 });
  const entry = typeMap.get(type)!;
  entry.total++;
  if (sa.isCorrect) entry.correct++;
});
```

- Complexity: O(n).
- Keys are `QuestionType` enum values: `MULTIPLE_CHOICE`, `GAP_FILL`, `REORDER_WORDS`, `CUE_WRITING`, `PRONUNCIATION`, `STRESS`, `CLOZE_PASSAGE`, `TRUE_FALSE`, `MATCHING`, `WORD_BANK`.
- Display name: `type.replace(/_/g, " ")`.
- Panel hidden when `typeMap.size <= 1`.

### Time Distribution

```typescript
const timeBySection = new Map<string, { label: string; time: number }>();
let totalTimeSpent = 0;
result.studentAnswers.forEach((sa) => {
  const time = sa.timeSpent || 0;
  totalTimeSpent += time;
  const sectionKey = sa.question.sectionId || "general";
  if (!timeBySection.has(sectionKey)) {
    timeBySection.set(sectionKey, {
      label: sectionKey === "general" ? "General" : "Section",
      time: 0,
    });
  }
  timeBySection.get(sectionKey)!.time += time;
});
```

- `timeSpent` is in seconds (stored as `Int?`).
- Display unit: minutes (`Math.round(time / 60)m`).
- Bar width: `Math.round((data.time / totalTimeSpent) * 100)%`.
- Panel hidden when `totalTimeSpent === 0 || timeBySection.size <= 1`.
- Known limitation: section labels default to `"Section"` for non-general groups. The `sectionId` could be resolved to a proper section title via an additional join on `TestSection`, but this is not currently implemented to avoid query complexity.

---

## API Dependencies

The page does **not** call any API routes. Direct Prisma access.

### REST API Documentation (for external consumers)

`GET /api/student/results/[resultId]` — returns the same data shape as the page fetch.

**Key behavior:** The API also gates `correctAnswer` and `explanation` behind `isGraded`:
```typescript
const isGraded = result.examSession?.status === "GRADED";
// ...
...(isGraded ? { correctAnswer: sa.question.correctAnswer, explanation: sa.question.explanation } : {})
```

This is the canonical enforcement point — both the page and the API enforce the same rule.

**Response shape:**
```typescript
{
  id: string;
  testName: string;
  topicName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  sessionStatus: "DOING" | "GRADING" | "GRADED";
  attemptNumber: number;
  gradedAt: string | null;
  answers: {
    id: string;
    questionNumber: number;
    content: string;
    questionType: string;
    contentMediaUrl: string | null;
    contentMediaType: string | null;
    difficulty: number;
    selectedAnswer: string;
    isCorrect: boolean;
    correctAnswer?: string;       // only if GRADED
    explanation?: string;         // only if GRADED
    teacherOverride: boolean | null;
    teacherScore: number | null;
    teacherComment: string | null;
  }[];
  comments: {
    id: string;
    content: string;
    userName: string;
    createdAt: string;
  }[];
}
```

---

## State Management

### Server State
All data is resolved server-side. No React state on the page component.

### Client State (confetti only)
The confetti animation requires client state: `const [showConfetti, setShowConfetti] = useState(false)`.

In the current implementation, confetti is rendered inline via `motion/react` without extracting a client component. This works because `motion/react` does not require `"use client"` on the parent. However, the `useEffect` + `useState` for `showConfetti` is the problematic part — this pattern technically requires the confetti block to be isolated in a client component.

**Recommended extraction** (not yet implemented):
```typescript
// src/components/student/ConfettiOverlay.tsx
"use client";
export default function ConfettiOverlay({ score }: { score: number }) {
  const [show, setShow] = useState(score >= 80);
  useEffect(() => {
    if (score >= 80) {
      const t = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(t);
    }
  }, [score]);
  if (!show) return null;
  return (/* confetti particles */);
}
```

This component would receive only the `score` prop from the RSC parent, keeping the rest of the page server-rendered.

---

## Styling

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Page bg | `#f8f9ff` | Layout shell |
| Card bg | `#ffffff` | All analytics + answer review panels |
| Card shadow | `0_4px_16px_rgba(18,28,42,0.04)` | All panels |
| Score green | `#1b6b51` | score >= 80 |
| Score purple | `#2a14b4` | 50 <= score < 80 |
| Score red | `#7b0020` | score < 50 |
| Correct circle bg | `#a6f2d1` at 30% opacity | Answer review |
| Incorrect circle bg | `#ffdada` at 30% opacity | Answer review |
| Incorrect row tint | `#ffdada` at 5% opacity | Answer review row bg |
| Progress bar fill | `#5e35f1` | Time distribution |
| Progress bar track | `#f1ecf6` | Time distribution |
| Teacher comment bg | `#f7f2fa` | Lavender card |
| Explanation bg | `#f8f9ff` | Blue-white card |
| Current attempt bg | `#e3dfff` at 30% opacity | Attempt history |
| Current attempt ring | `#5e35f1` at 20% opacity | Attempt history |
| Confetti colors | `#2a14b4`, `#f59e0b`, `#1b6b51`, `#7b0020`, `#4338ca`, `#a6f2d1` | 6-color rotating palette |

### Analytics Panel Header Pattern
All analytics panel headers follow:
```jsx
<h3 className="text-sm font-body font-bold text-[#121c2a] mb-3 flex items-center gap-2">
  <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">{icon}</span>
  {label}
</h3>
```

Icons used: `bar_chart` (difficulty), `category` (type), `schedule` (time), `trending_up` (attempts), `fact_check` (answer review), `chat` (comments).

---

## i18n

### Namespace: `"student"`
| Key | Value (en) | Usage |
|-----|-----------|-------|
| `student.myResults` | "My Results" | Back link label |

### Hardcoded Strings (future i18n migration)

The following visible strings are currently hardcoded in English. Each should be added to `messages/en.json` and `messages/vi.json`:

| Current text | Suggested key | Namespace |
|-------------|---------------|-----------|
| "By Difficulty" | `student.byDifficulty` | `student` |
| "Easy" / "Medium" / "Hard" | `student.difficultyEasy` / `Medium` / `Hard` | `student` (keys exist in `teacher` namespace — reuse or add to `student`) |
| "By Question Type" | `student.byQuestionType` | `student` |
| "Time Distribution" | `student.timeDistribution` | `student` |
| "Attempt History" | `student.attemptHistory` | `student` |
| "Current" (attempt chip) | `student.currentAttempt` | `student` |
| "Attempt {n}" | `student.attemptLabel` | `student` |
| "Answer Review" | `student.answerReview` | `student` |
| "Your answer:" | `student.yourAnswer` | `student` |
| "Correct:" | `student.correctAnswer` | `student` |
| "(no answer)" | `student.noAnswer` | `student` |
| "Teacher Comments" | `student.teacherComments` | `student` |
| "Back to Topic" | `student.backToTopic` | `student` |
| "correct" (fraction) | `student.correct` | `student` (exists) |
| "Attempt {n} of {max}" | (display in future) | `exam` (exists: `exam.attempt`) |

---

## Error Handling

| Error scenario | Handling mechanism |
|---------------|-------------------|
| `resultId` not found or belongs to another user | `notFound()` → Next.js 404 page |
| Unauthenticated request | `redirect("/login")` in both layout and page |
| Database error (Prisma throws) | Uncaught error → Next.js error boundary (`src/app/error.tsx`) |
| `result.practiceTest` is null (orphan result) | `.practiceTest.title` access would throw — mitigated by `onDelete: Cascade` on `practice_results.practice_test_id` |
| `result.examSession` is null | `isGraded` defaults to `true`; `attemptNumber` check guarded with `?.` |
| `sa.question` is null (deleted question) | Would throw in the render loop — mitigated by `onDelete: Cascade` on `student_answers.question_id` |
| `allAttempts` query fails (secondary query) | Currently unhandled — if the secondary query throws, the whole page throws. Future: wrap in try/catch and default to `[]` with a degraded UI |
| `params` is not yet resolved (Next.js 15+ async params) | Handled correctly: `const { resultId } = await params` |
| `motion/react` fails to load | Confetti silently skips — it's purely cosmetic. No functional degradation |

---

## Performance

### Query Optimization Roadmap

| Item | Priority | Implementation |
|------|----------|---------------|
| Run both queries in parallel (`Promise.all`) | Medium | Wrap in `Promise.all` after `notFound()` guard pattern |
| Cache attempt history (rarely changes) | Low | `unstable_cache` with `["attempts", userId, testId]` tag, 30s TTL |
| Add index on `(user_id, completed_at)` for `practiceResult` | Medium | Prisma migration: `@@index([userId, completedAt(sort: Desc)])` |
| Add index on `(practice_result_id)` for `studentAnswers` | Low | Already covered by FK constraint index |
| Paginate answer review for very long tests (> 100 questions) | Low | Not yet needed; add client-side accordion or virtual list if needed |

### Streaming Approach

The page is currently rendered as a single blocking RSC — both queries must complete before any HTML is sent. With `Promise.all`, this becomes one round-trip instead of two.

For progressive enhancement, the analytics panels and answer review could be wrapped in `<Suspense>` with `loading.tsx` fallbacks:
```jsx
// Possible future structure:
<Suspense fallback={<AnalyticsSkeleton />}>
  <AnalyticsServer resultId={resultId} />
</Suspense>
<Suspense fallback={<AnswerReviewSkeleton />}>
  <AnswerReviewServer resultId={resultId} />
</Suspense>
```
This would allow the score hero to stream immediately while the heavier query (student answers + questions) completes in parallel.

### Client-Side Weight

The page sends **zero client-side JavaScript** for its core content, with one exception: `motion/react` is imported for confetti. This adds ~30KB to the client bundle on pages where confetti fires. Since confetti is conditional on `score >= 80`, consider lazy-loading the confetti component with `dynamic(() => import('./ConfettiOverlay'), { ssr: false })` to avoid the bundle cost for low-scoring results.

```typescript
// Recommended lazy loading for confetti:
import dynamic from "next/dynamic";
const ConfettiOverlay = dynamic(() => import("@/components/student/ConfettiOverlay"), { ssr: false });

// In RSC:
{score >= 80 && <ConfettiOverlay />}
```

This eliminates the `motion/react` bundle entirely from pages where `score < 80`.
