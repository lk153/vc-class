# PRD: Teacher Student Results Listing Page

**Route:** `/teacher/student-results`
**Component:** `src/app/teacher/student-results/page.tsx`
**Client Component:** `src/components/teacher/StudentResultsTable.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Student Results Listing page is the teacher's primary hub for monitoring assessment outcomes across their enrolled students. It aggregates every `PracticeResult` belonging to students in the teacher's classes, presents them in a filterable, paginated table, and provides fast entry points into individual result detail views.

The page is the operational heart of the post-assessment workflow: teachers use it to identify submissions that need manual grading (CUE_WRITING questions), spot students who struggled, and bulk-clean stale data. The table's status column and tab-switch indicator are the first signals in the grading pipeline — from here, teachers drill into `ResultDetailModal` (quick review) or the full detail page at `/teacher/student-results/[resultId]`.

Because result data changes frequently (students submit tests continuously), this page is client-rendered: `StudentResultsTable` is a `"use client"` component that fetches `GET /api/teacher/student-results` on mount and after every filter change, ensuring the teacher always sees fresh data without a full page reload.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Teacher | See all my students' test results in one table | I have a single place to monitor assessment outcomes across all classes |
| US-02 | Teacher | Search by student name, test name, or topic | I can quickly find a specific student's submission without scrolling through all results |
| US-03 | Teacher | Filter results by a date range | I can focus on results from a specific exam period or week |
| US-04 | Teacher | Filter by status (Submitted / Awaiting Review / Graded) | I can see which results need my attention and which are already complete |
| US-05 | Teacher | See a color-coded score in each row | I can instantly identify low-scoring students who may need support |
| US-06 | Teacher | See a "Needs Grading" badge on results awaiting manual review | I can prioritize CUE_WRITING submissions that require my input before a score is finalised |
| US-07 | Teacher | See a tab-switch count with a tooltip explaining the value | I can flag potential academic integrity concerns at a glance |
| US-08 | Teacher | Click a result row to open the detail view in a modal | I can review a result without leaving the listing page |
| US-09 | Teacher | Navigate to the full detail page from the modal or table action | I can access the permanent URL for a result to bookmark or share |
| US-10 | Teacher | Select multiple results and bulk-delete them | I can remove test data (e.g. practice runs, duplicates) efficiently |
| US-11 | Teacher | See a confirmation dialog before bulk deletion | I am protected from accidentally deleting data |
| US-12 | Teacher | See the table paginate at 10 results per page | The table remains fast and readable even with hundreds of results |
| US-13 | Teacher | See a loading skeleton while data is fetching | I know the page is working and not stalled |
| US-14 | Teacher | See an empty state when no results match my filters | I understand the table is not broken — there is just no data |

---

## Functional Requirements

### FR-01: Server Component Shell
- `StudentResultsPage` (`src/app/teacher/student-results/page.tsx`) is a React Server Component.
- It renders the editorial header (`<h1>`, description paragraph) and mounts `<StudentResultsTable />` as a client island.
- No auth check in the page itself — auth is enforced by the teacher layout (`src/app/teacher/layout.tsx`).
- Metadata: `title: "Student Results"`.

### FR-02: Data Scope — Teacher-Scoped Results Only
- The API at `GET /api/teacher/student-results` returns only `PracticeResult` records belonging to students enrolled in classes where `class.teacherId === session.user.id`.
- A helper `getTeacherStudentIds(teacherId)` fetches all `ClassEnrollment` rows for the teacher's classes and returns a deduplicated `userId[]`.
- Teachers cannot access results for students outside their classes, even if the `resultId` is known.

### FR-03: Search Filter
- A text input debounced at 400ms searches across:
  - `user.name` (student name)
  - `practiceTest.title` (test name)
  - `practiceTest.topic.title` (topic name)
- Search is case-insensitive (`mode: "insensitive"` in Prisma).
- Changing the search value resets the page to 1.
- The search input shows a `search` Material Symbol icon on the left.

### FR-04: Date Range Filter
- Two `<input type="date">` fields: "From" and "To".
- Both are optional; either can be set independently.
- "From" filters `completedAt >= dateFrom`.
- "To" filters `completedAt <= dateTo + T23:59:59.999Z` (inclusive of the end date).
- Changing either date field resets page to 1.

### FR-05: Status Filter
- A `<select>` dropdown with options:
  - `""` — All statuses (default)
  - `"GRADING"` — Awaiting Review (session submitted, not yet graded by teacher)
  - `"GRADED"` — Graded (teacher has marked as graded)
  - Implicitly, results with no `examSession` (practice-mode only results) are treated as "submitted" — the filter option `""` always includes them.
- The status filter maps directly to `examSession.status` in the Prisma query.
- Changing the status filter resets page to 1.

### FR-06: Table Columns
The table renders the following columns in order:

| Column | Content | Notes |
|--------|---------|-------|
| Checkbox | Row selection for bulk actions | Indeterminate state on header when some (not all) rows selected |
| Student | `studentName` | Plain text |
| Test | `testName` | Plain text |
| Topic | `topicName` | Plain text |
| Score | `score` rounded to integer + `%` | Color-coded: ≥80 green, 50–79 purple, <50 red |
| Status | `sessionStatus` rendered as a badge | "Needs Grading" badge for `GRADING`; "Graded" for `GRADED`; "Submitted" for no session |
| Tab Switches | `tabSwitchCount` with a warning icon | Only shown when `tabSwitchCount > 0`; wrapped in `<Tooltip>` |
| Date | `completedAt` formatted as `DD/MM/YYYY` | |
| Actions | "View" button | Opens `ResultDetailModal` with the `resultId` |

### FR-07: Score Color Coding
- `score >= 80` → `text-[#1b6b51]` (green)
- `score >= 50 && score < 80` → `text-[#2a14b4]` (purple/brand)
- `score < 50` → `text-[#7b0020]` (red)

### FR-08: Status Badge Rendering
- `sessionStatus === "GRADING"` → amber badge "Needs Grading" with `pending` icon.
- `sessionStatus === "GRADED"` → green badge "Graded" with `check_circle` icon.
- `sessionStatus === null` or no session → grey badge "Submitted" with `task_alt` icon.

### FR-09: Tab Switch Indicator with Tooltip
- When `tabSwitchCount > 0`, a `warning` icon in amber is rendered in the Tab Switches column.
- The icon is wrapped in `<Tooltip>` (from `src/components/Tooltip.tsx`).
- Tooltip content: `"Left exam tab {n} time(s) — possible integrity concern"`.
- When `tabSwitchCount === 0` or null, the cell is empty.

### FR-10: Row Click → Result Detail Modal
- Clicking any cell in a result row (except the checkbox or actions button) sets `selectedResultId` to the row's `id`.
- This mounts `<ResultDetailModal resultId={selectedResultId} onClose={() => setSelectedResultId(null)} />`.
- The modal is a `ModalOverlay` (`src/components/ModalOverlay.tsx`) — full-screen overlay, click-outside to close, ESC to close.
- From within the modal, a "Open full page" link navigates to `/teacher/student-results/{resultId}`.

### FR-11: Pagination
- Page size: 10 results per page.
- Pagination controls render when `totalPages > 1`.
- Controls: "Previous" button, current page indicator (`{startItem}–{endItem} of {total}`), "Next" button.
- Previous is disabled on page 1; Next is disabled on the last page.
- Changing any filter resets to page 1 automatically.

### FR-12: Bulk Delete
- A checkbox in the table header selects/deselects all visible rows.
- Individual row checkboxes update `selectedIds: Set<string>`.
- When `selectedIds.size > 0`, a delete action bar appears above the table: `"{n} selected — Delete selected"`.
- Clicking "Delete selected" sets `showDeleteConfirm = true`, mounting a confirmation `ModalOverlay`.
- The confirmation modal shows the count of records to be deleted and "Cancel" / "Delete" buttons.
- Confirming calls `DELETE /api/teacher/student-results` with `{ ids: [...selectedIds] }` in the request body.
- On success: clears `selectedIds`, closes the modal, calls `fetchResults()` to reload the table.
- On failure: shows a `toast.error` message.
- During deletion, the "Delete" button shows a spinner and is disabled.

### FR-13: Empty State
- When `results.length === 0` and `!loading`, a centered empty state is rendered inside the table area:
  - Icon: `assignment` Material Symbol in muted color.
  - Heading: "No results found".
  - Subtext: "Try adjusting your search or filters."

### FR-14: Loading State
- While `loading === true`, a skeleton is displayed: 10 rows of shimmer placeholders matching the table's column layout.
- The filter controls remain visible and interactive during loading.

---

## Non-Functional Requirements

### NFR-01: Performance
- The API response must be ≤ 300ms (P95) for a teacher with ≤ 500 enrolled students.
- Debouncing the search input at 400ms prevents excessive API calls while the teacher types.
- The client component fetches on mount and re-fetches on filter/page change — no SWR or React Query; a simple `useCallback` + `useEffect` pattern.

### NFR-02: Security
- The API enforces teacher-scope: only results for students in the teacher's classes are returned.
- The bulk-delete endpoint verifies that all `ids` in the request belong to students of the requesting teacher before deleting.
- Role check: `session.user.role !== "TEACHER"` → 401 on all `/api/teacher/*` routes.

### NFR-03: Accessibility
- The search input has a visible `<label>` (sr-only acceptable) and a `placeholder`.
- The table uses `<th scope="col">` for column headers and `<th scope="row">` for the checkbox cell.
- The checkbox column header is `aria-label="Select all"`.
- Status badges use text + icon, not color alone.
- The tab-switch tooltip is keyboard-accessible via `focus` event on the icon button.

### NFR-04: Internationalisation
- Column headers and filter labels use `t("...")` from the `"teacher"` namespace.
- Key i18n strings: `studentResults`, `studentResultsDescription`, `testNameCol`, `topicCol`, `scoreCol`, `statusCol`, `dateCol`, `tabSwitchCol`, `needsGrading`, `graded`, `submitted`, `noResults`.
- Date formatting uses `DD/MM/YYYY` pattern, computed inline (not via `toLocaleDateString` with locale to avoid hydration mismatches).

### NFR-05: Consistency
- Color tokens, font (`font-body`), shadow pattern (`shadow-[0px_20px_40px_rgba(18,28,42,0.04)]`), and rounded corners (`rounded-2xl`) are consistent with the rest of the teacher shell.

---

## UI/UX Requirements

### Layout
- Outer: `<div>` inside the teacher shell content area.
- Editorial header: `mb-10`, `<h1>` (`font-bold text-3xl text-[#121c2a]`), description paragraph (`text-lg text-[#464554] opacity-80`).
- Filter bar: `flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-8`.
- Table container: `bg-white rounded-2xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] overflow-hidden overflow-x-auto`.
- Pagination: `flex items-center justify-between px-6 py-4 border-t border-[#c7c4d7]/15`.

### Filter Controls
- Search: `relative w-full sm:w-1/4 sm:min-w-[200px]` with `search` icon `absolute left-4 top-1/2 -translate-y-1/2`.
- Date inputs: `type="date"`, consistent height with search input.
- Status select: `ChipDropdown` component or styled `<select>` matching the design system.
- All inputs: `rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff] px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20`.

### Table
- `<table className="w-full text-left min-w-[700px]">`.
- Header: `bg-[#eff4ff]/50 text-[10px] font-bold uppercase tracking-[0.1em] text-[#464554]/70`.
- Rows: `hover:bg-[#f8f9ff] cursor-pointer transition-colors` with `divide-y divide-[#c7c4d7]/10`.
- Selected rows: `bg-[#e3dfff]/20`.
- Actions cell: `View` button — `text-xs font-body font-bold text-[#2a14b4] hover:underline`.

### Bulk Action Bar
- Appears above the table when `selectedIds.size > 0`.
- `bg-[#e3dfff]/30 border border-[#c7c4d7]/20 rounded-xl px-4 py-2.5 flex items-center justify-between mb-3`.
- Delete button: `text-xs font-body font-bold text-[#7b0020] flex items-center gap-1`.

### Delete Confirmation Modal
- Modal title: "Delete {n} result(s)?".
- Body: "This action is permanent and cannot be undone."
- Buttons: "Cancel" (ghost) and "Delete" (red solid, `bg-[#7b0020] text-white`).

### Score Color Classes
- `text-[#1b6b51]` (green ≥ 80%)
- `text-[#2a14b4]` (purple 50–79%)
- `text-[#7b0020]` (red < 50%)

### Status Badges
- Needs Grading: `text-[10px] font-bold uppercase tracking-widest text-[#92400e] bg-[#fef3c7]/60 px-2.5 py-1 rounded-full`.
- Graded: `text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-2.5 py-1 rounded-full`.
- Submitted: `text-[10px] font-bold uppercase tracking-widest text-[#777586] bg-[#f0eef6] px-2.5 py-1 rounded-full`.

---

## Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Teacher has no enrolled students | API returns `{ results: [], total: 0, totalPages: 1 }`; empty state renders |
| Student has no results for any filter combination | Empty state renders with "Try adjusting your search or filters." |
| All results are selected and bulk-deleted | Table reloads empty; `selectedIds` cleared; empty state shown |
| Delete request fails (network error) | `toast.error("Failed to delete results")` fires; modal stays open for retry |
| `tabSwitchCount` is 0 | Tab switch cell is empty (no icon, no tooltip) |
| `tabSwitchCount` is very large (e.g. 50) | Icon renders normally; tooltip shows count; no truncation |
| `score` is exactly 80 | Green color (≥ 80 threshold is inclusive) |
| `score` is exactly 50 | Purple color (50–79 range, inclusive of 50) |
| `score` is 0 | Red color; score shows "0%" |
| `sessionStatus` is null (practice-mode result with no exam session) | "Submitted" grey badge |
| Search matches no student names but matches a test name | Results containing that test name for any student are shown |
| Both dateFrom and dateTo are the same date | Only results completed on that date are shown |
| Modal is open and user clicks browser back | Modal should close (future: handle `popstate`) |
| `resultId` in modal is deleted before modal opens | Modal fetches `/api/teacher/student-results/{resultId}` → 404 → shows error state in modal |
| Very long student or test name | Cell truncates with `truncate` class; full name visible in modal detail |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Time to first table render (TTFB + client fetch) | < 600ms (P95) | Vercel Analytics + client-side performance mark |
| Search-to-results latency (debounced) | < 500ms after debounce fires | Network tab timing |
| Bulk delete success rate | 100% (no silent failures) | Error rate monitoring |
| "Needs Grading" badge click-through to grading | > 60% of teachers who see the badge open the result | Path analytics: listing → result detail |
| Zero orphaned modals (modal open on page change) | 100% | Manual QA |
| Empty state shown appropriately | 100% — never shows empty table without empty state copy | Automated test |
| Accessibility (keyboard nav, screen reader) | 0 critical WCAG 2.1 AA violations | axe-core in CI |
