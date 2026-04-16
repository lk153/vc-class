# PRD — Teacher Practice Tests Listing

**Feature:** Practice Tests Listing Page
**Route:** `/teacher/practice-tests`
**Last Updated:** 2026-04-15
**Status:** Implemented

---

## 1. Overview

The Practice Tests Listing page is the central hub where teachers browse, search, filter, and manage all practice tests they have created. It presents a stats summary (total tests, total questions, topics covered), a full-featured filterable and paginated grid of test cards, and an entry point to the CSV importer. Clicking any card opens the Practice Test Detail modal, which allows inline editing of all test settings, questions, and section structure without leaving the listing.

---

## 2. User Stories

### 2.1 Core Stories

**US-01 — Stats at a Glance**
As a teacher, I want to see the total number of tests I have created, the total number of questions across all tests, and the count of distinct topics covered, so that I can understand the scope of my assessment library immediately upon landing on the page.

**US-02 — Browse Tests**
As a teacher, I want to see my practice tests displayed as cards in a responsive grid, each showing the test title, topic, language, mode, status, and question count, so that I can quickly scan my library.

**US-03 — Search Tests**
As a teacher, I want to type into a search field and see only tests whose title or topic name matches my query, so that I can find a specific test without scrolling through the entire grid.

**US-04 — Filter by Status**
As a teacher, I want to filter tests by status (All / Active / Draft / Inactive) using chip buttons, so that I can focus on tests in a particular lifecycle stage.

**US-05 — Filter by Language**
As a teacher, I want to filter tests by language using chip buttons dynamically generated from the languages present in my library, so that I can work with tests for a specific language without distraction.

**US-06 — Paginate Results**
As a teacher with many tests, I want results to be paginated at 10 items per page with numbered page buttons, so that the page remains fast and scannable.

**US-07 — Open Test Detail**
As a teacher, I want to click any test card (or its "View Details" hover button) to open a full-screen modal with all test settings and content, so that I can inspect or edit a test without navigating away from the listing.

**US-08 — Delete a Test**
As a teacher, I want a delete button on each card (visible on hover) that triggers a confirmation modal before permanently removing a test, so that I avoid accidental deletion.

**US-09 — Import Tests**
As a teacher, I want a prominently placed "Import Test" button that takes me to the CSV importer, so that I can bulk-create questions from a spreadsheet.

**US-10 — Empty State**
As a teacher with no tests, I want to see a clear empty state with an import CTA instead of a blank page, so that I understand what to do next.

**US-11 — Filter Isolation**
As a teacher, I want filter chips and search to work in combination (AND logic), so that I can narrow results precisely.

**US-12 — Pagination Reset on Filter**
As a teacher, I want the page to automatically reset to page 1 whenever I change any filter, so that I always see the first results matching the new criteria.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement |
|----|-------------|
| FR-01 | The page calls `auth()` server-side. If no session, redirect to `/login`. |
| FR-02 | The teacher layout enforces role === `TEACHER`. Non-teacher sessions are redirected to `/topics`. |
| FR-03 | Prisma queries are scoped to `createdById: session.user.id`; teachers cannot see each other's tests. |

### 3.2 Server-Side Data Fetching

| ID | Requirement |
|----|-------------|
| FR-04 | Fetch all `PracticeTest` records for the authenticated teacher, including `topic { language }` and `_count { questions }`, ordered by `createdAt DESC`. |
| FR-05 | Compute `totalQuestions` server-side as the sum of `_count.questions` across all tests. |
| FR-06 | Compute `topicsCovered` server-side as the count of distinct `topicId` values. |
| FR-07 | Pass the following shape to `<PracticeTestGrid>`: `id`, `title`, `topicTitle`, `languageName`, `questionCount`, `status`, `mode`. |

### 3.3 Stats Row

| ID | Requirement |
|----|-------------|
| FR-08 | Display three stat cards: **Total Tests** (count of tests), **Total Questions** (sum of question counts), **Topics Covered** (count of distinct topics). |
| FR-09 | Stats are static; no polling or real-time update is required. |

### 3.4 Filter Controls (Client)

| ID | Requirement |
|----|-------------|
| FR-10 | Render a text search input that filters on test title and topic title (case-insensitive substring match). |
| FR-11 | Render status filter chips: All (default), Active, Draft, Inactive. Exactly one chip is active at a time. |
| FR-12 | Render language filter chips dynamically derived from `Array.from(new Set(tests.map(t => t.languageName))).sort()`. Include an "All" chip as default. |
| FR-13 | All three filter dimensions (search, status, language) are combined with AND logic. |
| FR-14 | Any change to search, status, or language resets pagination to page 1. |

