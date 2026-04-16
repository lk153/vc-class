# TDD — Teacher Dashboard

**Feature:** Teacher Dashboard
**Route:** `/teacher`
**Last Updated:** 2026-04-15
**Status:** Implemented

---

## 1. Architecture Overview

The Teacher Dashboard is a **Next.js 16 App Router Server Component**. There is no client-side state, no API route, and no data-fetching hook. The entire data pipeline runs on the server during the render cycle and the resulting HTML is streamed to the browser.

```
Browser request → Next.js Edge/Node runtime
  → src/app/teacher/layout.tsx   (auth + role check, wraps with TeacherShell)
    → src/app/teacher/page.tsx   (data fetch, render)
      → Prisma (PostgreSQL)
```

The page does **not** use:
- `"use client"` directive
- `useEffect`, `useState`, `useSWR`, or any client-side fetch
- Route handlers (`/api/...`)
- React Server Actions

---

## 2. Route & Data Flow

### 2.1 URL

```
GET /teacher
```

No dynamic segments, no search params consumed by this page.

### 2.2 Request Lifecycle

```
1. Request arrives at /teacher
2. layout.tsx:
   a. auth() → session (NextAuth, reads JWT/session cookie)
   b. !session.user → redirect("/login")
   c. session.user.role !== "TEACHER" → redirect("/topics")
   d. Renders <TeacherShell user={session.user}>{children}</TeacherShell>
3. page.tsx:
   a. auth() (second call — reads same session, no extra network hop)
   b. !session?.user → redirect("/login")  [defensive, layout already guards]
   c. getTranslations("teacher") → loads locale JSON
   d. prisma.classEnrollment.findMany(...)  [Query 1]
   e. Promise.all([
        prisma.topic.count(...)             [Query 2a]
        prisma.practiceResult.findMany(...) [Query 2b]
      ])
   f. Build stats array, compute getScoreColor / getScoreDot per result
   g. Return JSX → streamed HTML
```

### 2.3 Auth Double-Call Note

