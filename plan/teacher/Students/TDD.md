# TDD: Teacher Students Page

**Route:** `/teacher/students`
**Page component:** `src/app/teacher/students/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture Overview

The Teacher Students page is a **Next.js 16 App Router Server Component**. All data fetching, authentication, deduplication, and shape transformation run exclusively on the server. The page renders no client-side JavaScript except what is imported through the two `"use client"` components it delegates to.

The server delivers a fully transformed `Student[]` prop to `StudentTable`. The client boundary is the table component; from that point down, all interactivity (row selection, modal open/close, inline editing, API calls) is handled in client components.

```
Server (RSC)                                 Client
─────────────────────────────────────────    ──────────────────────────────────────────────
StudentsPage (async Server Component)
  ├── auth()                                 (no client state)
  ├── prisma.classEnrollment.findMany
  │   └── include: user, class.topicAssignments
  ├── In-memory dedup (Map<userId, ...>)
  ├── Sort by createdAt DESC
  ├── Map to Student[]
  └── renders:
        <editorial header>                   (static HTML)
        <StudentTable students={Student[]}> → StudentTable ("use client")
                                               useState: selectedStudent
                                               ├── stats row (derived)
                                               ├── mobile card list
                                               ├── desktop <table>
                                               └── {selectedStudent &&
                                                    <StudentDetailModal>} → StudentDetailModal ("use client")
                                                       useState: editName, editEmail,
                                                                 editLanguageId, languages,
                                                                 saving, langOpen,
                                                                 removedIds, unassigning
                                                       useEffect: fetch /api/languages
                                                       useEffect: outside-click for dropdown
                                                       └── <ModalOverlay>
                                                             ("use client", motion/react)
```

---

## Route & Data Flow

### URL
```
GET /teacher/students
```

### Request lifecycle

1. **Teacher layout auth guard** — `src/app/teacher/layout.tsx` calls `auth()`. If no session or role is not `TEACHER`, redirects to `/login`.
2. **Page auth guard** — `StudentsPage` calls `auth()` as defense-in-depth. Same redirect on failure.
3. **i18n** — `getTranslations("teacher")` is called to provide server-side strings for the editorial header.
4. **DB query** — Single `prisma.classEnrollment.findMany` (see Database Queries section).
5. **Deduplication** — Iterate enrollments, build `Map<userId, { user, classTopics[] }>`. Each enrollment appends its class's topic group.
6. **Sort** — `[...studentMap.values()].sort((a, b) => b.user.createdAt - a.user.createdAt)`.
7. **Shape transformation** — Map to `Student[]` with serializable fields (ISO strings, primitive counts).
8. **Render** — Pass `students` to `<StudentTable>`. The editorial header is rendered as static HTML above it.

### Loading state
- `src/app/teacher/students/loading.tsx` is the Next.js Suspense fallback shown while async work runs.

---

## Component Tree

```
StudentsPage                              [Server Component]
├── <div> editorial header                [Static HTML]
│   ├── <p> t("directory")
│   ├── <h1> t("students")
│   └── <p> t("studentsSubtitle")
└── <StudentTable students={...} />       [Client Component]
    ├── Stats row (4 cards)
    │   ├── Total card
    │   ├── Active card
    │   ├── Inactive card
    │   └── Avg Topics card
    ├── Mobile card list (.md:hidden)
    │   └── <button> × N  (per student)
    ├── Desktop table (.hidden.md:block)
    │   ├── <thead>
    │   └── <tbody> <tr> × N
    └── {selectedStudent &&
         <StudentDetailModal>}            [Client Component]
         └── <ModalOverlay>              [Client Component, motion/react]
             └── modal panel
                 ├── Close button
                 ├── Avatar + inline name/email inputs
                 ├── Info cards row (4 cards)
                 │   ├── Status badge card
                 │   ├── Language dropdown card
                 │   ├── Topic count card
                 │   └── Joined date card
                 ├── {hasChanges && Save button}
                 ├── Topic groups OR empty state
                 │   └── {classTopics.map → white card}
                 │       ├── class header (school icon + name + count)
                 │       └── <table> topic rows × N
                 │           └── Unassign button (per row)
                 └── Activate/Deactivate button
