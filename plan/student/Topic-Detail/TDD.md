# TDD — Student Topic Detail Page

**Route:** `/topics/[topicId]`
**File:** `src/app/(student)/topics/[topicId]/page.tsx`
**Last updated:** 2026-04-15

---

## 1. Architecture Overview

The Topic Detail page follows the Next.js 15/16 App Router **Server Component** pattern. All data fetching and access control happen on the server during the render cycle. No data is fetched client-side during initial load.

```
(student) group layout             — session guard, StudentNavbar, page wrapper
  └─ [topicId]/page.tsx            — SERVER component (async, awaits params)
       ├─ generateMetadata()        — separate metadata fetch (topic title/desc)
       ├─ auth() + prisma queries   — 6 sequential DB calls
       ├─ SVG progress ring         — pure server-rendered markup
       ├─ <VocabGrid />             — CLIENT component ("use client")
       ├─ Practice Tests grid       — server-rendered Link / div conditionals
       └─ Bookmarks section         — server-rendered list
```

**Key design decisions:**
1. **No API route for reads.** Topic data, vocabulary, progress, sessions, and bookmarks are all fetched directly with `prisma` in the server component. This eliminates client-initiated fetch waterfalls.
2. **Client component boundary is narrow.** Only `VocabGrid` is a client component because it requires local state (current page, learned IDs optimistic update, modal visibility, save spinner). Everything else is static server markup.
3. **INACTIVE tests are `<div>`, not `<button>`/`<Link>`.** Server Components cannot attach `onClick` handlers to disable navigation; rendering as a non-interactive element avoids the need for a client wrapper just for this logic.
4. **`router.refresh()` after bulk mark.** Because initial `learnedIds` are server-rendered props, a full router refresh after API mutation ensures the server component re-runs and the progress ring percentage is recalculated correctly. Optimistic local state update in `VocabGrid` provides immediate visual feedback before the refresh completes.

---

## 2. Route & Data Flow

### 2.1 Request Lifecycle

```
Browser GET /topics/[topicId]
  │
  ├─ Next.js matches (student)/topics/[topicId]/page.tsx
  ├─ loading.tsx shown immediately (Suspense boundary)
  │
  ├─ auth() → session or redirect("/login")
  ├─ params = await params  → { topicId: string }
  ├─ getTranslations("student") → t()
  │
  ├─ DB: ClassEnrollment.findFirst  → 404 if no access
  ├─ DB: Topic.findUnique (include language, vocabulary, practiceTests) → 404 if not found
  ├─ DB: FlashcardProgress.findMany → learnedSet, learnedCount, progressPercent
  ├─ DB: PracticeResult.findMany    → resultsByTest Map
  ├─ DB: ExamSession.findMany       → sessionsByTest Map
  ├─ DB: QuestionBookmark.findMany  → bookmarks[]
  │
  ├─ SVG math (circleR, circleC, circleOffset)
  ├─ allLearned boolean
  │
  └─ RSC payload streamed to client
       └─ VocabGrid hydrated as client component
```

### 2.2 Params Contract

```typescript
// page.tsx signature
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
})

// Next.js 15/16: params is a Promise; must be awaited
const { topicId } = await params;
```

### 2.3 URL Patterns

| Destination | URL |
|-------------|-----|
| Flashcard study | `/topics/[topicId]/flashcards` |
| Practice test (specific) | `/topics/[topicId]/practice?testId=[testId]` |
| Practice test (any active) | `/topics/[topicId]/practice` |
| Results detail | `/results/[resultId]` (via ExamEntryGate) |
| Topics list | `/topics` |

---

## 3. Component Tree

