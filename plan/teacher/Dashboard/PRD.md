# PRD — Teacher Dashboard

**Feature:** Teacher Dashboard (main landing page after login)
**Route:** `/teacher`
**Last Updated:** 2026-04-15
**Status:** Implemented

---

## 1. Overview

The Teacher Dashboard is the primary entry point for authenticated teachers within the VC Class platform. It provides an at-a-glance overview of class health, student engagement, and recent assessment activity. The page surfaces three key metrics and a table of the ten most recent student test submissions, enabling teachers to quickly identify struggling students and navigate to detailed result views without leaving the dashboard.

---

## 2. User Stories

### 2.1 Core Stories

**US-01 — At-a-Glance Metrics**
As a teacher, I want to see the total number of students enrolled across all my classes, the number of currently active students, and the number of topics I have created, so that I can understand the current state of my program at a glance without navigating to multiple pages.

**US-02 — Recent Submission Feed**
As a teacher, I want to see the ten most recent student practice-test submissions, ordered by submission date (newest first), so that I can quickly spot who has just completed work and whether they need follow-up.

**US-03 — Score Interpretation**
As a teacher, I want scores to be color-coded (green for strong performance, purple for satisfactory, red for low performance) so that I can visually scan the results table and identify struggling students without reading each individual percentage.

**US-04 — Navigate to Full Results**
As a teacher, I want a "View All" link on the recent results section that takes me to the Student Results page, so that I can access the full submission history when I need it.

**US-05 — Empty State Awareness**
As a teacher with no students yet enrolled or no results submitted, I want to see a friendly empty-state message instead of a broken or blank table, so that I understand the feature and am not confused by missing data.

**US-06 — Auth Protection**
As a platform admin, I want unauthenticated users and non-teacher accounts to be redirected away from this page so that student data is never exposed to the wrong audience.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement |
|----|-------------|
| FR-01 | The page must check for an active session via `auth()`. If no session exists, redirect to `/login`. |
| FR-02 | Authorization is enforced at the layout level (`src/app/teacher/layout.tsx`). Users whose `role` is not `TEACHER` are redirected to `/topics`. The page itself may rely on this guarantee but should not duplicate the redirect. |

### 3.2 Stats Cards

| ID | Requirement |
|----|-------------|
| FR-03 | Display **Total Students**: the count of unique users enrolled in any class where `class.teacherId === session.user.id`. A student enrolled in multiple classes counts once. |
| FR-04 | Display **Active Students**: the subset of unique enrolled students whose `User.status === "ACTIVE"`. |
| FR-05 | Display **Total Topics**: `COUNT` of `Topic` records where `Topic.createdById === session.user.id`. |
| FR-06 | Stats are computed server-side and rendered as static numbers; there is no real-time update or polling. |

### 3.3 Recent Results Table

| ID | Requirement |
|----|-------------|
| FR-07 | Fetch up to 10 `PracticeResult` records where `userId` is in the set of unique enrolled student IDs, ordered by `completedAt DESC`. |
| FR-08 | Each row must display: student avatar initials, student full name, test title (`practiceTest.title`), topic title (`practiceTest.topic.title`), language name (`practiceTest.topic.language.name`), score as a rounded integer percentage, and completion date. |
| FR-09 | Score thresholds for color-coding: `score >= 90` → green (`#1b6b51`); `70 <= score < 90` → purple (`#2a14b4`); `score < 70` → red (`#7b0020`). A color-matched dot precedes the percentage text. |
| FR-10 | Each result row is a link (or contains a link) to the Student Result detail page at `/teacher/student-results/[resultId]`. |
| FR-11 | If `recentResults.length === 0`, render a localized empty-state message in place of the table. |
| FR-12 | If `uniqueStudents.length === 0`, the results fetch returns an empty array naturally; no special query path is needed, but the empty-state message must still render. |

### 3.4 Navigation

| ID | Requirement |
|----|-------------|
| FR-13 | The "View All" button links to `/teacher/student-results`. |
| FR-14 | All navigation is handled with Next.js `<Link>` for client-side transitions. |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | All data is fetched in a single async block using `Promise.all` for parallel queries (topics count + recent results). Enrollment fetch is a prerequisite and runs first. Total DB round-trips: 2 sequential stages. |
| NFR-02 | Security | The page is a Next.js Server Component. No student data is exposed via a client-accessible API route. Prisma queries are scoped to `session.user.id`. |
| NFR-03 | Accessibility | Score color is not the sole indicator of performance — a colored dot and text percentage both appear, and the table has semantic `<thead>` / `<tbody>` structure with readable column headers. |
| NFR-04 | Internationalisation | All user-visible strings are served through `next-intl` using the `teacher` translation namespace. No hardcoded English strings appear in JSX. |
| NFR-05 | SEO | The page exports `metadata: { title: "Dashboard" }`. The layout sets `robots: { index: false, follow: false }` to prevent indexing of teacher-only content. |
| NFR-06 | Responsiveness | The stats grid switches from a single column on mobile to three columns (`sm:grid-cols-3`) on tablet and above. The results table scrolls horizontally on small screens (`overflow-x-auto`, `min-w-[650px]`). |

---

## 5. UI/UX Requirements

### 5.1 Layout

