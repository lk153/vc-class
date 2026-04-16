# TDD: Student Home — Topics Listing

**Route:** `/topics`
**Page component:** `src/app/(student)/topics/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture Overview

The Student Home page is a **Next.js 16 App Router Server Component**. All data fetching, authentication, and business logic (enrollment filtering, deduplication, progress calculation) run exclusively on the server. The rendered HTML is streamed to the client.

The only client-side interactivity is the language filter, which lives inside the `TopicGrid` client component. This boundary is the sole `"use client"` surface on this page.

```
Server (RSC)                              Client
─────────────────────────────────────     ──────────────────────
TopicsPage (async Server Component)
  ├── auth()                              (no client state)
  ├── prisma (enrollment + progress)
  ├── getTranslations("student")
  └── renders:
        <header>                          (static HTML)
        <empty state> OR
        <TopicGrid items languages />  →  TopicGrid ("use client")
                                            useState(filterLangId)
                                            → TopicCard (× N)
                                               → <Link href>
```

---

## Route & Data Flow

### URL
```
GET /topics
```

### Request lifecycle

1. **Middleware / Layout auth guard** — `src/app/(student)/layout.tsx` calls `auth()`. If no session, redirects to `/login`.
2. **Page auth guard** — `TopicsPage` calls `auth()` again. Redundant but safe defense-in-depth; same redirect.
3. **User lookup** — `prisma.user.findUnique` with `include: { learnLanguage: true }` to build the header language badge.
4. **Enrollment query** — `prisma.classEnrollment.findMany` (see Database Queries section).
5. **In-memory deduplication** — flat-map + `Set<string>` over `topicId`.
6. **Progress query** — `prisma.flashcardProgress.findMany` scoped to the student and the collected vocab IDs.
7. **Data transformation** — map assignments into `TopicItem[]` with `totalWords` and `learnedWords`.
8. **Render** — pass `items` and `languages` to `<TopicGrid>`, which handles client-side filtering and renders `<TopicCard>` instances.

### Loading state
- `src/app/(student)/topics/loading.tsx` is the Next.js Suspense fallback.
- Shown immediately while the server-side async work runs.
- Contains a pulse skeleton that matches the grid structure (6 placeholder cards).

---

## Component Tree

```
StudentLayout (RSC, src/app/(student)/layout.tsx)
└── StudentNavbar (RSC → client hydration, src/components/student/Navbar.tsx)
└── <main>
    └── TopicsPage (RSC, src/app/(student)/topics/page.tsx)
        ├── <header>
        │   ├── <div> language badge pill
        │   ├── <h1> "My Topics"
        │   └── <p> description
        │
        ├── [empty state branch]          -- when assignments.length === 0
        │   ├── <span class="material-symbols-outlined"> menu_book
        │   ├── <h2> "No topics yet"
        │   └── <p> message
        │
        └── [grid branch]                 -- when assignments.length > 0
            └── TopicGrid (CC, src/components/student/TopicGrid.tsx)
                ├── [filter tabs]
                │   ├── <button> All
                │   └── <button> {language.name} × N
                │
                ├── [filtered empty state] -- when filter yields 0 results
                │   ├── <span> filter_list_off
                │   └── <p> noTopicsForLanguage
                │
                └── <div class="grid ...">
                    └── TopicCard (CC, src/components/student/TopicCard.tsx) × N
                        └── <Link href="/topics/[topic.id]">
                            ├── <h3> topic.title
                            ├── <p> topic.description
                            ├── <span> wordsLearned label
                            ├── <span> progressPercent%
                            └── <div> progress bar track + fill