```
TopicDetailPage (Server Component)
│
├── <header>  — Hero Section
│   ├── <nav>  — Breadcrumb (Link to /topics + language name)
│   ├── <h1>   — Topic title (gradient text)
│   ├── <p>    — Topic description (conditional)
│   ├── <Link> — Study Flashcards CTA  →  /topics/[topicId]/flashcards
│   └── <svg>  — Circular progress ring
│       ├── <circle> — Background track (#e3dfff)
│       ├── <circle> — Progress fill (gradient, dasharray/dashoffset)
│       └── <defs><linearGradient> — progressGrad
│
├── <VocabGrid />  (Client Component)
│   │   Props: vocabulary[], learnedIds[], totalCount
│   │
│   ├── Section header
│   │   ├── Icon + "Vocabulary Collection" heading
│   │   ├── Item count label
│   │   └── Bulk-action segmented pill
│   │       ├── "Not Learned" button  (triggers unlearn modal)
│   │       └── "Learned" button      (triggers learn modal)
│   │
│   ├── Grid of VocabCard divs (12 per page)
│   │   └── Each: number badge, learned icon, word, type, pronunciation,
│   │              meaning, example section
│   │
│   ├── Pagination controls (conditional: totalPages > 1)
│   │   ├── Prev button
│   │   ├── Page number buttons (windowed, max 7)
│   │   └── Next button
│   │
│   └── <ModalOverlay>  (conditional: confirmAction !== null)
│       └── Confirmation modal (cancel + confirm buttons, saving spinner)
│
├── <section>  — Practice Tests (conditional: tests.length > 0)
│   ├── Section header (icon + "Test your knowledge" + description)
│   ├── Test card grid (1/2/3 cols)
│   │   └── Per test: (Link | div) depending on status
│   │       ├── Icon badge + ExamStatusBadge + score pill
│   │       ├── Test title
│   │       ├── Question count
│   │       ├── Attempt number badge (conditional)
│   │       └── "Best Attempt" label (conditional)
│   └── Bottom CTA row
│       ├── (allLearned) → <Link> "Retake Assessment"
│       └── (!allLearned) → <div> lock icon + "Learn all words first"
│
└── <section>  — Bookmarked Questions (conditional: bookmarks.length > 0)
    ├── Section header (bookmark icon + "Bookmarked Questions")
    └── Bookmark list
        └── Per bookmark: media thumbnail | question content | test title | correct answer pill
```

### 3.1 Component Details

#### `VocabGrid` — `src/components/student/VocabGrid.tsx`

```typescript
// Props
type Props = {
  vocabulary: VocabItem[];   // all items, all pages
  learnedIds: string[];       // initially from server, then optimistic local state
  totalCount: number;         // used in modal confirmation message
};

// State
const [page, setPage] = useState(1);
const [currentLearnedIds, setCurrentLearnedIds] = useState<string[]>(learnedIds);
const [confirmAction, setConfirmAction] = useState<"learn" | "unlearn" | null>(null);
const [saving, setSaving] = useState(false);

// Derived
const learnedSet = new Set(currentLearnedIds);
const allLearned = vocabulary.length > 0 && currentLearnedIds.length === vocabulary.length;
const totalPages = Math.ceil(vocabulary.length / PER_PAGE);  // PER_PAGE = 12
const start = (page - 1) * PER_PAGE;
const pageItems = vocabulary.slice(start, start + PER_PAGE);
```

Note: `VocabGrid` does **not** currently support the per-card learned/unlearned toggle. The segmented pill only controls bulk actions. Individual card click-to-toggle is not implemented in the current codebase — individual marking is done via the Flashcards page.

#### `ExamStatusBadge` — `src/components/exam/ExamStatusBadge.tsx`

```typescript
type Props = {
  testStatus: string;        // PracticeTest.status: "ACTIVE" | "INACTIVE"
  sessionStatus?: string | null;  // ExamSession.status: "DOING" | "GRADING" | "GRADED"
};

// Effective status: sessionStatus overrides testStatus when present
const effectiveStatus = (sessionStatus || testStatus) as Status;
```

Status → badge config mapping:

