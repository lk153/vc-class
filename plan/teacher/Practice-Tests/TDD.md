# TDD — Teacher Practice Tests Listing

**Route:** `/teacher/practice-tests`
**Page component:** `src/app/teacher/practice-tests/page.tsx`
**Client component:** `src/components/teacher/PracticeTestGrid.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture Overview

The Practice Tests Listing follows a **Server Component shell + single Client Component** pattern. All data fetching, auth verification, and stat computation run server-side inside the async page component. The result set (already fully loaded) is passed to `PracticeTestGrid`, which owns all client interactivity: filtering, search, pagination, modal orchestration, and delete flow.

The modal itself is rendered inside `PracticeTestGrid` (not as a separate route) so that the listing URL never changes and the browser history is unaffected by opening/closing a test detail.

```
Server (RSC)                                  Client
────────────────────────────────────────────  ─────────────────────────────────────────────
PracticeTestsPage (async Server Component)
  ├── auth() → redirect if no session
  ├── prisma.practiceTest.findMany(...)
  │     includes: topic.language, _count.questions
  │     orderBy: createdAt DESC
  ├── compute: totalQuestions, topicsCovered
  ├── export metadata: { title: "Practice Tests" }
  └── renders:
        <header> (title + import button)       (static HTML)
        <stats row> (3 cards, server data)     (static HTML)
        [empty state] OR
        <PracticeTestGrid tests={[...]} />  →  PracticeTestGrid ("use client")
                                                 useState: filterStatus, filterLanguage,
                                                           filterSearch, page,
                                                           selectedTestId, detail,
                                                           deleteTestId, deleting,
                                                           savingField, refreshing,
                                                           qSearch, qTypeFilter,
                                                           qDiffFilter, qPage,
                                                           selectedQIds
                                                 useMemo: languages, filteredTests,
                                                          paginatedTests, totalPages
                                                 useEffect: filter→resetPage,
                                                            selectedTestId→fetch,
                                                            selectedTestId→scrollLock
                                                 renders:
                                                   <FilterRow />       (inline JSX)
                                                   <CardGrid />        (inline JSX)
                                                   <Pagination />      (inline JSX)
                                                   <DetailModal />  →  QuestionEditor (CC)
                                                                    →  EditableTitle (CC)
                                                                    →  TestSectionBuilder (CC)
                                                                    →  ChipDropdown (CC)
                                                                    →  TimeLimitInput (local)
                                                                    →  MaxAttemptsInput (local)
                                                   <DeleteModal />     (inline JSX)