The page renders inside `TeacherShell`, which provides:
- A fixed left sidebar (width `w-64`, background `#eff4ff`) with logo, "Create New Topic" CTA, and navigation links.
- A sticky top header (`AccountInfo`) containing the locale switcher, teacher name, avatar initials, and logout button.
- A `<main>` content area with horizontal padding (`px-4 md:px-8 lg:px-12`) and bottom padding (`pb-10`).

### 5.2 Page Header

- `<h1>` with the translated `teacher.dashboard` key, `font-bold text-3xl text-[#121c2a]`.
- Subtitle paragraph using the `teacher.dashboardSubtitle` key, `text-[#464554]`.
- Margin bottom `mb-10` before the stats grid.

### 5.3 Stats Cards (M3 Elevated Style)

Three cards in a responsive grid (`grid gap-4 grid-cols-1 sm:grid-cols-3`):

| Stat | Icon (Material Symbols) | Icon Bg | Icon Color | Bar Color |
|------|------------------------|---------|------------|-----------|
| Total Students | `group` | `#e3dfff` | `#2a14b4` | `#2a14b4` |
| Active Students | `verified` | `#a6f2d1/40` | `#1b6b51` | `#1b6b51` |
| Total Topics | `menu_book` | `#ffdada/40` | `#7b0020` | `#7b0020` |

Each card:
- `bg-white`, `rounded-2xl`, M3 box-shadow (`0_1px_3px_1px_rgba(0,0,0,0.06), 0_1px_2px_0_rgba(0,0,0,0.1)`).
- `p-5`, flex row with icon square (`w-10 h-10 rounded-lg`) and a text block (value in `text-2xl font-bold`, label in `text-[10px] uppercase tracking-widest text-[#777586]`).
- A decorative 3px bottom bar spanning full width, using a tinted background and a solid foreground div.

### 5.4 Recent Results Table

- Card container: same M3 elevated white card, `p-4 md:p-8`.
- Header row: section title on the left (`text-xl sm:text-2xl font-bold`), "View All" pill button on the right (`bg-[#eff4ff]`, hover fills `#2a14b4` with white text, transition).
- `<table>` with `min-w-[650px]` inside `overflow-x-auto`.
- `<thead>` uses `border-b border-[#c7c4d7]/20`; column headers are `text-sm uppercase tracking-widest text-[#464554] font-extrabold`.
- `<tbody>` rows: `divide-y divide-[#c7c4d7]/10`, hover state `hover:bg-[#eff4ff]/30`.
- Student column: circular avatar (`w-9 h-9 rounded-full bg-[#e3dfff]`) with 2-character initials in `text-[#2a14b4]`, followed by name.
- Language column: pill badge (`text-[10px] uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-3 py-1 rounded-full`).
- Score column: right-aligned, colored dot + colored percentage (`text-lg`).
- Date column: right-aligned, `text-xs text-[#777586]`, using `toLocaleDateString()`.

### 5.5 Empty State

When no results exist, render a `<p className="text-sm text-[#777586] font-body">` with the `teacher.noResultsYet` translation key. No illustration or CTA is required on this page.

---

## 6. Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | Teacher has no classes | `enrollments` is empty; `uniqueStudents = []`; all three stats show `0`; results table shows empty state. |
| EC-02 | Teacher has classes but no enrolled students | Same as EC-01. `prisma.classEnrollment.findMany` returns `[]`. |
| EC-03 | All enrolled students are INACTIVE | `totalStudents > 0`, `activeStudents = 0`. |
| EC-04 | Student enrolled in multiple classes | `Map` deduplication ensures each unique `userId` is counted once for both total and active counts. |
| EC-05 | A `PracticeResult` references a deleted student | Prisma cascade deletes results on user deletion (`onDelete: Cascade`), so orphaned results cannot appear. |
| EC-06 | Score is exactly 90 | Treated as green (>= 90 threshold). |
| EC-07 | Score is exactly 70 | Treated as purple (70 <= score < 90 threshold). |
| EC-08 | Score rounds to 100 via `Math.round` | Renders as `100%` — valid, no special case needed. |
| EC-09 | Student name is a single word (no space) | `split(" ").map(n => n[0]).join("").slice(0,2)` yields a single character; avatar displays one letter — acceptable. |
| EC-10 | Teacher has no topics | `totalTopics = 0`, card displays `0`. |
| EC-11 | Locale is non-English | `getTranslations("teacher")` resolves the correct locale file; all labels render in the active locale. |
| EC-12 | Session expires mid-render | `auth()` returns `null`; `redirect("/login")` fires before any DB query. |

---

## 7. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Page load time (TTFB) | < 800ms on a warm DB connection | Server-side timing logs / Vercel analytics |
| DB query count | <= 2 round-trips per page render | Prisma query logging in development |
| Zero client-side data fetches | 0 `useEffect` / SWR / fetch calls | Code review / bundle analysis |
| Auth redirect correctness | 100% of non-teacher requests redirected | E2E tests (Playwright) |
| Empty state coverage | Renders correctly for 0 students and 0 results | Unit / integration tests |
| Score color accuracy | Correct threshold applied for all boundary values | Unit tests on `getScoreColor` / `getScoreDot` |
| i18n coverage | No hardcoded strings; all keys present in both locale files | CI lint / next-intl type check |