### 3.5 Pagination

| ID | Requirement |
|----|-------------|
| FR-15 | Display 10 tests per page. |
| FR-16 | Render numbered page buttons using M3 styling: active page button uses `bg-[#2a14b4] text-white`; inactive buttons use `bg-white` with hover tint. |
| FR-17 | Previous/Next navigation buttons are present when `totalPages > 1`. |
| FR-18 | If the filtered set is empty, display a "no results" empty state instead of the grid and pagination. |

### 3.6 Test Cards

| ID | Requirement |
|----|-------------|
| FR-19 | Each card displays: a colored status bar at the top (Active=green, Draft=indigo, Inactive=muted), a quiz icon, status badge, language badge, title, topic name, mode badge (Practice / Test), and question count. |
| FR-20 | Delete button and "View Details" button appear on card hover (`group-hover:opacity-100`). |
| FR-21 | Clicking the card body or the "View Details" button opens the detail modal for that test. |
| FR-22 | The delete button opens a confirmation modal before performing any destructive action. |

### 3.7 Detail Modal Trigger

| ID | Requirement |
|----|-------------|
| FR-23 | Clicking a card sets `selectedTestId` in state, which triggers a `GET /api/teacher/practice-tests/{testId}` fetch. |
| FR-24 | A loading skeleton is shown inside the modal while the detail fetch is in flight. |
| FR-25 | Pressing Escape or clicking the backdrop closes the modal. Body scroll is locked while the modal is open. |
| FR-26 | On modal close, `router.refresh()` is called to sync server-rendered stats with any changes made inside the modal. |

### 3.8 Delete Flow

| ID | Requirement |
|----|-------------|
| FR-27 | The confirmation modal shows the test title and requires an explicit "Delete" confirmation button click. |
| FR-28 | On confirmation, send `DELETE /api/teacher/practice-tests` with `{ id }`. |
| FR-29 | On success, show a success toast and call `router.refresh()` to update the listing. |
| FR-30 | On failure, show an error toast and leave the test in the listing. |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | The server component fetches all tests in a single Prisma query with `include`. Client-side filtering is performed in-memory on the already-loaded dataset — no additional network requests for filter changes. |
| NFR-02 | Security | All data is fetched inside a Server Component scoped by `session.user.id`. No test data from other teachers can appear. The DELETE endpoint re-verifies ownership server-side. |
| NFR-03 | Accessibility | Filter chip buttons use `aria-pressed` to communicate active state. The modal uses `role="dialog"` with a focusable close button. The delete confirmation has an explicit labelled action. |
| NFR-04 | Internationalisation | All user-visible strings use the `teacher` namespace from `next-intl`. Language names are passed through `tLang()` for locale-aware display. |
| NFR-05 | Responsiveness | Card grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Filter chips scroll horizontally on narrow viewports. Stats grid collapses to 1 column on mobile. |
| NFR-06 | SEO | Page exports `metadata: { title: "Practice Tests" }`. The teacher layout sets `robots: { index: false }`. |

---

## 5. UI/UX Requirements

### 5.1 Page Header

- `<h1>` with `teacher.practiceTests` key, `font-bold text-3xl text-[#121c2a]`, `mb-2`.
- Subtitle `<p>` with `teacher.practiceTestsSubtitle`, `text-lg text-[#464554] opacity-80`.
- "Import Test" button on the right: `bg-[#2a14b4]`, `rounded-full`, `px-6 py-3`, with `upload_file` icon. Links to `/teacher/practice-tests/import`.

### 5.2 Stats Row

Three M3-elevated white cards in a `grid-cols-1 sm:grid-cols-3 gap-4` grid:

| Stat | Icon | Icon Bg | Icon Color | Number Color | Bar Color |
|------|------|---------|------------|--------------|-----------|
| Total Tests | `quiz` | `#e3dfff` | `#2a14b4` | `#121c2a` | `#2a14b4` |
| Total Questions | `help` | `#e3dfff` | `#2a14b4` | `#2a14b4` | `#2a14b4` |
| Topics Covered | `topic` | `#a6f2d1/40` | `#1b6b51` | `#1b6b51` | `#1b6b51` |

Each card: `bg-white rounded-2xl shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)] p-5 overflow-hidden`. Bottom 3px accent bar.

### 5.3 Filter Row

