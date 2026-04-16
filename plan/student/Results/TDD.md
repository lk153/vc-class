# TDD: Student Results — Listing Page

**Route:** `/results`
**Component:** `src/app/(student)/results/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture

### Rendering Strategy
`StudentResultsPage` is a **React Server Component** (RSC). It runs exclusively on the server: authenticates the session, queries the database, and returns fully-rendered HTML with embedded data. No `"use client"` directive. No client-side state. No React hooks in the page component itself.

The only client component on the page is `ExamStatusBadge`, which is imported as a leaf client component. It uses `useTranslations("exam")` and renders a status pill. Because it is a leaf with no children, it does not block the RSC rendering of the surrounding page.

### File Responsibilities

| File | Role |
|------|------|
| `src/app/(student)/results/page.tsx` | RSC: auth guard, DB query, render loop, empty state |
| `src/app/(student)/layout.tsx` | Layout guard (second auth layer), `StudentNavbar`, `bg-[#f8f9ff]` shell |
| `src/components/exam/ExamStatusBadge.tsx` | Client leaf: renders status badge pill from `sessionStatus` prop |
| `src/lib/auth.ts` | `auth()` helper — wraps NextAuth `getServerSession` |
| `src/lib/prisma.ts` | Singleton Prisma client |

---

## Route & Data Flow

```
Browser GET /results
  → Next.js App Router matches (student)/results/page.tsx
  → StudentLayout runs: auth() → redirect("/login") if no session
  → StudentResultsPage runs: auth() → redirect("/login") if no session
  → prisma.practiceResult.findMany({ where: { userId }, include: { practiceTest, examSession } })
  → Maps results to render-ready shape
  → Returns JSX → streamed HTML response
```

No API route is used by this page. The page talks to the database directly via Prisma. The REST API route (`GET /api/student/results`) exists for potential future client-side use (e.g., a mobile app) but is not consumed here.

---

## Component Tree

```
StudentLayout (RSC)
  └── StudentNavbar (Client — "use client")
  └── <main>
        └── StudentResultsPage (RSC)
              ├── [header icon badge]          (div/span — pure HTML)
              ├── [h1 page title]              (pure HTML, t("myResults"))
              ├── [empty state]                (pure HTML — conditional, results.length === 0)
              └── [result list]                (conditional, results.length > 0)
                    └── Link (Next.js) × N     (one per result)
                          ├── [test title]     (pure HTML)
                          ├── ExamStatusBadge  (Client leaf)
                          ├── [subtitle]       (topic · attempt · date — pure HTML)
                          └── [score]          (pure HTML, color class conditional)
```

---

## Database Queries

### Primary Query — `prisma.practiceResult.findMany`

```typescript
prisma.practiceResult.findMany({
  where: { userId: session.user.id },
  orderBy: { completedAt: "desc" },
  include: {
    practiceTest: {
      select: { id: true, title: true, topic: { select: { title: true } } },
    },
    examSession: {
      select: { status: true, attemptNumber: true },
    },
  },
})
```

**Tables touched:** `practice_results` (primary), `practice_tests` (join), `topics` (join via practiceTest), `exam_sessions` (left join).

**Index usage:**
- `practice_results.user_id` — should have an index; Prisma creates one via the `@relation` FK. For high-cardinality `userId` values (large student bodies), an explicit compound index `(user_id, completed_at DESC)` would improve this query.
- `exam_sessions.practice_result_id` — `@unique` constraint provides an index; the `findMany` join uses this to look up sessions.

**Row count:** Bounded by the number of tests a student has ever submitted. Expected: < 100 rows per student in typical usage.

**Performance target:** < 50ms on a warm Postgres connection.

---

## API Dependencies

The page does **not** call any API routes. It uses Prisma directly.

The REST API at `GET /api/student/results` mirrors the same query logic and is available for:
- Future mobile clients.
- `SWR` / `React Query` refetches if the listing page is ever converted to a hybrid component.
- Third-party integrations.

**API response shape** (for documentation completeness):
```typescript
{
  id: string;
  testName: string;
  topicName: string;
  score: number;            // integer, 0–100
  correctCount: number;
  totalQuestions: number;
  completedAt: string;      // ISO 8601
  sessionStatus: "DOING" | "GRADING" | "GRADED";
  attemptNumber: number;
  gradedAt: string | null;
}[]
```

---

## State Management

The page is a server component — **no client-side state**. There is no `useState`, `useReducer`, or context. The entire page is stateless per request.

Future enhancements that would introduce client state:
- **Client-side filter/search**: a `"use client"` wrapper around a controlled `<input>` for filtering by test name or topic. This would require the page to become a hybrid (server renders the list, client wrapper adds interactivity).
- **Pagination**: a client `<Pagination>` component receiving `page` from a search param, with the RSC re-rendering server-side on navigation.

---

## Styling

### Design Tokens (from codebase conventions)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#f8f9ff` | Layout shell |
| Card bg | `#ffffff` | Result rows |
| Card shadow | `0_4px_16px_rgba(18,28,42,0.04)` | Resting |
| Card hover shadow | `0_8px_24px_rgba(94,53,241,0.06)` | On hover |
| Primary text | `#121c2a` | Test titles |
| Secondary text | `#777586` | Subtitles, dates |
| Muted text | `#c7c4d7` | Empty state, chevron |
| Score green | `#1b6b51` | score >= 80 |
| Score purple | `#2a14b4` | 50 <= score < 80 |
| Score red | `#7b0020` | score < 50 |
| Brand purple | `#5e35f1` | ExamStatusBadge GRADED background tint |
| Font | `font-body` | All text |

### Tailwind Class Groups

**Card:**
```
bg-white rounded-2xl p-5
shadow-[0_4px_16px_rgba(18,28,42,0.04)]
hover:shadow-[0_8px_24px_rgba(94,53,241,0.06)]
transition-all
```

**Score (green):** `text-2xl font-body font-bold text-[#1b6b51]`
**Score (purple):** `text-2xl font-body font-bold text-[#2a14b4]`
**Score (red):** `text-2xl font-body font-bold text-[#7b0020]`

**Header icon badge:**
```
w-10 h-10 rounded-xl bg-[#e3dfff]
flex items-center justify-center
```

---

## i18n

### Namespace: `"student"`

| Key | Value (en) | Usage |
|-----|-----------|-------|
| `student.myResults` | "My Results" | Page `<h1>` heading |

### Namespace: `"exam"` (consumed by `ExamStatusBadge`)

| Key | Value (en) | Badge state |
|-----|-----------|------------|
| `exam.statusAvailable` | "Available" | `ACTIVE` |
| `exam.statusUnavailable` | "Unavailable" | `INACTIVE` |
| `exam.statusInProgress` | "In Progress" | `DOING` |
| `exam.statusAwaitingGrade` | "Awaiting Grade" | `GRADING` |
| `exam.statusViewResults` | "View Results" | `GRADED` |

### Hardcoded Strings (future i18n migration)

The following strings are currently hardcoded in English and should be moved to the `"student"` namespace:

| Current text | Suggested key |
|-------------|---------------|
| "No test results yet" | `student.noResultsYet` |
| "Complete a test to see your results here" | `student.noResultsHint` |
| "Attempt {n}" | `student.attemptLabel` (with `{count}` interpolation) |

---

## Error Handling

| Error scenario | Handling mechanism |
|---------------|-------------------|
| Unauthenticated request | `redirect("/login")` in both layout and page |
| Database connection failure | Next.js error boundary (`src/app/error.tsx`) catches uncaught Prisma errors; renders an error UI with a "Try again" button |
| `practiceTest` or `topic` missing (orphaned result) | Would throw a null-access error in the render loop — the `.map()` would crash on `r.practiceTest.title`. Mitigation: add a DB-level `onDelete: Cascade` on `practiceResults.practiceTestId` (already present in schema) to prevent orphans |
| `examSession` is null | Handled explicitly: `r.examSession?.status \|\| "GRADED"` defaults gracefully |
| Network timeout mid-render | Next.js aborts the render and returns a 500; error boundary activates on client |

---

## Performance

### Bottlenecks & Mitigations

| Concern | Current behavior | Recommended fix |
|---------|-----------------|-----------------|
| No pagination | All results loaded in one query | Add `take`/`skip` with a `?page=` search param once student result counts grow |
| Sequential DB access | Layout auth → Page auth → Page query (3 round trips) | Acceptable at current scale; layout and page auth calls could be memoized in a future Next.js version |
| No query cache | Fresh DB hit per request | Add `unstable_cache` with a `["results", userId]` tag for 10s stale-while-revalidate if result freshness < 10s is acceptable |
| `toLocaleDateString()` called in a loop | Minor CPU cost, not a bottleneck | Accept as-is |

### Loading State
The `loading.tsx` sibling (to be implemented) should render a skeleton that mirrors the card structure: a header placeholder + N animated pulse cards. This renders immediately via Next.js Suspense before the Prisma query completes.

### Streaming
Because `StudentResultsPage` is a direct RSC with no `<Suspense>` boundaries inside it, the entire page output is rendered in one server pass and streamed as a single chunk. For the listing page this is appropriate — the list is either there or it is not. The `StudentNavbar` in the layout streams ahead of the page content.