```

---

## Database Queries

### Primary query — `StudentsPage`

```typescript
prisma.classEnrollment.findMany({
  where: { class: { teacherId: session.user.id } },
  include: {
    user: { include: { learnLanguage: true } },
    class: {
      include: {
        topicAssignments: {
          include: {
            topic: {
              include: {
                language: true,
                createdBy: { select: { name: true } },
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

**Returns:** All `ClassEnrollment` rows for classes taught by the current teacher, each joined with the enrolled `User` (and their learning `Language`) and the `Class` (and its `TopicAssignment[]`, each joined with the `Topic`, `Topic.language`, and `Topic.createdBy.name`).

**Complexity:** O(enrollments × avgTopicsPerClass). Prisma batches related includes. No N+1.

**Ordering:** `topicAssignments` ordered by `assignedAt DESC` within each class. Enrollment rows are not ordered at DB level; final sort is in-memory by `user.createdAt DESC`.

### Secondary query — `StudentDetailModal` (client-side)

```
GET /api/languages
```

Fetched with `fetch("/api/languages")` on modal mount. Returns `Language[]` (`{ id, name }`). Used to populate the learning language dropdown.

---

## API Endpoints

### PATCH `/api/teacher/students`

**File:** `src/app/api/teacher/students/route.ts`

**Auth:** `session.user.role === "TEACHER"` required.

**Request body:**
```typescript
{
  studentId: string;            // required
  name?: string;                // optional patch
  email?: string;               // optional patch
  learnLanguageId?: string | null; // optional patch (null = clear)
  status?: "ACTIVE" | "INACTIVE";  // optional patch
}
```

**Logic:**
- Build `updateData` object from whichever fields are present and non-empty.
- If `status` is provided, validate it is one of `["ACTIVE", "INACTIVE"]`.
- If `name` or `email` provided, trim and include.
- If `learnLanguageId !== undefined`, set (including `null` to clear the relation).
- If `updateData` is empty, return `400`.
- `prisma.user.update({ where: { id: studentId }, data: updateData, include: { learnLanguage: true } })`.

**Response:** `200` with `{ id, name, email, status, languageName }`.

**Error responses:**
- `401` — unauthorized.
- `400` — missing `studentId` or no fields to update.
- `500` — unhandled Prisma error (bubbles as generic error).

**Note:** This endpoint does not verify that `studentId` belongs to a class taught by the teacher. The teacher can only reach this endpoint by interacting with students from their own enrollment data (server renders only their students). A future hardening step would add a class ownership check here.

---

### DELETE `/api/teacher/assignments/[assignmentId]`

**File:** `src/app/api/teacher/assignments/[assignmentId]/route.ts`

**Auth:** `session.user.role === "TEACHER"` required.

**Logic:**
1. Look up `TopicAssignment` by `id`, including `class.teacherId`.
2. Verify `assignment.class.teacherId === session.user.id`. Return `404` if not.
3. `prisma.topicAssignment.delete({ where: { id: assignmentId } })`.

**Response:** `200` with `{ success: true }`.

**Error responses:**
- `401` — unauthorized.
- `404` — assignment not found or belongs to another teacher's class.

---

### GET `/api/languages`

Returns all `Language[]`. Used by the modal dropdown. Shared endpoint not teacher-specific.

---

## State Management

All state is local React state. There is no global store or context.

### `StudentTable` state

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `selectedStudent` | `Student \| null` | `null` | Controls which student's modal is open. `null` = no modal. |

**Derived values** (computed inline, no state):
- `totalStudents = students.length`
- `activeStudents = students.filter(s => s.status === "ACTIVE").length`

---

### `StudentDetailModal` state

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `editName` | `string` | `student.name` | Controlled input for name field |
| `editEmail` | `string` | `student.email` | Controlled input for email field |
| `editLanguageId` | `string` | `student.languageId \|\| ""` | Controlled value for language dropdown |
| `languages` | `Language[]` | `[]` | Options for the language dropdown, fetched on mount |
| `saving` | `boolean` | `false` | True while PATCH is in-flight; disables save button, shows spinner |
| `langOpen` | `boolean` | `false` | Controls language dropdown open/closed |
| `removedIds` | `Set<string>` | `new Set()` | Assignment IDs removed this session; used for optimistic hide |
| `unassigning` | `string \| null` | `null` | `assignmentId` currently being deleted; disables that row's button |

**Derived values** (computed inline, no state):
- `hasChanges` — any of `editName`, `editEmail`, `editLanguageId` differs from original student prop values.
- `initials` — first letter of each word in `editName`, sliced to 2, uppercased.
- `isInactive` — `student.status !== "ACTIVE"`.
- `totalVisibleTopics` — sum of topics in `classTopics` excluding `removedIds`.

**State resets:** State does not reset when `student` prop changes because `selectedStudent` can only be set to `null` (close modal) or a new student value (open new modal). The modal unmounts between students because `{selectedStudent && <Modal>}` fully mounts/unmounts.

---

## Styling

### Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary indigo | `#2a14b4` | Stat card accent, topic count, links |
| Light indigo | `#e3dfff` | Stat card icon bg, avatar bg, hover bg |
| Active green | `#1b6b51` | Active badge text and stat accent |
| Active green bg | `#a6f2d1` | Active badge background (40% opacity) |
| Grey text | `#777586` | Secondary labels, inactive badges |
| Grey bg | `#d9e3f6` | Inactive badge background |
| Page bg tint | `#eff4ff` | Topic table header, modal row hover |
| Modal bg | `#f8f9ff` | Modal container background |
| Card bg | `var(--color-card, #fff)` | Stats cards, table wrapper |
| Ink | `#121c2a` | Headings, primary text |
| Subtext | `#464554` | Secondary text, labels |
| Border | `#c7c4d7` | Dividers and input borders (with opacity) |
| Error red | `#7b0020` | Unassign button text and deactivate button |
| Error red bg | `#ffdada` | Unassign/deactivate hover background |

### Shadow scale

| Name | Value | Usage |
|------|-------|-------|
| M3 elevated card | `0_1px_3px_1px_rgba(0,0,0,0.06), 0_1px_2px_0_rgba(0,0,0,0.1)` | Stats cards, table wrapper, mobile cards |
| Modal panel | `0_8px_24px_3px_rgba(0,0,0,0.12), 0_4px_8px_0_rgba(0,0,0,0.08)` | ModalOverlay panel |
| Info card | `0px_10px_20px_rgba(18,28,42,0.04)` | Modal info cards and topic group cards |
| Save button | `shadow-lg shadow-[#2a14b4]/20` | Save button glow |

### Typography

| Element | Classes |
|---------|---------|
| Category label | `text-[10px] font-body uppercase tracking-[0.2em] text-[#464554] opacity-40` |
| Page title | `font-body font-bold text-3xl text-[#121c2a]` |
| Page subtitle | `text-lg font-body text-[#464554] opacity-80` |
| Table header cells | `text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold` |
| Topic table headers | `text-[10px] font-bold uppercase tracking-[0.08em] text-[#464554]/70` |
| Student name (table) | `font-body font-medium text-[#121c2a]` |
| Modal headline input | `font-body font-bold text-2xl text-[#121c2a]` |
| Modal email input | `text-sm font-body text-[#777586]` |
| Status badge | `text-xs font-body font-bold` |
| Stat card number | `font-body font-bold text-2xl` |
| Stat card label | `text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold` |

### Responsive breakpoints

| Breakpoint | Behavior |
|------------|---------|
| Default (mobile) | Mobile card list visible; stats in 2-column grid |
| `md` (768px) | Desktop table visible; mobile cards hidden; stats in 4-column grid |

---

## i18n Keys

All keys are under the `"teacher"` namespace, consumed via `useTranslations("teacher")` (client) or `getTranslations("teacher")` (server).

| Key | Usage | Example value |
|-----|-------|---------------|
| `directory` | Editorial header category label | `"Directory"` |
| `students` | Page title | `"Students"` |
| `studentsSubtitle` | Page subtitle | `"Manage all students enrolled in your classes"` |
| `totalEnrolled` | Stats card label | `"Total Enrolled"` |
| `active` | Stats card label + status badge | `"Active"` |
| `inactive` | Stats card label + status badge | `"Inactive"` |
| `avgTopics` | Stats card label | `"Avg Topics"` |
| `noStudentsYet` | Empty state message | `"No students enrolled yet."` |
| `studentName` | Table column header | `"Student"` |
| `emailCol` | Table column header | `"Email"` |
| `statusCol` | Table column header + modal label | `"Status"` |
| `languageCol` | Table column header + modal label + topic table header | `"Language"` |
| `topics` | Table column header + modal label | `"Topics"` |
| `topicsCount` | Topic count suffix | `"topics"` |
| `joinedDate` | Row sub-label | `"Joined {date}"` |
| `topicLabel` | Topic table column header | `"Topic"` |
| `createdBy` | Topic table column header | `"Created By"` |
| `assigned` | Topic table column header | `"Assigned"` |
| `unassign` | Unassign button label | `"Unassign"` |
| `nameEmailRequired` | Validation toast | `"Name and email are required."` |
| `studentUpdateFailed` | Error toast | `"Failed to update student."` |
| `studentUpdated` | Success toast | `"Student updated."` |
| `statusUpdateFailed` | Error toast | `"Failed to update status."` |
| `studentActivated` | Success toast | `"Student activated."` |
| `studentDeactivated` | Success toast | `"Student deactivated."` |
| `unassignFailed` | Error toast | `"Failed to unassign topic."` |
| `unassigned` | Success toast | `"Unassigned \"{title}\""` |
| `noTopicsAssigned` | Empty state in modal | `"No topics assigned yet."` |
| `saveChanges` | Save button label | `"Save Changes"` |
| `saving` | Save button loading label | `"Saving…"` |
| `deactivate` | Toggle button label | `"Deactivate"` |
| `activate` | Toggle button label | `"Activate"` |
| `joined` | Modal info card label | `"Joined"` |
| Language name keys | Via `tLang(t, name)` | Language-specific display names |

**Language name i18n:** Language names (e.g. `"English"`, `"Vietnamese"`) are passed through the shared `tLang(t, name)` utility (`src/lib/i18n/tLang.ts`), which looks up the localized name from the `"teacher"` namespace using the raw English name as the key.

---

## Error Handling

### Server-side (page render)

| Failure | Behavior |
|---------|---------|
| `auth()` returns no session | Redirect to `/login` |
| `prisma.classEnrollment.findMany` throws | Next.js unhandled error boundary (error.tsx) shown |

### Client-side (StudentDetailModal)

| Failure | Behavior | UX |
|---------|----------|-----|
| `fetch("/api/languages")` fails | `languages` remains `[]`; `catch(() => {})` silences | Dropdown renders with no options; existing language state preserved |
| `PATCH /api/teacher/students` — network error | Caught by `try/catch`; `saving` reset to `false` | `toast.error(t("studentUpdateFailed"))` |
| `PATCH /api/teacher/students` — non-2xx | `!res.ok` check fires | `toast.error(t("studentUpdateFailed"))` |
| `PATCH /api/teacher/students` — status update non-2xx | `!res.ok` check fires | `toast.error(t("statusUpdateFailed"))` |
| `DELETE /api/teacher/assignments/[id]` — network error | Caught by `try/catch`; `unassigning` reset to `null` | `toast.error(t("unassignFailed"))` |
| `DELETE /api/teacher/assignments/[id]` — non-2xx | `!res.ok` check fires | `toast.error(t("unassignFailed"))` |
| Save with empty name or email | `if (!editName.trim() \|\| !editEmail.trim())` guard before fetch | `toast.error(t("nameEmailRequired"))`; no fetch fired |

All error paths preserve the current modal state (modal stays open, inputs remain editable) unless an operation succeeds (status toggle closes modal on success).

---

## Performance

### Server

- **Single DB round-trip:** One `findMany` with nested includes fetches all enrollment, user, language, class, topic assignment, topic, and creator data in one query.
- **In-memory operations:** Deduplication via `Map` and sorting are O(n) and execute in microseconds for typical roster sizes (< 1000 enrollments).
- **No waterfalls:** `auth()` and `getTranslations()` are called sequentially at the top of the page; `prisma` call follows. There are no parallel queries needed because a single query covers all data.
- **Static metadata:** `export const metadata = { title: "Students" }` — no dynamic metadata computation.

### Client

- **Lazy language fetch:** `GET /api/languages` fires only when the modal mounts, not on page load. Students who never open a modal incur no extra network request.
- **Optimistic UI for unassign:** The `removedIds` set hides rows immediately on DELETE success without waiting for a full re-render from `router.refresh()`. The `refresh()` call syncs server state in the background.
- **No re-renders from stats:** Stats are derived inline from the `students` prop; they do not trigger re-renders independently.
- **Modal unmount:** When `selectedStudent` is set to `null`, the `StudentDetailModal` unmounts completely, releasing all its local state and the `mousedown` event listener.

### Caching

- The page is not statically cached. It is always server-rendered on request because it relies on `auth()` (session-specific data).
- `router.refresh()` after mutations triggers a server re-render of the page segment, refreshing the `students` prop without a full navigation.
- `/api/languages` results could be cached at the HTTP level (e.g. `Cache-Control: public, max-age=3600`) since languages change infrequently. Current implementation does not set explicit cache headers.

### Bundle

- `StudentTable` and `StudentDetailModal` are `"use client"` components and are included in the client bundle.
- `ModalOverlay` uses `motion/react` (Framer Motion) for backdrop and panel animations. This is a shared dependency already present in the bundle.
- `tLang` is a tiny utility with no dependencies; it tree-shakes cleanly.