```

**Component classification:**
| Component | Type | Reason |
|-----------|------|--------|
| `TopicsPage` | Server Component (async) | Data fetching, auth, i18n server-side |
| `StudentLayout` | Server Component (async) | Session guard, layout wrapper |
| `StudentNavbar` | Client Component | Hydrated for interactivity (logout overlay, etc.) |
| `TopicGrid` | Client Component (`"use client"`) | `useState` for `filterLangId` |
| `TopicCard` | Client Component (`"use client"`) | `useTranslations` (next-intl client hook) |

---

## Database Queries

### Query 1: User + Language
```ts
prisma.user.findUnique({
  where: { id: session.user.id },
  include: { learnLanguage: true },
})
```
**Tables hit:** `users`, `languages`
**Purpose:** Resolve header badge text.
**Index used:** `users.id` (PK).

---

### Query 2: Enrollment → Class → Assignments → Topic (main query)
```ts
prisma.classEnrollment.findMany({
  where: { userId: session.user.id },
  include: {
    class: {
      include: {
        topicAssignments: {
          include: {
            topic: {
              include: {
                language: true,
                vocabulary: true,
                _count: { select: { vocabulary: true } },
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    },
  },
})
```

**Tables hit:** `class_enrollments`, `classes`, `topic_assignments`, `topics`, `languages`, `vocabularies`

**Join path:**
```
class_enrollments.user_id = ?
  → classes (via class_id)
    → topic_assignments (via class_id, ordered by assigned_at DESC)
      → topics (via topic_id)
        → languages (via language_id)
        → vocabularies (via topic_id) ← full rows fetched for vocab IDs + count
```

**Notes:**
- `vocabulary: true` fetches full `Vocabulary` rows. This is used to extract `v.id` for progress lookup and `.length` for total word count. In future, selecting `{ select: { id: true } }` would reduce payload.
- `_count: { select: { vocabulary: true } }` is fetched but `vocabulary.length` is used instead (redundant; can be cleaned up).
- `orderBy: { assignedAt: "desc" }` ensures that when the same topic appears in multiple classes, the most recently assigned class's entry is the one that wins deduplication (first-seen semantics with a `Set`).

**Indexes recommended:**
- `class_enrollments(user_id)` — filters by student.
- `topic_assignments(class_id, assigned_at)` — ordered join.
- `topic_assignments(topic_id)` — for deduplication awareness.

---

### Query 3: Flashcard Progress
```ts
prisma.flashcardProgress.findMany({
  where: {
    userId: session.user.id,
    vocabularyId: { in: vocabIds },
    learned: true,
  },
})
```

**Tables hit:** `flashcard_progress`
**Purpose:** Determine which vocabulary items the student has marked as learned.
**Indexes recommended:**
- `flashcard_progress(user_id, vocabulary_id)` — composite unique index already enforced by `@@unique([userId, vocabularyId])`.
- `flashcard_progress(vocabulary_id)` — supports `IN` lookup.

**Result used as:** `Set<string>` of `vocabularyId` values for O(1) membership tests per vocab item.

---

### In-Memory Processing

**Deduplication:**
```ts
const seenTopicIds = new Set<string>();
const assignments = enrollments.flatMap((e) =>
  e.class.topicAssignments.filter((ta) => {
    if (seenTopicIds.has(ta.topicId)) return false;
    seenTopicIds.add(ta.topicId);
    return true;
  })
);
```
Complexity: O(N) where N = total assignment rows across all enrolled classes.

**Progress mapping:**
```ts
items = assignments.map((assignment) => {
  const totalWords = assignment.topic.vocabulary.length;
  const learnedWords = assignment.topic.vocabulary.filter((v) =>
    learnedSet.has(v.id)
  ).length;
  return { id, topic, languageId, languageName, totalWords, learnedWords };
});
```
Complexity: O(V) where V = total vocabulary items across all deduplicated topics.

---

## API Dependencies

This page has **no API route dependencies**. All data is fetched directly via Prisma in the Server Component. There are no `fetch()` calls to internal API routes.

Related API routes that affect the data displayed here (called from other pages):
- `PUT /api/flashcard-progress` — updates `FlashcardProgress.learned`; changes are reflected on next page load.
- `POST /api/topic-assignments` — teacher assigns topics; new cards appear on next student load.

---

## State Management

All state is **local to the `TopicGrid` client component**. There is no global state, context, or server-side session storage involved in this page's interactivity.

| State | Location | Type | Default | Trigger |
|-------|----------|------|---------|---------|
| `filterLangId` | `TopicGrid` | `string \| null` | `null` (All) | Language tab button click |

**Derived state** (computed from `filterLangId` and `items` prop):
```ts
const filtered = filterLangId
  ? items.filter((item) => item.languageId === filterLangId)
  : items;
```

No state is persisted across navigations (navigating away and back resets the filter to "All"). This is intentional — the filter is a transient UI affordance, not a user preference.

---

## Styling & Responsive Design

### Design tokens (VC Class editorial theme)
| Token | Value | Usage |
|-------|-------|-------|
| Brand primary | `#2a14b4` | Progress bar, active tab, hover title, percentage text |
| Text primary | `#121c2a` | Headings, card titles |
| Text secondary | `#464554` | Body text, description, badge text |
| Text muted | `#777586` | Progress label, filter label, empty state icon |
| Badge background | `#d9e3f6` | Language context pill in header |
| Progress track | `#f0eef6` | Progress bar background |
| Card background | `var(--color-card, #fff)` | Card surface |
| Page background | `#f8f9ff` | Set by `StudentLayout` |

### Responsive breakpoints (Tailwind defaults)
| Breakpoint | Grid columns | Notes |
|------------|-------------|-------|
| `default` (< 768px) | 1 | Single column, full width cards |
| `md` (>= 768px) | 2 | Two-column grid |
| `lg` (>= 1024px) | 3 | Three-column grid |

Grid class: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10`

> Note: The PRD specifies `sm` for 2-col, but the implementation uses `md`. The TDD reflects the implemented behavior.

### Card height consistency
- `flex flex-col h-full` on the card + `flex-grow` on the content area ensures all cards in a row share the same height regardless of title/description length.
- `line-clamp-2` on title and description prevents runaway content.
- `min-h-[2.5rem]` on the description reserves space even when description is empty.
- `mt-auto` on the progress section pins it to the bottom of the card.

### Typography
- Font family: `font-body` (custom CSS variable, Tailwind utility).
- Page heading: `text-6xl md:text-7xl font-bold tracking-tight leading-tight`.
- Card title: `text-lg font-bold`.
- Progress label: `text-[10px] uppercase tracking-widest font-bold`.
- Filter label: `text-[10px] uppercase tracking-widest font-bold`.

---

## i18n Keys

All keys resolved via `next-intl`. The page uses the `"student"` namespace server-side; `TopicGrid` uses `"common"` and `TopicCard` uses `"student"` client-side.

### Used on this page

| Namespace | Key | Rendered As | Fallback |
|-----------|-----|-------------|---------|
| `student` | `language` | Appended to language name in badge: `"English Language"` | `"Language"` (inline fallback) |
| `student` | `curatedCollection` | Badge text when no language set | `"Curated Collection"` (inline fallback) |
| `student` | `topics` | Page `<h1>` heading | — |
| `student` | `topicsDescription` | Subheading paragraph | Long fallback string (inline) |
| `student` | `wordsLearned` | Progress label with params `{count}`, `{total}` | — |
| `common` | `filter` | Label before filter tabs | — |
| `common` | `all` | "All" filter tab | — |
| `common` | `noTopicsForLanguage` | Filtered empty state message | — |

### Missing / hardcoded strings (i18n debt)

| Location | Hardcoded string | Suggested key |
|----------|-----------------|---------------|
| Empty state heading | `"No topics yet"` | `student.noTopicsYet` |
| Empty state body | `"No topics assigned yet. Please wait for your teacher."` | `student.noTopicsAssigned` |

These strings should be moved to `messages/en.json` (and `messages/vi.json`) for full localisation coverage.

---

## Error Handling

### Authentication errors
- Missing session → `redirect("/login")` called from both `StudentLayout` and `TopicsPage`.
- No error UI required; redirect happens before render.

### Database errors
- Prisma query failures (connection issues, timeouts) propagate as unhandled exceptions.
- Next.js catches these via `src/app/error.tsx` (the nearest error boundary in the App Router hierarchy).
- The student layout does not define its own `error.tsx`, so the root error boundary fires.

### Empty data (not an error)
- `assignments.length === 0` → empty state UI (not an error boundary case).
- `filtered.length === 0` after filter → filtered empty state in `TopicGrid`.
- `topic.description === null` → `"\u00A0"` (non-breaking space) rendered in place.
- `totalWords === 0` → `progressPercent = 0`, no division by zero (guarded by `totalWords > 0` ternary in `TopicCard`).

### Type safety
- Enrollment, assignment, and progress Prisma results are typed as `any` in several places (marked `// (a: any)`). This suppresses TypeScript's deep relation inference limits. Future improvement: extract explicit `Prisma.ClassEnrollmentGetPayload<typeof enrollmentArgs>` types.

---

## Performance Considerations

### Current implementation
- **Sequential queries:** User lookup → enrollment query → progress query. Total DB round trips: 3.
- **Full vocabulary rows fetched:** `vocabulary: true` loads all fields for all vocab items across all topics. Only `id` and `length` are used.
- **N+1 risk:** Mitigated because Prisma batches the nested includes into JOINs, not per-row selects.

### Recommended optimizations (not yet implemented)

1. **Parallelize independent queries:**
   ```ts
   const [enrollments, user] = await Promise.all([
     prisma.classEnrollment.findMany({ ... }),
     prisma.user.findUnique({ ... }),
   ]);
   ```
   Saves one DB round-trip latency.

2. **Select only vocab IDs, not full rows:**
   ```ts
   vocabulary: { select: { id: true } }
   ```
   Reduces payload from potentially thousands of full `Vocabulary` rows to just ID strings.

3. **Remove redundant `_count`:**
   The `_count: { select: { vocabulary: true } }` include is fetched but `vocabulary.length` is used instead. Remove `_count` to reduce query complexity.

4. **Server-side topic deduplication via SQL:**
   For students enrolled in many classes, a raw Prisma query using `DISTINCT ON (topic_id)` would move deduplication to the DB and reduce in-memory processing.

5. **React cache / `unstable_cache`:**
   The topic list changes only when a teacher modifies assignments (low frequency). Wrapping the Prisma calls with `unstable_cache` keyed on `userId` with a short TTL (e.g., 60s) would reduce DB load for frequent page visits.

6. **Streaming with Suspense:**
   Split the page into a static header shell (renders instantly) and a Suspense-wrapped data section. Students see the header before the DB query completes.

### Loading skeleton
`src/app/(student)/topics/loading.tsx` provides the Next.js-native Suspense fallback. It mirrors the live grid structure (6 cards, 1/2/3 col) so the layout shift on data arrival is minimal.

### Bundle size
- `TopicGrid` and `TopicCard` are client components but contain no heavy dependencies.
- `next-intl` client bundle is shared across all student pages and not duplicated.
- No images are loaded on this page; no LCP image optimization needed.
