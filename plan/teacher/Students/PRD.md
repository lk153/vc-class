# PRD: Teacher Students Page

**Route:** `/teacher/students`
**Component:** `src/app/teacher/students/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Teacher Students page is the primary directory for a teacher to manage every student enrolled in their classes. It provides an at-a-glance roster across all of the teacher's classes, surfaces enrollment statistics, and gives the teacher a direct editing surface for each student without leaving the context of the list.

The page deliberately consolidates cross-class student management into a single view. A teacher may run multiple classes simultaneously; students may be enrolled in more than one of those classes. The page deduplicates students at the server layer and delivers a unified roster regardless of how many classes a student belongs to.

The design follows the VC Class editorial aesthetic: an editorial page header with an uppercase category label, a bold display title, and a subtitle; followed by an M3-inspired statistics row and a responsive table. On mobile, the table collapses to a card list.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Teacher | See a unified list of all students enrolled in my classes | I have a single place to manage my entire student roster without switching between class views |
| US-02 | Teacher | See at-a-glance stats (total, active, inactive, avg topics) | I can quickly assess the health of my program without counting rows |
| US-03 | Teacher | Click on a student row to open their detail modal | I can edit their profile and manage their topic assignments without navigating away |
| US-04 | Teacher | Edit a student's name, email, and learning language inline | I can correct data entry mistakes or update a student's details in seconds |
| US-05 | Teacher | See all topics assigned to a student, grouped by class | I understand each student's full learning workload across all classes |
| US-06 | Teacher | Unassign a topic from a class directly from the student modal | I can remove irrelevant content from a student's view without going to the topic or class pages |
| US-07 | Teacher | Activate or deactivate a student's account | I can suspend access for students who have graduated, dropped out, or not yet paid |
| US-08 | Teacher | See which students are ACTIVE vs INACTIVE via status badges | I can immediately identify who has live access to the platform |
| US-09 | Teacher | See the number of topics a student has access to | I can ensure every student has an appropriate workload |
| US-10 | Teacher | See an empty state when no students are enrolled yet | I understand the page is working correctly, not broken |

---

## Functional Requirements

### FR-01: Authentication & Authorization
- The page is only accessible to authenticated users with `role = TEACHER`.
- Unauthenticated requests are redirected to `/login` via `auth()`.
- The teacher layout (`src/app/teacher/layout.tsx`) performs a session guard; the page performs a second check as defense-in-depth.
- The page only surfaces students enrolled in the requesting teacher's own classes. A teacher cannot access or modify students belonging to another teacher's classes.
- The API route `PATCH /api/teacher/students` validates `session.user.role === "TEACHER"` and scopes updates accordingly.
- The DELETE endpoint for topic assignments (`DELETE /api/teacher/assignments/[assignmentId]`) verifies `assignment.class.teacherId === session.user.id` before deleting.

### FR-02: Student Listing via Enrollment Graph
- Students are fetched through the enrollment graph: `ClassEnrollment → Class (teacherId) → ClassEnrollment.user`.
- Only classes where `Class.teacherId === session.user.id` are queried.
- The query includes the student's `learnLanguage`, and each class's full `topicAssignments` tree (with `topic.language` and `topic.createdBy`).

### FR-03: Deduplication
- A student enrolled in multiple of the teacher's classes appears only once in the table.
- Deduplication is performed in-memory using a `Map<userId, { user, classTopics[] }>` keyed on `userId`.
- When a student appears in multiple enrollments, each class's topic group is appended to that student's `classTopics` array.
- The final list is sorted by `user.createdAt DESC` (most recently joined students first).

### FR-04: Statistics
- **Total Enrolled:** count of unique students after deduplication.
- **Active:** count of students where `status === "ACTIVE"`.
- **Inactive:** `Total - Active`.
- **Avg Topics:** total topic count across all students divided by the number of students, displayed to one decimal place. Shows `"0"` when no students are enrolled.

### FR-05: Topic Count per Student
- `topicCount` is the sum of all topics across all classes the student is enrolled in.
- Computed server-side as `classTopics.reduce((sum, ct) => sum + ct.topics.length, 0)`.
- Note: if a topic is assigned to two classes that the same student is enrolled in, it counts twice. Topic count is "assignments," not unique topics.

### FR-06: Student Detail Modal — Profile Editing
- The modal opens when a student row or card is clicked.
- Editable fields: `name` (text), `email` (email), `learnLanguageId` (dropdown from `/api/languages`).
- Inputs use inline auto-sizing (`width: Nch`) with a bottom-border focus indicator.
- A save button appears only when at least one field differs from the original value (`hasChanges`).
- Validation: name and email must be non-empty before saving.
- On save, `PATCH /api/teacher/students` is called with `{ studentId, name, email, learnLanguageId }`.
- On success: toast success, `router.refresh()` to re-fetch server data.
- On failure: toast error, no navigation.
- After saving, `hasChanges` returns to false (inputs reflect the server state after refresh).

### FR-07: Student Detail Modal — Language Dropdown
- Languages are fetched client-side from `GET /api/languages` on modal mount.
- A custom dropdown renders inside an info card; uses a `ref` + `mousedown` listener for outside-click dismissal.
- Language names are passed through `tLang(t, lang.name)` for localized display.
- If no language is set, the dropdown shows `"—"`.

### FR-08: Student Detail Modal — Topic View
- Topics are displayed in a nested structure: for each `ClassTopicGroup`, a card with the class name as a header, followed by a table of that class's topics.
- Each topic row shows: title, language badge, creator name, assigned date, and an Unassign button.
- Classes with zero visible topics (after unassigning) are hidden from the list.
- If a student has no assigned topics at all, an empty-state card with an icon and italic text is shown.

### FR-09: Unassign Topic
- Clicking the Unassign button triggers `DELETE /api/teacher/assignments/[assignmentId]`.
- While the request is in-flight, that row's button shows a `"..."` label and is disabled (`unassigning === assignmentId`).
- On success: the assignment ID is added to a local `removedIds: Set<string>`. The row is hidden immediately without waiting for a re-fetch. `router.refresh()` is called to sync server state.
- On failure: toast error, row remains visible.

### FR-10: Activate / Deactivate Student
- A toggle button at the bottom of the modal switches `status` between `ACTIVE` and `INACTIVE`.
- Calls `PATCH /api/teacher/students` with `{ studentId, status }`.
- On success: toast with contextual message (`studentActivated` or `studentDeactivated`), then `onClose()` and `router.refresh()`. The modal closes because the student's status change is reflected in the list on refresh.
- On failure: toast error.

### FR-11: Mobile Layout
- On viewport widths below the `md` breakpoint, the desktop table is hidden.
- Each student is rendered as a tappable card with avatar initials, name, email, status badge, joined date, language, and topic count.
- Tapping a card opens `StudentDetailModal` identically to clicking a desktop row.

### FR-12: Empty State
- When the teacher has no students enrolled in any class, the table renders a single row spanning all columns with `t("noStudentsYet")`.
- The mobile card list renders a standalone card with the same message.
- Statistics show: Total = 0, Active = 0, Inactive = 0, Avg Topics = "0".

---

## Non-Functional Requirements

### NFR-01: Performance
- The server query uses a single `prisma.classEnrollment.findMany` with nested `include`. No N+1 queries.
- In-memory processing (deduplication and sorting) is O(n) in the number of enrollments.
- The page does not block on client-side fetches; languages are loaded asynchronously inside the modal only when needed.

### NFR-02: Security
- All mutations require an active teacher session.
- Teacher can only modify students enrolled in their own classes. The PATCH route does not validate class ownership for student edits (the student record is global), but the teacher can only reach the modal by seeing a student in their own enrollment data.
- The DELETE assignment route explicitly verifies class ownership.

### NFR-03: Accessibility
- Avatar initials divs are decorative; semantic labels are provided by adjacent text.
- Table uses `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements for screen-reader compatibility.
- Modal uses `ModalOverlay` which traps scroll (`body.overflow = hidden`) and responds to `Escape` key.
- Buttons have accessible `title` attributes where icon-only.