```

---

## Route & Data Flow

### URL
```
GET /teacher/practice-tests
```

### Request Lifecycle

1. **Layout auth guard** — `src/app/teacher/layout.tsx` calls `auth()`. Non-TEACHER sessions redirect to `/topics`.
2. **Page auth guard** — `PracticeTestsPage` calls `auth()` defensively; redirects to `/login` if null.
3. **Prisma query** — Single `findMany` with `include` (see Database Queries).
4. **Stat computation** — `totalQuestions` summed in JS; `topicsCovered` via `new Set(tests.map(t => t.topicId)).size`.
5. **Conditional branch** — If `tests.length === 0`, render empty-state hero (no `<PracticeTestGrid>`).
6. **Prop serialization** — Shape mapped to `Test[]` (7 fields) before passing to client component boundary.
7. **Client hydration** — `PracticeTestGrid` hydrates; `useState` initializes with empty/default values.
8. **Filter interaction** — User interaction updates `filterStatus | filterLanguage | filterSearch`; `useEffect` resets `page` to 1; `useMemo` recomputes `filteredTests` and `paginatedTests` synchronously.
9. **Card click** — Sets `selectedTestId`; `useEffect` fires `GET /api/teacher/practice-tests/{testId}` and stores result in `detail` state.
10. **Modal close** — Clears `selectedTestId`; calls `router.refresh()` to re-run the server component and update stats/card badges.

### Delete Flow

1. Hover → click delete icon → sets `deleteTestId`.
2. Confirmation modal renders with test title.
3. Confirm → `DELETE /api/teacher/practice-tests` with `{ id: deleteTestId }` in JSON body.
4. `setDeleting(true)` during request.
5. On success: `toast.success(...)`, clear `deleteTestId`, call `router.refresh()`.
6. On failure: `toast.error(...)`, clear `deleting` flag only.

---

## Component Tree

```
TeacherLayout (RSC, src/app/teacher/layout.tsx)
└── TeacherShell (CC, src/components/teacher/TeacherShell.tsx)
    ├── Sidebar (CC)
    ├── AccountInfo (CC)
    └── <main>
        └── PracticeTestsPage (RSC, src/app/teacher/practice-tests/page.tsx)
            ├── <header>
            │   ├── <h1> practiceTests
            │   ├── <p> practiceTestsSubtitle
            │   └── <Link href="/teacher/practice-tests/import"> (import button)
            │
            ├── <stats grid>
            │   ├── StatCard: Total Tests (quiz icon, indigo)
            │   ├── StatCard: Total Questions (help icon, indigo)
            │   └── StatCard: Topics Covered (topic icon, green)
            │
            ├── [empty state]                         -- tests.length === 0
            │   └── <hero + import CTA>
            │
            └── PracticeTestGrid (CC)
                ├── <FilterRow>
                │   ├── <SearchInput> (text, filters on title + topicTitle)
                │   ├── <StatusChips> (All / Active / Draft / Inactive)
                │   └── <LanguageChips> (dynamic, from unique languageNames)
                │
                ├── [filtered empty state]             -- filteredTests.length === 0
                │
                ├── <CardGrid> (grid-cols-1/2/3/4 responsive)
                │   └── <TestCard group> × N
                │       ├── <status bar strip>
                │       ├── <quiz icon>
                │       ├── <status badge> + <language badge>
                │       ├── <title line-clamp-2>
                │       ├── <topic name>
                │       ├── <mode badge> + <question count>
                │       └── <hover overlay>
                │           ├── <DeleteButton> → sets deleteTestId
                │           └── <ViewDetailsButton> → sets selectedTestId
                │
                ├── <Pagination>                       -- totalPages > 1
                │   ├── <PrevButton>
                │   ├── <PageButton> × totalPages
                │   └── <NextButton>
                │
                ├── <DetailModal>                      -- selectedTestId !== null
                │   └── [see Practice-Test-Detail TDD]
                │
                └── <DeleteConfirmModal>               -- deleteTestId !== null
                    ├── <test title>
                    ├── <CancelButton>
                    └── <ConfirmDeleteButton>