| Status   | Label key             | Color                              | Icon            |
|----------|-----------------------|------------------------------------|-----------------|
| ACTIVE   | `statusAvailable`     | `bg-[#a6f2d1]/30 text-[#1b6b51]`  | `play_circle`   |
| INACTIVE | `statusUnavailable`   | `bg-[#e5e0ed]/50 text-[#777586]`  | `block`         |
| DOING    | `statusInProgress`    | `bg-[#fef3c7] text-[#92400e]`     | `pending`       |
| GRADING  | `statusAwaitingGrade` | `bg-[#dbeafe] text-[#1e40af]`     | `hourglass_top` |
| GRADED   | `statusViewResults`   | `bg-[#e3dfff] text-[#5e35f1]`     | `verified`      |

#### `ModalOverlay` — `src/components/ModalOverlay.tsx`

Shared modal component. Used in VocabGrid for bulk action confirmation.

```typescript
type Props = {
  open: boolean;
  onClose: () => void;
  panelClass?: string;   // "max-w-sm" for confirmation modals
  children: React.ReactNode;
};
```

---

## 4. Database Queries

All queries execute in `TopicDetailPage` on the server. Shown in order of execution.

### Query 1 — Access Check

```typescript
const hasAccess = await prisma.classEnrollment.findFirst({
  where: {
    userId: session.user.id,
    class: { topicAssignments: { some: { topicId } } },
  },
});
// Result: ClassEnrollment | null
// Action: if null → notFound()
```

**Indexes relied on:** `class_enrollments(user_id)`, `topic_assignments(topic_id, class_id)`.

### Query 2 — Topic + Relations

```typescript
const topic = await prisma.topic.findUnique({
  where: { id: topicId },
  include: {
    language: true,
    vocabulary: { orderBy: { sortOrder: "asc" } },
    practiceTests: {
      where: { status: { in: ["ACTIVE", "INACTIVE"] } },
      include: { _count: { select: { questions: true } } },
    },
  },
});
// Returns: Topic & { language: Language, vocabulary: Vocabulary[], practiceTests: (PracticeTest & { _count: { questions: number } })[] }
// Action: if null → notFound()
```

**Notes:**
- DRAFT tests are intentionally excluded by the `where` clause.
- `_count` on questions avoids fetching the full question list just for a count display.
- Vocabulary ordered by `sortOrder` preserves teacher-defined ordering on the client.

### Query 3 — Flashcard Progress

```typescript
const progress = await prisma.flashcardProgress.findMany({
  where: {
    userId: session.user.id,
    vocabularyId: { in: topic.vocabulary.map((v) => v.id) },
    learned: true,
  },
});
// Returns: FlashcardProgress[]  (only learned=true records)
```

**Derived values:**
```typescript
const learnedSet = new Set(progress.map((p) => p.vocabularyId));
const learnedCount = progress.length;
const totalCount = topic.vocabulary.length;
const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
const allLearned = totalCount > 0 && learnedCount === totalCount;
```

**SVG math:**
```typescript
const circleR = 54;
const circleC = 2 * Math.PI * circleR;   // ≈ 339.29
const circleOffset = circleC - (circleC * progressPercent) / 100;
```

### Query 4 — Practice Results

```typescript
const practiceResults = await prisma.practiceResult.findMany({
  where: {
    userId: session.user.id,
    practiceTestId: { in: topic.practiceTests.map((pt) => pt.id) },
  },
  orderBy: { completedAt: "desc" },
});
// Returns: PracticeResult[]

const resultsByTest = new Map<string, PracticeResultItem>(
  practiceResults.map((r) => [r.practiceTestId, r])
);
```

**Note:** Because the array is ordered by `completedAt: "desc"`, `Map` construction will keep only the first occurrence per `practiceTestId` — which is the most recent result. This is the intended "best/latest attempt" display.

### Query 5 — Exam Sessions

```typescript
const examSessions = await prisma.examSession.findMany({
  where: {
    userId: session.user.id,
    practiceTestId: { in: topic.practiceTests.map((pt) => pt.id) },
  },
  orderBy: { attemptNumber: "desc" },
  distinct: ["practiceTestId"],
  select: { practiceTestId: true, status: true, attemptNumber: true },
});

const sessionsByTest = new Map(
  examSessions.map((s) => [s.practiceTestId, s])
);
```

