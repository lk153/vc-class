# TDD: Teacher Student Results Listing Page

**Route:** `/teacher/student-results`
**Component:** `src/app/teacher/student-results/page.tsx`
**Client Component:** `src/components/teacher/StudentResultsTable.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture

### Rendering Strategy

`StudentResultsPage` is a **React Server Component** (RSC). Its only job is to:
1. Render the editorial header (h1 + description paragraph).
2. Mount `<StudentResultsTable />` as a client island.

All data-fetching and UI state live in `StudentResultsTable`, which is a `"use client"` component. This split is intentional: the header can be server-rendered and cached at the edge, while the table data must always be fresh (students submit results continuously).

The RSC has no auth check — the teacher layout (`src/app/teacher/layout.tsx`) enforces authentication and role for the entire `/teacher/*` tree.

### File Responsibilities

| File | Role |
|------|------|
| `src/app/teacher/student-results/page.tsx` | RSC shell: metadata, editorial header, mounts `StudentResultsTable` |
| `src/app/teacher/student-results/loading.tsx` | Suspense fallback for the RSC shell (table skeleton) |
| `src/components/teacher/StudentResultsTable.tsx` | Client component: filters, pagination, data fetch, table render, bulk delete, modal trigger |
| `src/components/teacher/ResultDetailModal.tsx` | Client component: modal for result detail view (mounted from `StudentResultsTable`) |
| `src/components/ModalOverlay.tsx` | Generic modal overlay (backdrop + close-on-click) |
| `src/components/Tooltip.tsx` | Tooltip wrapper for tab-switch indicator |
| `src/app/api/teacher/student-results/route.ts` | `GET` (listing with filters/pagination) + `DELETE` (bulk delete) |
| `src/lib/prisma.ts` | Singleton Prisma client |
| `src/lib/auth.ts` | `auth()` — NextAuth server session helper |

---

## Route & Data Flow

```
Browser GET /teacher/student-results
  → TeacherLayout (RSC): auth() → redirect("/login") if no session; role guard → redirect("/topics") if not TEACHER
  → StudentResultsPage (RSC):
      ├── getTranslations("teacher") → i18n
      └── Returns JSX: editorial header + <StudentResultsTable />

Client mount (StudentResultsTable):
  ├── useState: page=1, search="", dateFrom="", dateTo="", statusFilter="", selectedIds=Set
  ├── useEffect: debounce search → setDebouncedSearch (400ms)
  ├── useCallback fetchResults:
  │     └── fetch GET /api/teacher/student-results?page=&search=&dateFrom=&dateTo=&status=
  │           → API: auth() + role check → getTeacherStudentIds → prisma.practiceResult.findMany
  │           → returns { results[], total, page, totalPages }
  ├── useEffect: fetchResults on [page, debouncedSearch, dateFrom, dateTo, statusFilter]
  ├── useEffect: setPage(1) on filter changes
  └── Render: filter bar → bulk action bar → table → pagination

Row click → setSelectedResultId(id) → mount ResultDetailModal
Modal close → setSelectedResultId(null) → unmount ResultDetailModal
Bulk delete → fetch DELETE /api/teacher/student-results { ids } → fetchResults()
```

---

## Component Tree

```
TeacherLayout (RSC)
  └── TeacherShell (Client) → Sidebar + content area
        └── StudentResultsPage (RSC)
              ├── [editorial header]
              │     ├── <h1> Student Results
              │     └── <p> description
              └── StudentResultsTable (Client)
                    ├── [filter bar]
                    │     ├── <input type="text"> search
                    │     ├── <input type="date"> dateFrom
                    │     ├── <input type="date"> dateTo
                    │     └── <select> statusFilter
                    ├── [bulk action bar]        (conditional: selectedIds.size > 0)
                    │     ├── "{n} selected"
                    │     └── "Delete selected" button
                    ├── [table container]
                    │     ├── <thead>
                    │     │     └── <tr>: checkbox | Student | Test | Topic | Score | Status | Tab Switches | Date | Actions
                    │     └── <tbody>
                    │           └── [loading skeleton]         (conditional: loading)
                    │           └── [empty state]              (conditional: !loading && results.length === 0)
                    │           └── [result rows] × N          (conditional: !loading && results.length > 0)
                    │                 ├── <td> checkbox
                    │                 ├── <td> studentName
                    │                 ├── <td> testName
                    │                 ├── <td> topicName
                    │                 ├── <td> score (color-coded)
                    │                 ├── <td> status badge
                    │                 ├── <td> Tooltip > warning icon  (conditional: tabSwitchCount > 0)
                    │                 ├── <td> completedAt
                    │                 └── <td> "View" button
                    ├── [pagination]             (conditional: totalPages > 1)
                    │     ├── Previous button
                    │     ├── "{start}–{end} of {total}"
                    │     └── Next button
                    ├── ResultDetailModal        (conditional: selectedResultId !== null)
                    │     └── ModalOverlay
                    └── ModalOverlay [delete confirm] (conditional: showDeleteConfirm)
```

---

## Database Queries

### API: GET /api/teacher/student-results

**Step 1 — Scope resolution (runs once per request):**
```typescript
// Get all student IDs enrolled in teacher's classes
const enrollments = await prisma.classEnrollment.findMany({
  where: { class: { teacherId: session.user.id } },
  select: { userId: true },
});
const studentIds = [...new Set(enrollments.map((e) => e.userId))];
```
Tables: `class_enrollments` (JOIN `classes`). Rows: bounded by total enrollments across teacher's classes.

**Step 2 — Listing query:**
```typescript
const where = {
  userId: { in: studentIds },
  ...(search && {
    OR: [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { practiceTest: { title: { contains: search, mode: "insensitive" } } },
      { practiceTest: { topic: { title: { contains: search, mode: "insensitive" } } } },
    ],
  }),
  ...(dateFrom || dateTo ? {
    completedAt: {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
    },
  } : {}),
  ...(statusFilter && { examSession: { status: statusFilter } }),
};

const [results, total] = await Promise.all([
  prisma.practiceResult.findMany({
    where,
    include: {
      user: { select: { name: true } },
      practiceTest: {
        include: { topic: { include: { language: true } } },
      },
      examSession: {
        select: { status: true, attemptNumber: true, tabSwitchCount: true },
      },
    },
    orderBy: { completedAt: "desc" },
    skip: (page - 1) * 10,
    take: 10,
  }),
  prisma.practiceResult.count({ where }),
]);
```

Tables touched: `practice_results`, `users`, `practice_tests`, `topics`, `languages`, `exam_sessions`.

**Serialization (shapes the API response):**
```typescript
return NextResponse.json({
  results: results.map((r) => ({
    id: r.id,
    studentName: r.user.name,
    testName: r.practiceTest.title,
    topicName: r.practiceTest.topic.title,
    language: r.practiceTest.topic.language.code,
    score: r.score,
    correctCount: r.correctCount,
    totalQuestions: r.totalQuestions,
    completedAt: r.completedAt.toISOString(),
    sessionStatus: r.examSession?.status ?? null,
    attemptNumber: r.examSession?.attemptNumber ?? 1,
    tabSwitchCount: r.examSession?.tabSwitchCount ?? 0,
  })),
  total,
  page,
  totalPages: Math.ceil(total / 10),
});
```

### API: DELETE /api/teacher/student-results

```typescript
// Body: { ids: string[] }
// Verify all results belong to teacher's students
const results = await prisma.practiceResult.findMany({
  where: { id: { in: ids }, userId: { in: studentIds } },
  select: { id: true },
});
if (results.length !== ids.length) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
await prisma.practiceResult.deleteMany({ where: { id: { in: ids } } });
```

Tables: `practice_results`. Cascades: `student_answers`, `comments`, `exam_sessions` (via `onDelete: Cascade`).

---

## API Endpoints

### GET /api/teacher/student-results

**Auth:** Session required, `role === "TEACHER"`.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `search` | string | `""` | Full-text search across student, test, topic |
| `dateFrom` | ISO date string | `""` | Lower bound for `completedAt` |
| `dateTo` | ISO date string | `""` | Upper bound for `completedAt` |
| `status` | `"GRADING" \| "GRADED" \| ""` | `""` | Filter by `examSession.status` |

**Response:**
```typescript
{
  results: {
    id: string;
    studentName: string;
    testName: string;
    topicName: string;
    language: string;
    score: number;           // 0–100 float
    correctCount: number;
    totalQuestions: number;
    completedAt: string;     // ISO 8601
    sessionStatus: "DOING" | "GRADING" | "GRADED" | null;
    attemptNumber: number;
    tabSwitchCount: number;
  }[];
  total: number;
  page: number;
  totalPages: number;
}
```

**Error codes:** `401` (unauthenticated), `403` (wrong role).

### DELETE /api/teacher/student-results

**Auth:** Session required, `role === "TEACHER"`.

**Request body:** `{ ids: string[] }`

**Response:** `{ deleted: number }` or `{ error: string }` with status `403`.

---

## State Management

### State variables in `StudentResultsTable`

| Variable | Type | Initial | Description |
|----------|------|---------|-------------|
| `selectedResultId` | `string \| null` | `null` | Result ID for the open `ResultDetailModal` |
| `selectedIds` | `Set<string>` | `new Set()` | Row IDs checked for bulk delete |
| `showDeleteConfirm` | `boolean` | `false` | Controls the delete confirmation modal |
| `bulkDeleting` | `boolean` | `false` | Spinner state during DELETE request |
| `data` | `ApiResponse \| null` | `null` | Current page of results from the API |
| `loading` | `boolean` | `true` | Loading state for the fetch |
| `page` | `number` | `1` | Current pagination page |
| `search` | `string` | `""` | Raw search input value |
| `debouncedSearch` | `string` | `""` | Debounced value sent to API |
| `dateFrom` | `string` | `""` | Date range filter start |
| `dateTo` | `string` | `""` | Date range filter end |
| `statusFilter` | `string` | `""` | Exam session status filter |

### Side Effects (useEffect)

1. **Debounce:** `search` → `setDebouncedSearch` after 400ms. Cleanup clears the timer.
2. **Fetch:** Runs on `[page, debouncedSearch, dateFrom, dateTo, statusFilter]`. Calls `fetchResults()`.
3. **Reset page:** Runs on `[debouncedSearch, dateFrom, dateTo, statusFilter]`. Sets `page(1)` and clears `selectedIds`.

### Data derivations (computed inline, no state)

```typescript
const results = data?.results || [];
const total = data?.total || 0;
const totalPages = data?.totalPages || 1;
const startItem = total === 0 ? 0 : (page - 1) * 10 + 1;
const endItem = Math.min(page * 10, total);
const allSelected = results.length > 0 && results.every((r) => selectedIds.has(r.id));
const someSelected = results.some((r) => selectedIds.has(r.id)) && !allSelected;
```

---

## Styling

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Page header text | `#121c2a` | `<h1>` color |
| Subtitle text | `#464554` at 80% opacity | Description paragraph |
| Card bg | `#ffffff` | Table container |
| Card shadow | `0px_20px_40px_rgba(18,28,42,0.04)` | Table container |
| Table header bg | `#eff4ff` at 50% opacity | `<thead>` |
| Table header text | `#464554` at 70% opacity | Column labels |
| Row divider | `#c7c4d7` at 10% opacity | `divide-y` |
| Row hover | `#f8f9ff` | `hover:bg-[#f8f9ff]` |
| Row selected | `#e3dfff` at 20% opacity | `bg-[#e3dfff]/20` |
| Score green | `#1b6b51` | ≥ 80% |
| Score purple | `#2a14b4` | 50–79% |
| Score red | `#7b0020` | < 50% |
| Badge: Needs Grading bg | `#fef3c7` at 60% opacity | GRADING status |
| Badge: Needs Grading text | `#92400e` | GRADING status |
| Badge: Graded bg | `#a6f2d1` at 40% opacity | GRADED status |
| Badge: Graded text | `#1b6b51` | GRADED status |
| Badge: Submitted bg | `#f0eef6` | null session |
| Badge: Submitted text | `#777586` | null session |
| Tab switch warning | `#f59e0b` | Warning icon color |
| Bulk action bar bg | `#e3dfff` at 30% opacity | Action bar |
| Bulk delete button text | `#7b0020` | Destructive action |
| Pagination text | `#777586` | Item count |
| Input ring focus | `#2a14b4` at 20% opacity | Filter inputs |

### Filter Input Pattern

```jsx
<input
  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff]
    text-sm font-body text-[#121c2a] placeholder:text-[#464554]/40
    focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20"
/>
```

### Table Row Pattern

```jsx
<tr
  className={`cursor-pointer transition-colors divide-y divide-[#c7c4d7]/10
    ${selectedIds.has(r.id) ? "bg-[#e3dfff]/20" : "hover:bg-[#f8f9ff]"}`}
  onClick={() => setSelectedResultId(r.id)}
>
```

---

## i18n Keys

### Namespace: `"teacher"`

| Key | Value (en) | Usage |
|-----|-----------|-------|
| `studentResults` | "Student Results" | Page `<h1>` |
| `studentResultsDescription` | "Review test submissions, track scores, and add feedback." | Subtitle |
| `testNameCol` | "Test" | Table column header |
| `topicCol` | "Topic" | Table column header |
| `scoreCol` | "Score" | Table column header |
| `statusCol` | "Status" | Table column header |
| `dateCol` | "Date" | Table column header |
| `noResults` | "No results found" | Empty state heading |
| `needsGrading` | "Needs Grading" | Status badge label |
| `graded` | "Graded" | Status badge label |
| `submitted` | "Submitted" | Status badge label |
| `commentPosted` | "Comment posted" | Toast message |
| `commentFailed` | "Failed to post comment" | Toast error |

### Hardcoded Strings (future i18n migration)

| Current text | Suggested key |
|-------------|---------------|
| "Student" (column header) | `teacher.studentCol` |
| "Tab Switches" (column header) | `teacher.tabSwitchCol` |
| "Actions" (column header) | `teacher.actionsCol` |
| "View" (action button) | `teacher.viewAction` |
| "{n} selected" (bulk bar) | `teacher.selectedCount` |
| "Delete selected" | `teacher.deleteSelected` |
| "Delete {n} result(s)?" | `teacher.deleteResultsConfirm` |
| "This action is permanent..." | `teacher.deleteResultsWarning` |
| "Left exam tab {n} time(s)..." | `teacher.tabSwitchTooltip` |
| "{start}–{end} of {total}" | `teacher.paginationRange` |

---

## Error Handling

| Error scenario | Handling mechanism |
|---------------|-------------------|
| API fetch fails (network error) | `loading` set to `false`; `data` remains `null`; table shows empty state (graceful degradation) |
| API returns 401 | Silent — teacher is redirected by layout before this happens; defensive: show empty state |
| API returns 403 (wrong role) | Same as 401 defensive handling |
| Bulk delete request fails | `toast.error("Failed to delete results")`; modal stays open; `bulkDeleting` reset to `false` |
| Delete request partially fails (some IDs invalid) | API returns 403 with `{ error: "Unauthorized" }`; toast error; no partial delete |
| `selectedResultId` result was deleted before modal opens | `ResultDetailModal` fetches `/api/teacher/student-results/{id}` → 404 → modal shows error state |
| Page number out of range after delete | `fetchResults()` called after delete; if page > totalPages, data may return empty; reset to page 1 in `fetchResults` guard |
| `completedAt` cannot be parsed as date | Inline formatting guards with `isNaN` check before rendering |

---

## Performance

### Recommended Database Indexes

```sql
-- For teacher-scoped scope resolution
CREATE INDEX IF NOT EXISTS class_enrollments_class_id_idx ON class_enrollments(class_id);

-- For result listing with completedAt sort
CREATE INDEX IF NOT EXISTS practice_results_user_id_completed_at_idx
  ON practice_results(user_id, completed_at DESC);

-- For search across practiceTest.title (if not already indexed)
CREATE INDEX IF NOT EXISTS practice_tests_title_trgm_idx
  ON practice_tests USING gin(title gin_trgm_ops);
```

In Prisma schema:
```prisma
model PracticeResult {
  @@index([userId, completedAt(sort: Desc)])
}
```

### Client-Side Performance

- Debounce (400ms) eliminates unnecessary API calls on keystrokes.
- `useCallback` on `fetchResults` prevents closure recreation on every render.
- `Set<string>` for `selectedIds` gives O(1) lookup for the `has()` check in every row render.
- The `selectedIds` `Set` is cleared on filter changes to avoid stale selections across pages.

### Bundle Impact

`StudentResultsTable` imports:
- `next-intl`: already in the bundle.
- `sonner`: already in the bundle.
- `ResultDetailModal`: lazy-loadable via `dynamic()` if modal open rate is low. Not yet implemented — add if bundle analysis shows meaningful savings.

```typescript
// Optional future optimization:
import dynamic from "next/dynamic";
const ResultDetailModal = dynamic(() => import("@/components/teacher/ResultDetailModal"), {
  loading: () => <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
    <span className="material-symbols-outlined animate-spin text-white text-2xl">progress_activity</span>
  </div>,
});
```