```

**Component Classification:**

| Component | Type | Reason |
|-----------|------|--------|
| `PracticeTestsPage` | Server Component (async) | Auth, DB fetch, stat computation |
| `PracticeTestGrid` | Client Component (`"use client"`) | All interactive state lives here |
| `TimeLimitInput` | Client Component (local function) | Local draft state + onBlur save pattern |
| `MaxAttemptsInput` | Client Component (local function) | Same pattern as TimeLimitInput |
| `QuestionEditor` | Client Component | Media pickers, per-field save logic |
| `EditableTitle` | Client Component | Inline text editing with save |
| `TestSectionBuilder` | Client Component | Section tree CRUD + reorder |
| `ChipDropdown` | Client Component | Controlled open/close dropdown |
| `ModalOverlay` | Client Component | Backdrop + click-outside dismiss |
| `Tooltip` | Client Component | Hover info bubble |

---

## Database Queries

### Query 1: Fetch All Tests

```ts
prisma.practiceTest.findMany({
  where: { createdById: session.user.id },
  include: {
    topic: { include: { language: true } },
    _count: { select: { questions: true } },
  },
  orderBy: { createdAt: "desc" },
})
```

**Tables hit:** `practice_tests`, `topics`, `languages`
**Purpose:** Populate grid + compute all 3 stats.
**Index used:** `practice_tests.createdById` (foreign key index), `topics.id` (PK), `languages.id` (PK).
**Result shape after mapping:**
```ts
type Test = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  questionCount: number;   // from _count.questions
  status: string;          // "ACTIVE" | "DRAFT" | "INACTIVE"
  mode: string;            // "PRACTICE" | "TEST"
}
```

---

## API Endpoints

### GET `/api/teacher/practice-tests/{testId}`
- **Trigger:** `selectedTestId` state change via `useEffect`.
- **Handler:** `src/app/api/teacher/practice-tests/[testId]/route.ts`
- **Auth:** `auth()` → 401 if not TEACHER.
- **Query:** `practiceTest.findUnique` scoped to `createdById: session.user.id`.
- **Response:** Full `TestDetail` shape including `questions[]` and `sections[]`.
- **Error handling:** 404 if not found or wrong owner; client shows error toast and clears `selectedTestId`.

### PUT `/api/teacher/practice-tests`
- **Trigger:** Any settings change inside the detail modal (status, mode, toggles, time limit, max attempts, title).
- **Handler:** `src/app/api/teacher/practice-tests/route.ts`
- **Auth:** `auth()` → 401. Ownership verified via `practiceTest.findUnique` before update.
- **Body:** `{ id, title, ...changedFields }` (partial updates; only provided fields are written).
- **Side effect:** If `status` changes to `ACTIVE`, creates `Notification` records for all enrolled students.
- **Response:** Updated `PracticeTest` record.

### DELETE `/api/teacher/practice-tests`
- **Trigger:** Confirmation button click in delete modal.
- **Handler:** `src/app/api/teacher/practice-tests/route.ts`
- **Auth:** `auth()` → 401. Ownership verified before delete.
- **Body:** `{ id: string }`
- **Cascade:** Schema `onDelete: Cascade` handles questions, sections, results, student answers.
- **Response:** `{ success: true }`

---

## State Management

All state lives in `PracticeTestGrid` (single client component, no external store):

```ts
// Listing state
const [filterStatus, setFilterStatus] = useState("");          // "" | "ACTIVE" | "DRAFT" | "INACTIVE"
const [filterLanguage, setFilterLanguage] = useState("");      // "" | language name string
const [filterSearch, setFilterSearch] = useState("");          // free text
const [page, setPage] = useState(1);                          // 1-indexed current page

// Modal state
const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
const [detail, setDetail] = useState<TestDetail | null>(null);
const [loading, setLoading] = useState(false);                 // modal fetch in flight
const [savingField, setSavingField] = useState<string | null>(null); // field key being saved
const [refreshing, setRefreshing] = useState(false);           // refetchDetail in flight

// Delete state
const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
const [deleting, setDeleting] = useState(false);

// Question management state (inside modal)
const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());
const [qSearch, setQSearch] = useState("");
const [qTypeFilter, setQTypeFilter] = useState("");
const [qDiffFilter, setQDiffFilter] = useState("");
const [qPage, setQPage] = useState(1);

// Derived (useMemo)
const languages = useMemo(() => Array.from(new Set(tests.map(t => t.languageName))).sort(), [tests]);
const filteredTests = useMemo(() => { /* filter by status, language, search */ }, [tests, filterStatus, filterLanguage, filterSearch]);
const totalPages = Math.max(1, Math.ceil(filteredTests.length / ITEMS_PER_PAGE));
const paginatedTests = filteredTests.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

// Effects
useEffect(() => { setPage(1); }, [filterStatus, filterLanguage, filterSearch]);
useEffect(() => { /* fetch detail when selectedTestId changes */ }, [selectedTestId]);
useEffect(() => { /* body scroll lock + Escape key */ }, [selectedTestId]);
```

**State reset rules:**
- Filter changes → `page` resets to 1.
- `selectedTestId` → triggers detail fetch; `detail` is cleared when `selectedTestId` is cleared.
- `deleteTestId` cleared on success or cancel; `deleting` cleared on success or failure.

---

## Styling

### Design System Tokens

| Token | Value |
|-------|-------|
| Primary | `#2a14b4` |
| Primary surface | `#e3dfff`, `#eff4ff` |
| Success | `#1b6b51` |
| Success surface | `#a6f2d1` |
| Danger | `#7b0020` |
| Body text | `#121c2a` |
| Secondary text | `#464554` |
| Muted text | `#777586` |
| Border | `#c7c4d7` |
| Card shadow | `0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)` |