- Search: `rounded-full border border-[#c7c4d7]/30 bg-white pl-9 pr-4 py-2` with `search` icon positioned absolutely inside.
- Status chips: pill buttons `rounded-full px-4 py-1.5 text-sm font-body font-semibold`. Active: `bg-[#2a14b4] text-white`. Inactive: `bg-white border border-[#c7c4d7]/30 text-[#464554] hover:border-[#2a14b4]/40`.
- Language chips: same pill styling; rendered only when 2+ languages exist.

### 5.4 Test Cards

- `group relative bg-white rounded-2xl shadow-[...] overflow-hidden cursor-pointer` with `hover:shadow-lg transition-shadow`.
- Status bar: `h-1.5` strip at top. Active=`bg-[#1b6b51]`, Draft=`bg-[#2a14b4]`, Inactive=`bg-[#c7c4d7]`.
- Body: `p-5` with quiz icon, badges, title (`font-bold text-base text-[#121c2a] line-clamp-2`), topic, mode, question count row.
- Hover overlay: absolute `inset-0` with two buttons (delete: red, view details: indigo) using `opacity-0 group-hover:opacity-100 transition-opacity`.

### 5.5 Status Badges

| Status | Background | Text Color |
|--------|------------|------------|
| ACTIVE | `#a6f2d1/40` | `#1b6b51` |
| DRAFT | `#e3dfff` | `#2a14b4` |
| INACTIVE | `#f3f4f6` | `#6b7280` |

### 5.6 Pagination

M3-style row: `flex gap-1 justify-center mt-8`. Each page button: `w-9 h-9 rounded-full text-sm font-body font-semibold`. Active: `bg-[#2a14b4] text-white`. Inactive: `bg-white border border-[#c7c4d7]/30 hover:bg-[#eff4ff]`. Prev/Next use `chevron_left` / `chevron_right` icons and are disabled at boundaries.

### 5.7 Delete Confirmation Modal

Centered modal: `rounded-2xl bg-white shadow-2xl p-6 max-w-sm`. Title in `text-[#7b0020]`, body text with test title in bold. Two buttons: "Cancel" (outlined) and "Delete" (`bg-[#7b0020] text-white rounded-full`).

### 5.8 Empty States

- No tests at all: centered hero with `quiz` icon circle, heading `teacher.noTestsYet`, description, import CTA button.
- Filtered set empty: inline message within the grid area, `text-[#777586]`, no CTA button.

---

## 6. Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | Teacher has 0 tests | Empty state hero renders; stats show 0/0/0; PracticeTestGrid is not rendered. |
| EC-02 | All tests filtered out | Grid area shows inline "no results" message; pagination renders `totalPages = 1` but is hidden when only 1 page exists. |
| EC-03 | Search query matches topic but not title | Test still appears (OR match across title and topicTitle). |
| EC-04 | Language chips: single language | Language chip row is omitted (no value in filtering to one option that already shows everything). |
| EC-05 | Deleting last test on a page | `router.refresh()` causes the server to rerender; client state resets naturally; pagination adjusts. |
| EC-06 | Modal fetch fails (network error) | Error toast shown; `selectedTestId` is cleared; user remains on listing. |
| EC-07 | Test count > 10 (pagination needed) | Pagination renders; tests beyond page 1 are hidden until navigated to. |
| EC-08 | Very long test title | Title truncated with `line-clamp-2`; tooltip or full text not required. |
| EC-09 | Status changed inside modal | On modal close, `router.refresh()` updates the card's status badge in the listing. |
| EC-10 | Delete fails on server | Error toast shown; confirmation modal closes; test remains in listing. |
| EC-11 | Multiple languages present | Language chips render sorted alphabetically with an "All" chip prepended. |
| EC-12 | Session expires | Next navigation or API call returns 401; Next.js redirects to `/login` via middleware. |

---

## 7. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Server render time (TTFB) | < 600ms warm DB | Vercel function duration logs |
| Filter response latency | < 16ms (one frame) | Browser DevTools — no network round-trip |
| Pagination correctness | Exactly 10 items per page | Unit test on `filteredTests.slice` logic |
| Delete confirmation rate | 0% accidental deletes | Confirmation modal always shown |
| Modal open time | < 400ms (fetch + render) | Browser performance waterfall |
| Empty state coverage | Renders for 0 tests and 0 filter results | Integration tests |
| i18n completeness | No hardcoded English strings | CI lint / next-intl type check |
| Auth redirect accuracy | 100% unauthenticated requests redirected | E2E tests |