`layout.tsx` and `page.tsx` both call `auth()`. NextAuth caches the session token parse within a single request via `React.cache` (or the adapter's request-scoped cache), so this is effectively zero additional overhead.

---

## 3. Component Tree

```
TeacherLayout (src/app/teacher/layout.tsx)         [Server Component]
  TeacherShell (src/components/teacher/TeacherShell.tsx)  ["use client"]
    TeacherSidebar (src/components/teacher/Sidebar.tsx)   ["use client"]
      <aside> — nav links, brand, "Create New Topic" CTA
    AccountInfo (src/components/teacher/AccountInfo.tsx)   ["use client"]
      LocaleSwitcher (src/components/LocaleSwitcher.tsx)
      LogoutOverlay (src/components/LogoutOverlay.tsx)
    <main>
      TeacherDashboard (src/app/teacher/page.tsx)    [Server Component]
        <div> page header (h1 + subtitle)
        <div> stats grid (3 × StatCard inline JSX)
        <div> results card
          <table> (or empty state <p>)
            <thead> column headers
            <tbody> result rows
              result row (per PracticeResult)
```

No named sub-components are extracted for the stats cards or table rows — they are rendered inline within `TeacherDashboard`. This is intentional for a page-scoped Server Component where co-location avoids prop-drilling without adding files.

---

## 4. Database Queries

### 4.1 Query 1 — Enrollment Fetch

```ts
const enrollments = await prisma.classEnrollment.findMany({
  where: { class: { teacherId: session.user.id } },
  include: { user: { select: { id: true, status: true } } },
});
```

**Purpose:** Retrieve all enrolled students (and their status) across all classes owned by the authenticated teacher.

**Tables touched:** `class_enrollments JOIN classes JOIN users`

**Deduplication (in-memory):**
```ts
const studentMap = new Map<string, { id: string; status: string }>(
  enrollments.map(e => [e.userId, e.user])
);
const uniqueStudents = [...studentMap.values()];
```
A `Map` keyed by `userId` collapses duplicate entries when a student is enrolled in more than one of the teacher's classes.

**Derived values:**
- `totalStudents = uniqueStudents.length`
- `activeStudents = uniqueStudents.filter(s => s.status === "ACTIVE").length`

**Index requirements:** `class_enrollments.class_id`, `classes.teacher_id` should be indexed. The `@@unique([classId, userId])` constraint on `ClassEnrollment` provides the `class_id` index implicitly.

---

### 4.2 Query 2a — Topic Count

```ts
prisma.topic.count({ where: { createdById: session.user.id } })
```

**Purpose:** Count topics authored by the teacher.

**Tables touched:** `topics`

**Index requirements:** `topics.created_by_id` should be indexed.

---

### 4.3 Query 2b — Recent Results

```ts
prisma.practiceResult.findMany({
  where: { userId: { in: uniqueStudents.map(s => s.id) } },
  take: 10,
  orderBy: { completedAt: "desc" },
  include: {
    user: { select: { name: true, email: true } },
    practiceTest: {
      select: {
        title: true,
        topic: { select: { title: true, language: { select: { name: true } } } },
      },
    },
  },
})
```

**Purpose:** Fetch the ten most recent submissions by the teacher's students.

**Tables touched:** `practice_results JOIN users JOIN practice_tests JOIN topics JOIN languages`

**Edge case — empty student set:** When `uniqueStudents` is empty, `{ in: [] }` is passed. Prisma translates this to `WHERE user_id = ANY(ARRAY[]::text[])` which returns 0 rows immediately without a full table scan on most PostgreSQL versions. No special guard is needed in application code.

**Index requirements:** `practice_results.user_id`, `practice_results.completed_at` (DESC). A composite index on `(user_id, completed_at DESC)` is optimal for this query pattern.

---

### 4.4 Parallelism

Queries 2a and 2b run in parallel via `Promise.all`. Query 1 must complete first because its result (`uniqueStudents`) is required as input to Query 2b. The minimum latency is therefore:

```
Total = latency(Q1) + max(latency(Q2a), latency(Q2b))
```

---

## 5. API Dependencies

| Dependency | Version | Usage |
|------------|---------|-------|
| `next-auth` | (project-pinned) | `auth()` for session retrieval |
| `@prisma/client` | (project-pinned) | All DB queries via `prisma` singleton |
| `next-intl` | (project-pinned) | `getTranslations("teacher")` server-side |
| `next/navigation` | Next.js 16 | `redirect()` |
| `next/link` | Next.js 16 | `<Link>` client navigation |

No external HTTP calls or third-party APIs are made by this page.

---

## 6. State Management

This page is a pure Server Component. There is no client-side state on the page itself.

Client-side state that exists within parent/sibling components (TeacherShell scope):

| State | Owner | Type | Purpose |
|-------|-------|------|---------|
| `sidebarOpen` | `TeacherShell` | `boolean` | Controls mobile sidebar visibility |
| `loggingOut` | `AccountInfo` | `boolean` | Triggers `LogoutOverlay` during sign-out |

Neither state variable affects the data rendered by the Dashboard page component.

---

## 7. Styling & Responsive Design

### 7.1 Design Tokens (Colors)

| Token | Hex | Usage |
|-------|-----|-------|
| Primary text | `#121c2a` | Page title, stat values, student names |
| Secondary text | `#464554` | Subtitle, table column headers |
| Muted text | `#777586` | Stat labels, date column, empty state |
| Brand purple | `#2a14b4` | Total Students card, score dot, avatar text, "View All" hover |
| Brand purple light | `#e3dfff` / `#eff4ff` | Student card icon bg, avatar bg, table header hover |
| Success green | `#1b6b51` | Active Students card, score >= 90, language badge text |
| Success green light | `#a6f2d1/40` | Active Students icon bg, language badge bg |
| Danger red | `#7b0020` | Total Topics card, score < 70 |
| Danger red light | `#ffdada/40` | Total Topics icon bg |
| Card shadow | `rgba(0,0,0,0.06)`, `rgba(0,0,0,0.1)` | M3 elevated card shadow |

### 7.2 Typography

All text uses the `font-body` Tailwind class (mapped to the project's body typeface). No additional font files are loaded by this page.

### 7.3 Responsive Breakpoints

| Element | Mobile (default) | sm (640px+) | lg (1024px+) |
|---------|-----------------|-------------|--------------|
| Page padding | `px-4` | — | `px-12` |
| Stats grid | `grid-cols-1` | `grid-cols-3` | — |
| Section title | `text-xl` | `text-2xl` | — |
| "View All" pill | `px-3 py-1.5 text-[13px]` | `px-4 py-2 text-[14px]` | — |
| Sidebar | Hidden (drawer) | — | Always visible (`lg:sticky`) |
| AccountInfo name | Hidden | Visible (`sm:block`) | — |
| Results table | Horizontal scroll | Horizontal scroll | Full width |

### 7.4 Score Color Helper Functions

```ts
function getScoreColor(score: number): string {
  if (score >= 90) return "text-[#1b6b51]";
  if (score >= 70) return "text-[#2a14b4]";
  return "text-[#7b0020]";
}

function getScoreDot(score: number): string {
  if (score >= 90) return "bg-[#1b6b51]";
  if (score >= 70) return "bg-[#2a14b4]";
  return "bg-[#7b0020]";
}
```

These are pure functions defined within the Server Component. They are not exported or shared. If the thresholds change in the future, extract them to a shared utility (e.g., `src/lib/scoreColors.ts`).

---

## 8. i18n Keys

All keys live in the `teacher` namespace (`messages/[locale]/teacher.json` or equivalent flat structure used by the project).

| Key | Default English Value |
|-----|-----------------------|
| `teacher.dashboard` | `Dashboard` |
| `teacher.dashboardSubtitle` | `Overview of your classes and student activity` |
| `teacher.totalStudents` | `Total Students` |
| `teacher.activeStudents` | `Active Students` |
| `teacher.totalTopics` | `Total Topics` |
| `teacher.recentResults` | `Recent Results` |
| `teacher.viewAll` | `View All` |
| `teacher.noResultsYet` | `No results yet` |
| `teacher.studentName` | `Student` |
| `teacher.testNameCol` | `Test` |
| `teacher.topicCol` | `Topic` |
| `teacher.languageCol` | `Language` |
| `teacher.scoreCol` | `Score` |
| `teacher.submittedDate` | `Submitted` |

**Sidebar keys** (used by `TeacherSidebar`, not this page directly):

| Key | Default English Value |
|-----|-----------------------|
| `common.appName` | `VC Class` |
| `teacher.teacherPortal` | `Teacher Portal` |
| `teacher.createNewTopic` | `Create New Topic` |
| `teacher.dashboard` | `Dashboard` |
| `teacher.classes` | `Classes` |
| `teacher.students` | `Students` |
| `teacher.topics` | `Topics` |
| `teacher.assignments` | `Assignments` |
| `teacher.practiceTests` | `Practice Tests` |
| `teacher.media` | `Media` |
| `teacher.studentResults` | `Student Results` |

---

## 9. Error Handling

### 9.1 Auth Failures

- `auth()` returning `null` → `redirect("/login")` fires before any Prisma call.
- Role mismatch → handled at layout level; page component is never rendered.

### 9.2 Prisma Errors

There is no try/catch wrapping the Prisma calls. Unhandled Prisma errors propagate up to the Next.js error boundary:

- **Development:** Next.js renders the error overlay with stack trace.
- **Production:** `src/app/error.tsx` (exists in the project) catches the error and renders a generic error UI.

If resilience is required in a future iteration, wrap the `Promise.all` block in try/catch and render a degraded state (e.g., stats showing `—` and a banner).

### 9.3 Missing Relations

If a `PracticeResult` row has a `practiceTest` or `topic` that was hard-deleted outside of Prisma cascades, the `include` query will throw a relation not found error. This should not occur in production because:
- `PracticeTest` → `Topic`: `onDelete: Cascade` (deleting a topic cascades to tests)
- `PracticeResult` → `PracticeTest`: `onDelete: Cascade` (deleting a test cascades to results)

No application-level guard is needed.

### 9.4 Score Display

`result.score` is a `Float` from Prisma. `Math.round(result.score)` is called before rendering to avoid floating-point display artifacts (e.g., `83.33333...%`).

---

## 10. Performance Considerations

### 10.1 Query Optimization

- The enrollment query fetches only `id` and `status` from the `users` table (via `select`), minimizing data transfer.
- The results query fetches only `name` and `email` from `users`, and `title` from `practiceTest`, `topic`, and `language`. Deep nested `select` prevents over-fetching.
- `take: 10` on the results query caps the result set regardless of submission volume.

### 10.2 Caching

This page has no explicit `cache` or `revalidate` configuration. It runs on-demand (dynamic rendering) because:
- It calls `auth()`, which reads a request cookie and opts the route into dynamic rendering automatically.

If the stats data is acceptable with a delay, a future optimization could add `export const revalidate = 60` and move the auth check to middleware, converting this to ISR.

### 10.3 Streaming

Next.js App Router supports streaming via `<Suspense>`. Currently, the entire page is rendered as one block. If DB queries become slow, consider splitting into:
- Immediate shell render (TeacherShell + page header)
- Suspense boundary around stats cards (deferred)
- Suspense boundary around results table (deferred)

`src/app/teacher/loading.tsx` already exists and provides the route-level loading skeleton shown during initial navigation.

### 10.4 Bundle Impact

The page is a Server Component and contributes zero JavaScript to the client bundle. `TeacherShell`, `TeacherSidebar`, and `AccountInfo` are `"use client"` but are already included in the layout bundle shared across all teacher routes. The incremental JS cost of visiting this page from another teacher route is zero.

### 10.5 Avatar Initials

Initials are computed inline per row:
```ts
const initials = (result.user.name as string)
  .split(" ")
  .map((n: string) => n[0])
  .join("")
  .slice(0, 2);
```
This is O(n) string work on a 10-row result set — negligible. No image loading occurs for avatars.