### Card Grid Breakpoints

```
grid-cols-1          (< 640px, mobile)
sm:grid-cols-2       (≥ 640px, tablet portrait)
lg:grid-cols-3       (≥ 1024px, laptop)
xl:grid-cols-4       (≥ 1280px, large desktop)
gap-5
```

### Status Bar Colors

| Status | Class |
|--------|-------|
| ACTIVE | `bg-[#1b6b51]` |
| DRAFT | `bg-[#2a14b4]` |
| INACTIVE | `bg-[#c7c4d7]` |

### Pagination Buttons

- Container: `flex gap-1 justify-center mt-8`
- Each button: `w-9 h-9 rounded-full text-sm font-body font-semibold transition-colors`
- Active: `bg-[#2a14b4] text-white`
- Inactive: `bg-white border border-[#c7c4d7]/30 text-[#464554] hover:bg-[#eff4ff]`
- Disabled prev/next: `opacity-40 cursor-not-allowed`

---

## i18n Keys

All keys are in the `teacher` namespace (`messages/{locale}/teacher.json`):

| Key | Usage |
|-----|-------|
| `practiceTests` | Page `<h1>` |
| `practiceTestsSubtitle` | Page subtitle |
| `importTest` | Import button label |
| `totalTests` | Stats card label |
| `totalQuestions` | Stats card label |
| `topicsCovered` | Stats card label |
| `noTestsYet` | Empty state heading |
| `noTestsDescription` | Empty state body |
| `classUpdateFailed` | Generic fetch error toast (reused) |
| `deleteConfirm` | Delete modal confirm button |
| `cancel` | Cancel button |

Language name display uses `tLang(t, languageName)` from `@/lib/i18n/tLang`.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Detail fetch fails (network / 4xx / 5xx) | `toast.error(t("classUpdateFailed"))`; `selectedTestId` cleared; `loading` set false. |
| PUT settings update fails | `toast.error("Failed to save {fieldLabel}")`; UI reverts to last known server value on next `refetchDetail`. |
| DELETE request fails | `toast.error(...)` shown; `deleting` cleared; modal stays closed; test remains in listing. |
| Session expires mid-session | API routes return 401; next `router.refresh()` triggers Next.js middleware redirect to `/login`. |
| Prisma query error (server) | Next.js 500 error page; no partial data shown. |
| `detail` is null when modal opens | Loading skeleton rendered inside modal until fetch completes. |

### `refetchDetail` pattern
After any successful PUT, `refetchDetail()` is called to sync the `detail` state with the server, ensuring that the modal always reflects the persisted value rather than an optimistic update:

```ts
async function refetchDetail() {
  if (!detail) return;
  setRefreshing(true);
  try {
    const r = await fetch(`/api/teacher/practice-tests/${detail.id}`);
    if (r.ok) setDetail(await r.json());
  } catch {} finally {
    setRefreshing(false);
  }
}
```

---

## Performance

| Concern | Approach |
|---------|----------|
| Initial data load | Single Prisma `findMany` with `include`; no N+1 queries. |
| Filter/pagination | Pure in-memory JS on already-loaded `tests[]`; zero network round-trips. `useMemo` prevents recomputation on unrelated re-renders. |
| Card hover overlay | CSS `opacity-0 group-hover:opacity-100` transition; no JS event listeners per card. |
| Modal data fetch | Triggered lazily on first card click; not prefetched. Skeleton shown during fetch (< 300ms typical). |
| `router.refresh()` scope | Refreshes only the server component subtree; does not cause a full page reload. |
| Animation | `motion/react` `AnimatePresence` used only for the modal enter/exit; not applied to individual cards to keep list rendering fast. |
| Re-render surface | All filter state in one component; derived values via `useMemo`. Card components do not hold state and re-render only when `paginatedTests` changes reference. |