### NFR-04: Consistency
- i18n keys are consumed via `useTranslations("teacher")` (client) and `getTranslations("teacher")` (server).
- Language names use the shared `tLang(t, name)` utility for consistent localized display.
- Date formatting follows the `dd/mm/yyyy` convention used across the platform.

---

## UI/UX Requirements

### UX-01: Editorial Header
- Category label: `t("directory")` — 10px, uppercase, `tracking-[0.2em]`, 40% opacity.
- Page title: `t("students")` — bold 3xl, `text-[#121c2a]`.
- Subtitle: `t("studentsSubtitle")` — large, 80% opacity.

### UX-02: Statistics Row
- 4 M3 elevated cards in a 2-column (mobile) / 4-column (desktop) grid.
- Each card: rounded-2xl, M3 shadow (`0_1px_3px_1px_rgba(0,0,0,0.06)`), colored icon block, large numeric value, uppercase label, and a 3px colored accent bar at the bottom.
- Colors: Total/Avg = indigo (`#2a14b4`), Active = green (`#1b6b51`), Inactive = grey (`#777586`).
- Active card includes a pulsing dot indicator.

### UX-03: Table
- Desktop: `hidden md:block` rounded-2xl card with an M3 shadow.
- Header row: thin bottom border, 10px uppercase tracking-widest labels.
- Data rows: `hover:bg-[#e3dfff]/50` on hover, cursor-pointer, divided by subtle `divide-[#c7c4d7]/10`.
- Inactive students: `opacity-60` and a grayscale avatar.
- Avatar: circular, initials from first letters of each word in the name.
- Status badge: rounded-full pill — green for ACTIVE, grey for INACTIVE.

