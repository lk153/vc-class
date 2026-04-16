# PRD: Student Results — Listing Page

**Route:** `/results`
**Component:** `src/app/(student)/results/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Student Results page is a chronological ledger of every test the student has ever submitted. It serves two distinct roles: a **progress dashboard** (how am I doing overall?) and a **navigation hub** (let me review a specific attempt). Each row in the list surfaces just enough signal — test name, topic, date, score, and status — to let the student decide at a glance whether a result warrants further review.

The page is a React Server Component that queries the database directly, so no client-side fetch or loading spinner is needed for the initial render. The student layout (`bg-[#f8f9ff]`, sticky `StudentNavbar`, `max-w-screen-2xl`) wraps all content; the page itself is constrained to `max-w-4xl`.

Color-coding makes the score instantly parseable: green (≥ 80%) signals mastery, purple (50–79%) signals developing competence, and red (< 50%) signals a topic that needs re-study. The `ExamStatusBadge` component overlays session lifecycle context (DOING, GRADING, GRADED) so students understand whether they are still waiting for a teacher to grade their work or can already read the verdict.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Student | See a list of every test I have submitted | I have a single place to track my entire assessment history |
| US-02 | Student | See the score for each result, color-coded by performance band | I can immediately identify which tests I passed, which need improvement, and which I am still waiting on |
| US-03 | Student | See the topic and test name for each result | I can connect the score to the content I studied |
| US-04 | Student | See the submission date for each result | I can understand my learning trajectory over time |
| US-05 | Student | See the session status badge (e.g., Awaiting Grade, View Results) | I know whether my teacher has finished grading a specific attempt |
| US-06 | Student | Click any result row to open its detail page | I can drill down into question-by-question feedback |
| US-07 | Student | See my attempt number when I have retaken a test | I can distinguish between first and subsequent attempts |
| US-08 | Student | See a clear empty state when I have no results | I understand the page is working but I simply have not taken any tests yet |
| US-09 | Student | See results ordered most-recent first | The list reflects my current state without having to scroll to the bottom |

---

## Functional Requirements

### FR-01: Authentication & Authorization
- The page is only accessible to authenticated users.
- The parent layout (`src/app/(student)/layout.tsx`) guards the route with `auth()` and redirects unauthenticated users to `/login`.
- The page performs a defense-in-depth re-check: `if (!session?.user) redirect("/login")`.
- Results are scoped strictly to `where: { userId: session.user.id }` — a student can never see another student's results.

### FR-02: Data Fetching
- Results are fetched via a single Prisma query on `PracticeResult` with the following includes:
  - `practiceTest`: `{ id, title, topic: { title } }` — for display in the list row.
  - `examSession`: `{ status, attemptNumber }` — for the status badge and attempt label.
- Results are ordered `{ completedAt: "desc" }` — newest first.
- The query runs at request time (no caching layer); page is always fresh.

### FR-03: Score Display & Color Coding
- Score is computed as `Math.round(r.score)` (stored as a float in the DB, displayed as an integer percentage).
- Color thresholds applied via Tailwind class selection:
  - `score >= 80` → `text-[#1b6b51]` (green)
  - `score >= 50 && score < 80` → `text-[#2a14b4]` (brand purple)
  - `score < 50` → `text-[#7b0020]` (red)
- These thresholds are applied consistently across the listing row and the detail page.

### FR-04: Status Badge
- `ExamStatusBadge` is rendered with `testStatus="ACTIVE"` (fixed, since these are completed results) and `sessionStatus={r.examSession?.status || "GRADED"}`.
- If `examSession` is null, the session status defaults to `"GRADED"` (handles legacy results created before the `ExamSession` model was introduced).
- The badge is always visible beside the test title.

### FR-05: Attempt Number Label
- If `r.examSession?.attemptNumber > 1`, the subtitle appends ` · Attempt {n}`.
- If `attemptNumber === 1` or the session is null, no attempt label is shown.

### FR-06: Date Formatting
- Date is formatted using `new Date(r.completedAt).toLocaleDateString()`, which uses the browser/server locale.
- Displayed in the subtitle beneath the test title.

### FR-07: Navigation to Detail
- Each result row is wrapped in a `<Link href={/results/${r.id}}>` using the Next.js `Link` component.
- The entire card is clickable — no sub-targets inside the row link.

### FR-08: Empty State
- When `results.length === 0`, a centered empty state is displayed:
  - `quiz` icon (Material Symbols, 5xl, `text-[#c7c4d7]`).
  - Primary message: "No test results yet" (`text-base text-[#777586]`).
  - Secondary hint: "Complete a test to see your results here" (`text-sm text-[#c7c4d7]`).
- No action button or navigation link is shown in the empty state.

### FR-09: Page Metadata
- `export const metadata: Metadata` sets:
  - `title: "My Results"`.
  - `description: "View your test results and teacher feedback."`.

### FR-10: i18n
- Page heading uses `t("myResults")` from the `"student"` namespace.
- Empty state strings are currently hardcoded in English; these should be migrated to i18n keys in a future pass.

---

## Non-Functional Requirements

### NFR-01: Performance
- The page is a React Server Component — zero client-side JavaScript is needed for the initial render.
- The single Prisma query with two lightweight includes is expected to complete in < 50ms for typical student result counts (< 100 rows).
- The `loading.tsx` sibling file provides an immediate skeleton via Next.js streaming.

### NFR-02: Security
- `userId` filter on the Prisma query ensures horizontal data isolation.
- No student can access another student's result IDs via this page — the list only contains IDs owned by the authenticated user.
- Result IDs are cuid format, providing sufficient entropy against enumeration attacks.

### NFR-03: Scalability
- For high-volume students (e.g., > 500 attempts), the query should be paginated. The current implementation loads all results in a single query — acceptable for the expected scale (< 50 attempts per student) but flagged for future pagination work.

### NFR-04: Accessibility
- Each result row is a native `<a>` element (via `<Link>`) — keyboard navigable and screen-reader accessible.
- Score is presented as text, not solely as color; color alone is never the only differentiator.
- The page heading is an `<h1>`, result titles are `<h3>` — correct heading hierarchy.

### NFR-05: Internationalisation
- The page heading and any future button labels use `getTranslations("student")` server-side.
- `ExamStatusBadge` uses `useTranslations("exam")` client-side.
- Date formatting is locale-aware via `toLocaleDateString()` (inherits system locale; for explicit locale control, pass `locale` from `next-intl` in a future pass).

---

## UI/UX Requirements

### Layout
- Page wrapper: `max-w-4xl mx-auto px-4 py-8`.
- Header row: flex, `gap-3`, `mb-8` — icon badge + `<h1>`.
- Result list: `space-y-3` (12px between cards).

### Page Header
- Icon badge: `w-10 h-10`, `rounded-xl`, `bg-[#e3dfff]`, centered `assessment` icon `text-[20px] text-[#2a14b4]`.
- Title: `text-2xl font-body font-bold text-[#121c2a]`.

### Result Card
- Background: `bg-white`, `rounded-2xl`, `p-5`.
- Shadow: `shadow-[0_4px_16px_rgba(18,28,42,0.04)]` at rest.
- Hover: `shadow-[0_8px_24px_rgba(94,53,241,0.06)]`, smooth `transition-all`.
- Internal layout: flex row, `justify-between`, `gap-4`.
- Left column (test info): `min-w-0 flex-1`.
  - Top row: flex, `gap-2`, `mb-1` — test title + status badge, title `truncate`.
  - Subtitle: `text-xs font-body text-[#777586]` — topic · attempt (optional) · date.
- Right column (score + chevron): `flex items-center gap-4 shrink-0`.
  - Score: `text-2xl font-body font-bold`, color from thresholds above.
  - Chevron: `chevron_right` icon, `text-[#c7c4d7] text-[18px]`.

### Empty State
- Wrapper: `text-center py-16`.
- Icon: `text-5xl text-[#c7c4d7] block mb-4`.
- Primary text: `text-base font-body text-[#777586]`.
- Secondary text: `text-sm font-body text-[#c7c4d7] mt-1`.

---

## Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Student has never submitted a test | Empty state is shown; no list is rendered |
| `examSession` is null (legacy result) | `sessionStatus` defaults to `"GRADED"`, badge shows "View Results" |
| `examSession.status === "GRADING"` | Badge shows "Awaiting Grade"; result is still listed (partial data visible) |
| `examSession.status === "DOING"` | Badge shows "In Progress"; result row is still clickable (detail page handles DOING state) |
| Score is exactly 80 | Color is green (threshold is `>= 80`) |
| Score is exactly 50 | Color is purple (threshold is `>= 50`) |
| `score === 0` | Shown as "0%", color is red |
| `score === 100` | Shown as "100%", color is green |
| `attemptNumber === 1` | No attempt label appended to subtitle |
| `attemptNumber > 1` | Subtitle includes ` · Attempt {n}` |
| Very long test title | `truncate` prevents layout overflow; full title visible on detail page |
| Student has > 50 results | All results load (no pagination). Performance degrades gracefully but pagination is a recommended future improvement |
| Database query fails | Next.js error boundary (`src/app/error.tsx`) catches and renders the error fallback |
| Session expires between navigation and render | `redirect("/login")` fires server-side; no content is exposed |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Page render time (TTFB) | < 300ms (P95) | Server-side timing / Vercel Analytics |
| Click-through rate to detail page | > 70% of result page sessions | Path analytics |
| Empty state display rate | Decreases over time as students take tests | Server-side logging |
| Zero JS errors on page | 0 client errors | Sentry |
| Accessibility score | >= 90 (Lighthouse) | Lighthouse CI |
| Correct score color coding | 100% accuracy against threshold logic | Automated snapshot test |