**Note:** `distinct: ["practiceTestId"]` combined with `orderBy: { attemptNumber: "desc" }` ensures one record per test — always the highest attempt number (latest session).

### Query 6 — Bookmarked Questions

```typescript
const testIds = topic.practiceTests.map((pt) => pt.id);

const bookmarks = await prisma.questionBookmark.findMany({
  where: {
    userId: session.user.id,
    question: { practiceTestId: { in: testIds } },
  },
  include: {
    question: {
      select: {
        id: true,
        content: true,
        questionNumber: true,
        contentMediaUrl: true,
        contentMediaType: true,
        correctAnswer: true,
        practiceTest: { select: { title: true } },
      },
    },
  },
  orderBy: { createdAt: "desc" },
});
```

**Security note:** `correctAnswer` is included here for display in the bookmarks panel. This is intentional — students are reviewing their own bookmarked questions where they already know the answer context.

### Metadata Query (Separate)

```typescript
// In generateMetadata()
const topic = await prisma.topic.findUnique({
  where: { id: topicId },
  select: { title: true, description: true },
});
```

This runs independently of the main page render and does not share a connection/cache with the page queries.

---

## 5. API Dependencies

### `PUT /api/flashcards`

Used by `VocabGrid` for bulk mark learned / reset.

```typescript
// Request
{
  vocabularyIds: string[];  // all vocab IDs in the topic
  learned: boolean;         // true = mark all learned, false = reset all
}

// Response (200 OK)
{ updated: number }

// Implementation: Prisma $executeRawUnsafe with
// INSERT INTO flashcard_progress ... ON CONFLICT DO UPDATE SET learned, learned_at
// This is an upsert on the composite unique key (user_id, vocabulary_id).
```

**Client-side handling in VocabGrid:**
1. `setSaving(true)`
2. `fetch("/api/flashcards", { method: "PUT", ... })`
3. On `res.ok`: `setCurrentLearnedIds(...)` + `toast.success(...)` + `setConfirmAction(null)` + `router.refresh()`
4. On error: `toast.error(t("failedToUpdate"))`
5. `finally: setSaving(false)`

---

## 6. State Management

All state lives within `VocabGrid`. There is no global or context state on this page.

| State Variable | Type | Initial Value | Purpose |
|----------------|------|---------------|---------|
| `page` | `number` | `1` | Current pagination page |
| `currentLearnedIds` | `string[]` | `learnedIds` prop | Optimistic local learned state (synced to server on refresh) |
| `confirmAction` | `"learn" \| "unlearn" \| null` | `null` | Controls modal visibility and action type |
| `saving` | `boolean` | `false` | Disables UI during API call, shows spinner |

**State transitions:**

```
Initial: page=1, currentLearnedIds=[...from server], confirmAction=null, saving=false

User clicks "Learned" pill (not all learned)
  → confirmAction = "learn"
  → ModalOverlay opens

User clicks Cancel in modal
  → confirmAction = null
  → ModalOverlay closes

User clicks Confirm in modal
  → saving = true
  → API call fires
  → (success) currentLearnedIds = all vocab IDs
              toast shown
              confirmAction = null
              router.refresh() → server re-runs → new learnedIds prop
  → (failure) toast error
  → saving = false

User changes page
  → page = n
  → pageItems re-derived from vocabulary.slice(...)
```

---

## 7. Styling & Responsive Design

### 7.1 Breakpoint Behavior

| Section | Mobile (default) | `md` (768px+) | `lg` (1024px+) |
|---------|-----------------|----------------|-----------------|
| Hero grid | 1 col, stacked | 1 col | 12-col grid (7+5) |
| Hero padding | `p-8` | `p-12` | `p-12` |
| Hero H1 | `text-3xl` | `text-4xl` | `text-4xl` |
| VocabGrid cards | 1 col | 2 cols | 4 cols |
| Practice test cards | 1 col | 2 cols | 3 cols |
| Item count label | hidden | visible | visible |