### UX-04: Student Detail Modal
- Uses `ModalOverlay` with `panelClass="max-w-3xl"`.
- Background: `bg-[#f8f9ff]`, max height `90vh`, scrollable.
- Close button: top-right sticky circular button.
- Inline name/email editing: borderless inputs that reveal a bottom border on hover/focus; auto-size to content length via `width: Nch`; edit icon appears on hover of the field group.
- Language dropdown: custom styled, opens downward, 50ms transition, check icon on selected item.
- Save button: appears only on change, pill-shaped, indigo with shadow, spinner on save.
- Topic groups: each class in its own white rounded card with a school icon header.
- Topic table header: `bg-[#eff4ff]/50`, `hover:bg-[#eff4ff]/50` on rows.
- Unassign button: inline, red tint, `link_off` icon, disabled during request.
- Activate/Deactivate: bottom-aligned toggle, red tint for deactivate, green for activate.

---

## Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|------------------|
| EC-01 | Student enrolled in 2 of the teacher's classes | Appears once in the list; modal shows topics grouped under both class names |
| EC-02 | Student with no topics assigned in any class | Modal shows empty-state panel inside the topic section; `topicCount = 0` in the table |
| EC-03 | Teacher has no students enrolled | Empty state in both mobile cards and desktop table; all stats = 0 |
| EC-04 | Unassigning the last topic in a class group | That class group card disappears from the modal; total topic count decrements |
| EC-05 | All topics in all classes are unassigned | Entire topic section is replaced by the empty-state panel |
| EC-06 | Student has no learning language set | Language column shows `"—"`; dropdown shows `"—"` as current value |
| EC-07 | Student name is a single word | Avatar shows the first two characters of that word |
| EC-08 | Saving with empty name or email | Save button is disabled; cannot submit |
| EC-09 | Network error during PATCH | Toast error displayed; form state preserved; modal remains open |
| EC-10 | Network error during DELETE | Toast error; removed set unchanged; row remains visible |
| EC-11 | Toggling status fails | Toast error; modal remains open; no navigation |
| EC-12 | Languages API fails | Dropdown shows no options; existing language value preserved in state |
| EC-13 | Modal open, then Escape pressed | `onClose()` fires via `ModalOverlay` keyboard handler; modal closes cleanly |
| EC-14 | Student enrolled in 0 classes (orphaned) | Cannot appear — enrollment is the query entry point; no enrollment = not visible |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time-to-edit a student field | < 3 interactions (click row, edit field, click save) |
| Time-to-unassign a topic | < 2 interactions (click row, click Unassign) |
| Time-to-toggle student status | < 2 interactions (click row, click activate/deactivate) |
| Page load time (P95, cold server) | < 800ms including DB query |
| Zero unauthorized data leaks | Teacher A cannot see or modify Teacher B's students |
| Zero missing students | All enrolled students visible after server refresh |
| Responsive usability | All actions completable on 375px mobile viewport |