### 7.2 Tailwind Classes — Key Patterns

**Hero section container:**
```
relative bg-white rounded-3xl overflow-hidden mb-12
shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]
```

**Gradient heading:**
```
bg-gradient-to-r from-[#2a14b4] to-[#6d28d9] bg-clip-text text-transparent
```

**Flashcard CTA button:**
```
px-10 py-4 bg-[#2a14b4] text-white rounded-full font-bold uppercase tracking-widest text-xs
flex items-center gap-3 shadow-lg shadow-[#2a14b4]/20
```

**VocabGrid card (learned):**
```
bg-white border-[#a6f2d1]/40
shadow-[0_4px_24px_rgba(18,28,42,0.06)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.1)]
```

**VocabGrid card (not learned):**
```
bg-white/60 border-[#e2e8f0]
shadow-[0_2px_12px_rgba(18,28,42,0.03)] hover:shadow-[0_8px_32px_rgba(18,28,42,0.08)]
hover:border-[#c7c4d7]/40
```

**Active test card:**
```
bg-[#f8f9ff] rounded-2xl p-6
transition-all duration-300 hover:shadow-[0_4px_24px_rgba(94,53,241,0.06)] exam-ghost-border
```

**Inactive test card:**
```
bg-[#f8f9ff] rounded-2xl p-6 opacity-50 cursor-not-allowed
```

**Custom CSS class `exam-ghost-border`:** Defined in `globals.css`. Applies a subtle border effect on hover (exact implementation in `src/app/globals.css`).

### 7.3 Material Symbols Icons Used

| Icon name | Where used |
|-----------|------------|
| `chevron_right` | Breadcrumb separator |
| `style` | Flashcard CTA button |
| `dictionary` | VocabGrid section header |
| `check_circle` | Learned state on vocab card; confirm button in modal |
| `close` | Not-learned segment in bulk pill |
| `chevron_left` / `chevron_right` | Pagination prev/next |
| `progress_activity` | Saving spinner in modal |
| `restart_alt` | Reset/unlearn confirm modal icon |
| `quiz` | Practice tests section header |
| `assignment` | Practice test card icon |
| `replay` | Attempt number badge |
| `emoji_events` | Best attempt label |
| `play_arrow` | Retake assessment CTA |
| `lock` | "Learn all words first" locked state |
| `bookmark` | Bookmarked questions section header |
| `headphones` | Audio media thumbnail in bookmarks |

---

## 8. i18n Keys

All keys are in `messages/en.json` and `messages/vi.json`.

### Namespace: `student`

| Key | Usage | Interpolations |
|-----|-------|----------------|
| `topics` | Breadcrumb first segment | — |
| `studyFlashcards` | Hero CTA button | — |
| `progress` | Progress ring label | — |
| `vocabularyCollection` | VocabGrid section header | — |
| `items` | Item count label | `{count}` |
| `notLearned` | Bulk pill left segment, modal confirm button | — |
| `learned` | Bulk pill right segment, modal confirm button | — |
| `markAllLearned` | Modal confirmation body (learn) | `{count}` |
| `resetAllLearned` | Modal confirmation body (unlearn) | `{count}` |
| `markedAsLearned` | Toast success (learn) | `{count}` |
| `wordsReset` | Toast success (unlearn) | `{count}` |
| `failedToUpdate` | Toast error | — |
| `example` | "EXAMPLE:" label on vocab card | — |
| `testKnowledge` | Practice tests section heading | — |
| `testDescription` | Practice tests section subheading | — |
| `questionsCount` | Question count on test card | `{count}` |
| `bestAttempt` | Footer label on test card | — |
| `retakeAssessment` | Bottom CTA when allLearned | — |
| `learnAllWordsFirst` | Locked state label | — |
| `bookmarkedQuestions` | Bookmarks section heading | — |

### Namespace: `exam`

| Key | Usage |
|-----|-------|
| `statusAvailable` | ExamStatusBadge — ACTIVE |
| `statusUnavailable` | ExamStatusBadge — INACTIVE |
| `statusInProgress` | ExamStatusBadge — DOING |
| `statusAwaitingGrade` | ExamStatusBadge — GRADING |
| `statusViewResults` | ExamStatusBadge — GRADED |

### Namespace: `common`

| Key | Usage |
|-----|-------|
| `cancel` | Modal cancel button |

---

## 9. Error Handling

### 9.1 Server-Side

| Condition | Handling |
|-----------|----------|
| No session / unauthenticated | `redirect("/login")` |
| Student not enrolled in any class with this topic | `notFound()` → Next.js 404 page |
| Topic does not exist | `notFound()` → Next.js 404 page |
| Prisma query throws (DB connection error) | Unhandled; bubbles to `error.tsx` at `src/app/error.tsx` |

### 9.2 Client-Side (VocabGrid)

| Condition | Handling |
|-----------|----------|
| `PUT /api/flashcards` returns non-ok response | `toast.error(t("failedToUpdate"))` |
| `fetch` throws (network error) | Caught in `catch` block → `toast.error(t("failedToUpdate"))` |
| During save | Both modal buttons disabled; spinner shown on confirm button |

### 9.3 Error Boundary

`src/app/error.tsx` is the global error boundary. It catches unhandled runtime errors in server components (e.g., uncaught Prisma errors). The student layout does not define a local `error.tsx`, so errors propagate to the root boundary.

---

## 10. Performance Considerations

### 10.1 Query Optimization

- **Single topic query with includes** (Query 2) loads language, vocabulary, and practice tests in one round-trip rather than three separate queries.
- **`_count` on questions** avoids loading all Question records just to display a count.
- **`distinct` + `orderBy`** on ExamSession (Query 5) eliminates post-processing grouping in application code.
- **`select` projection** on ExamSession (Query 5) and metadata query limits transferred data to only required fields.
- **Vocabulary ordered at the DB level** (`orderBy: { sortOrder: "asc" }`) removes the need for JavaScript sort on potentially large arrays.

### 10.2 Client Bundle Impact

- `VocabGrid` is the only client component on this page. It imports: `react` (useState), `next-intl/client` (useTranslations), `next/navigation` (useRouter), `sonner` (toast), and `ModalOverlay`.
- `ExamStatusBadge` is a client component (`"use client"`) but has no state; it is used inside the server-rendered practice tests section. Because it contains `useTranslations`, it must be a client component.
- No heavy client-side libraries are introduced by this page.

### 10.3 Static Elements

- The progress ring SVG, hero section, and bookmarks list are fully server-rendered HTML. No hydration cost for these elements.
- Practice test cards (both active `<Link>` and inactive `<div>`) are server-rendered except for `ExamStatusBadge` which hydrates separately.

### 10.4 Loading State

`src/app/(student)/topics/[topicId]/loading.tsx` provides an `animate-pulse` skeleton that matches the page layout:
- Breadcrumb shimmer
- Hero with title + sidebar card shimmer
- 8-item vocabulary grid shimmer
- Practice tests placeholder

This skeleton is shown by Next.js during the server component's async resolution.

### 10.5 Data Volume Considerations

| Data | Expected volume | Notes |
|------|-----------------|-------|
| Vocabulary per topic | 10–100 items | 12 shown per page; no concern |
| Practice tests per topic | 1–10 | Rendered all at once |
| Exam sessions | 1 per test (after distinct) | Minimal |
| Practice results | 1 per test (Map dedup) | Minimal |
| Bookmarks | 0–50 per topic | All rendered (no pagination) |

If bookmark volume grows significantly (> 50), pagination should be added to the bookmarks section. Currently not implemented.

### 10.6 Cache Behavior

- This page uses Next.js default dynamic rendering (no `export const dynamic` override). Each request triggers a fresh server render.
- `prisma` calls are not cached at the ORM layer. Next.js `fetch()` caching does not apply to Prisma queries.
- Revalidation is triggered by `router.refresh()` in VocabGrid after bulk mark actions, which re-runs the server component and sends a fresh RSC payload.
