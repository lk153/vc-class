# PRD — Teacher Class Detail

**Feature:** Full class management — metadata editing, enrollment, topic assignments, and status control
**Route:** `/teacher/classes/[classId]`
**Last Updated:** 2026-04-15

---

## 1. Overview

The Class Detail page is the operational command centre for a single class. It is where teachers make every meaningful change to a class after creation: rename it, adjust the schedule, shift dates, cap or expand enrollment, change its lifecycle status, enrol and remove students, and review which topics have been assigned.

The page is deliberately edit-first. All metadata fields are directly editable inline — there is no separate "Edit mode" toggle. The teacher makes changes across any combination of fields, and a single "Save Changes" button appears contextually whenever the form state diverges from the server-persisted values. Enrollment and status changes are immediately persisted on their own separate API calls without requiring the "Save Changes" button.

---

## 2. User Stories

### Metadata Editing

**US-01 — Edit class name inline**
> As a teacher, I want to click the class name in the page header and edit it directly so I can rename the class without navigating to a separate form.

**US-02 — Change language and level**
> As a teacher, I want to change the language and level using dropdown pickers in the info card row so I can correct a mistake or update the class progression.

**US-03 — Edit the weekly schedule**
> As a teacher, I want to add, remove, or modify day/time sessions using the ClassSessionEditor so I can reflect a schedule change agreed with students.

**US-04 — Adjust start and end dates**
> As a teacher, I want to edit start and end date fields directly so I can extend, shorten, or shift a class's duration.

**US-05 — Change max students**
> As a teacher, I want to edit the max students number inline so I can open or restrict capacity as needed.

**US-06 — Edit special notes**
> As a teacher, I want to edit the special notes textarea inline so I can keep supplementary information up to date.

**US-07 — Save all metadata at once**
> As a teacher, I want a "Save Changes" button to appear only when I have unsaved edits so I get clear confirmation that my changes are pending and can commit them in one action.

**US-08 — See saving feedback**
> As a teacher, I want the save button to show a spinning indicator while the request is in flight and a success toast when complete so I know the save worked.

### Status Management

**US-09 — Change class lifecycle status**
> As a teacher, I want a status dropdown pill in the page header to switch a class between SCHEDULING, ACTIVE, ENDED, and CANCELLED so I can reflect real-world lifecycle transitions.

**US-10 — Status change is part of save**
> As a teacher, I want status changes to be saved together with other metadata changes via the same "Save Changes" button so I don't need a separate status-save action.

### Student Enrollment

**US-11 — View enrolled students**
> As a teacher, I want to see all currently enrolled students in a list (name, email, enrollment date, remove button) so I know who is in the class.

**US-12 — Remove a student**
> As a teacher, I want to click "Remove" next to an enrolled student and have them unenrolled immediately (with a success toast) so I can manage class composition without a separate screen.

**US-13 — Browse and select students to enrol**
> As a teacher, I want a scrollable list of all active students not yet enrolled in this class so I can browse and multi-select candidates for enrollment.

**US-14 — Enrol multiple students at once**
> As a teacher, I want to check one or more students in the available list and click "Enrol N" to add them all in a single API call so I can efficiently onboard a batch of students.

**US-15 — Respect enrollment capacity**
> As a teacher, I want the enrollment API to reject the batch if it would exceed `maxStudents` and return an error message so I am aware of the capacity limit.

**US-16 — Optimistic unenrollment**
> As a teacher, I want removed students to disappear from the enrolled list immediately (before the API confirms) so the UI feels responsive.

### Topic Assignments

**US-17 — View assigned topics**
> As a teacher, I want to see all topics assigned to this class (title, language badge, assignment date) so I know which curriculum topics students can access.

**US-18 — Navigate to the Assignments page to add topics**
> As a teacher, I want the empty topics state to direct me to the Assignments page so I know where to go to assign more topics.

### Navigation

**US-19 — Return to classes listing**
> As a teacher, I want a "← Classes" back link at the top of the page so I can return to the listing without using the browser back button.

---

## 3. Functional Requirements

### FR-01: Server Data Fetching

The page RSC fetches all required data in a single Prisma query (the class with relations) plus two additional queries:

1. `prisma.class.findUnique` — fetches the class with `language`, `enrollments` (including user details: `id, name, email, status`), and `topicAssignments` (including topic title and topic language name).
2. `prisma.user.findMany` — fetches all ACTIVE students not currently enrolled (`id notIn enrolledIds`).
3. `prisma.language.findMany` — fetches all languages for the language picker in the edit form.

Ownership check: if the class's `teacherId !== session.user.id`, `notFound()` is called.

### FR-02: Data Props to ClassDetailClient

The RSC serialises all data into plain objects and passes them as props to `ClassDetailClient`:

- `classId: string`
- `classInfo: ClassInfo` — `{ name, languageId, languageName, level, schedule, startDate, endDate, maxStudents, specialNotes, status }`
- `languages: Language[]` — `{ id, name, code }[]`
- `enrolledStudents: EnrolledStudent[]` — `{ id, name, email, status, enrolledAt }[]`
- `availableStudents: AvailableStudent[]` — `{ id, name, email }[]`
- `topics: TopicAssignment[]` — `{ id, title, languageName, assignedAt }[]`

All `Date` fields are serialised to ISO strings.

### FR-03: Inline Metadata Editing

All class fields are live-editable in `ClassDetailClient` via controlled state. The component tracks a `hasInfoChanges` boolean derived by comparing current state to the original `classInfo` props. The "Save Changes" button appears only when `hasInfoChanges === true`.

Fields and their edit controls:

| Field | Control |
|---|---|
| `name` | `<input type="text">` with dynamic width (`ch` units), borderless until focused |
| `languageId` | Custom dropdown built on `<button>` + popover list (`langRef`, `langOpen` state) |
| `level` | Custom dropdown (preset list) or plain borderless `<input>` (free text) when no presets |
| `schedule` | `<ClassSessionEditor>` (day/time session rows) |
| `startDate` | `<input type="date">` borderless |
| `endDate` | `<input type="date">` borderless; shows derived week count below |
| `maxStudents` | `<input type="number" min=1 max=100>` borderless |
| `specialNotes` | `<textarea rows=2>` borderless |
| `status` | Custom dropdown (status pill button + popover) in the page header |

### FR-04: Save Metadata

`handleSaveInfo`:
1. Validates `editName.trim()`, `editLevel.trim()`, and at least one complete session.
2. On failure: `toast.error(t("fillRequiredFields"))`.
3. On pass: `setSavingInfo(true)` → `PATCH /api/teacher/classes/{classId}` with all current field values.
4. 2xx: `toast.success(t("classUpdated"))` → `router.refresh()`.
5. Non-2xx or thrown error: `toast.error(t("classUpdateFailed"))`.
6. `finally`: `setSavingInfo(false)`.

### FR-05: Status Dropdown

A custom popover-based dropdown (not `<select>`) renders the four status options with coloured dot indicators. Clicking an option updates `editStatus` state and closes the popover. The change is committed to the server via the standard "Save Changes" flow (i.e., `hasInfoChanges` will be `true` once status changes, and clicking Save persists it via `PATCH`).

### FR-06: Enrol Students

`handleEnroll`:
1. Requires `selectedStudents.size > 0`.
2. `POST /api/teacher/classes/{classId}/enroll` with `{ studentIds: [...selectedStudents] }`.
3. 201: `toast.success(t("studentsEnrolled"))` → `setSelectedStudents(new Set())` → `router.refresh()`.
4. Non-2xx: reads `data.error` from response JSON for a descriptive error toast (e.g. capacity exceeded).

### FR-07: Remove Student (Optimistic)

`handleRemove(userId, name)`:
1. `setRemovingId(userId)` (disables the remove button for that row).
2. `DELETE /api/teacher/classes/{classId}/enroll/{userId}`.
3. 2xx: `toast.success(t("studentRemoved", { name }))` → `setRemovedIds(prev => new Set(prev).add(userId))` → `router.refresh()`.
4. Non-2xx or thrown: `toast.error(t("removeFailed"))`.
5. `finally`: `setRemovingId(null)`.

The `visibleEnrolled` derived array is `enrolledStudents.filter(s => !removedIds.has(s.id))`. Removed students disappear immediately from the UI before `router.refresh()` re-renders with the updated server data.

### FR-08: Topics Section

The topic assignments list is read-only on this page. It displays assigned topics with their title, language badge, and assignment date. Adding new topic assignments is done from the Assignments page (`/teacher/assignments`), and the empty state explicitly directs teachers there.

### FR-09: Enrollment Counter

The stats card row includes an "Enrolled Students" counter showing `visibleEnrolled.length / editMaxStudents`. This updates reactively as students are added or removed (optimistic removal reflected immediately; enrollment confirmed after `router.refresh()`).

---

## 4. Non-Functional Requirements

### NFR-01: Performance
- Server fetches the class and its full relations in one Prisma query; available students and language list are fetched in parallel (`Promise.all` can be used).
- `router.refresh()` re-runs the RSC data fetching on the server and patches the rendered tree without a full navigation.
- All client-side state mutations are synchronous (no async blocking); API calls are awaited but the UI does not block interactions in other sections while one section is saving.

### NFR-02: Security
- Session required; unauthenticated users redirected to `/login`.
- Class ownership enforced server-side: `cls.teacherId !== session.user.id` → `notFound()`.
- All API route handlers re-verify session and ownership independently before any mutation.
- The available students query filters by `role: "STUDENT"` and `status: "ACTIVE"` to prevent enrolling non-student or suspended accounts.

### NFR-03: Accessibility
- Status dropdown: `aria-expanded` on the trigger button; dropdown items are `<button>` elements (keyboard-navigable).
- Language/level droppers: same pattern as status.
- Inline text inputs: visible focus ring (`focus:border-[#2a14b4]`); width is dynamic but always at least 2ch.
- Student avatar initials: derived from `name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()`.
- Remove button: disabled during in-flight request (`disabled={removingId === student.id}`).

### NFR-04: Responsiveness
- Info card row: 2 columns on mobile, 4 columns on `md:` and above.
- Duration/date/max-students row: single column on mobile, 3 columns on `sm:`.
- Student list: enrollment date hidden on mobile (`hidden sm:block`).
- Available students list: scrollable with `max-h-[300px] overflow-y-auto`.

### NFR-05: Internationalisation
- Client component uses `useTranslations("teacher")`.
- Language names displayed via `tLang(t, lang.name)`.
- Schedule sessions displayed via `formatSessions(editSessions, t)` from `ClassSessionEditor`.
- Enrollment date formatted as DD/MM/YYYY inline without `Intl.DateTimeFormat` (consistent with existing project style).

---

## 5. UI/UX Requirements

### Layout (top → bottom)
1. Back link row ("← Classes").
2. Header row: inline-editable class name (left) + status dropdown pill (right).
3. Subtitle: `{languageName} · {level} · {scheduleFormatted}`.
4. Info card row (2→4 columns): Language picker, Level picker, Enrolled/Max counter, Topics counter.
5. ClassSessionEditor card.
6. Duration + max students row (start date, end date, max students).
7. Special notes textarea card.
8. Contextual "Save Changes" button row (appears only when `hasInfoChanges`).
9. Enrolled Students panel (list + remove buttons).
10. Add Students panel (available student checklist + "Enrol N" button) — only if `availableStudents.length > 0`.
11. Assigned Topics panel (read-only list).

### Interaction Principles

- **Edit-first:** All metadata fields are always in their editable state. There is no "read mode" that requires a click to enter edit mode.
- **Contextual save:** The Save button only appears when state differs from props. This communicates clearly that there are pending changes without forcing teachers to remember to save.
- **Status pill in header:** The status badge doubles as a dropdown trigger, making the class lifecycle state both highly visible and instantly changeable without scrolling.
- **Optimistic removal:** Removed students disappear immediately (via `removedIds` filter) so the teacher doesn't wait for `router.refresh()`.
- **Multi-select enrolment:** Students in the available list are toggled via a checkbox-style pattern (single click toggles selection; the entire row is the hit target). The "Enrol N" button appears in the panel header only when at least one student is selected.

### Visual Design

- The editable name uses a borderless input that reveals its interactive nature via a bottom border on hover/focus and a small `edit` icon (pencil, 75% scale, fades in on group hover).
- Info cards use the same white rounded-2xl card pattern as the rest of the teacher dashboard.
- The enrolled students list and topics list use the same divide-based row pattern as other teacher tables.
- Available students checklist rows use a `check_circle` / `radio_button_unchecked` icon pair with green / muted colours for selected / unselected states.

---

## 6. Edge Cases

| Case | Expected Behaviour |
|---|---|
| Class not found (wrong classId) | `notFound()` → Next.js 404 page |
| Teacher tries to access another teacher's class | Ownership check fails → `notFound()` (not a 403, to avoid information leakage) |
| Class has 0 enrolled students | Enrolled panel shows empty state with italic placeholder text |
| Class is at capacity (`enrolled >= maxStudents`) | Available students panel is still shown; POST to enroll will return 400 with the remaining-spots error; `data.error` is surfaced in the toast |
| No available students (all enrolled or none exist) | Available students panel is not rendered (`availableStudents.length === 0` guard) |
| Class has no topic assignments | Topics panel shows empty state directing teacher to Assignments page |
| Name input reduced to empty string | `handleSaveInfo` validation catches `!editName.trim()` and shows error toast |
| All ClassSessionEditor sessions cleared to incomplete | `validSessions.length === 0` guard triggers error toast |
| `editEndDate` set before `editStartDate` | Week count shows ≤ 0; no crash; save still succeeds (API doesn't validate date order) |
| Remove request for already-removed student | `DELETE` returns 2xx (Prisma `deleteMany` is idempotent); optimistic removal already hid the row; no visible change |
| Enrol batch exceeds remaining capacity | API returns 400 `{ error: "Only N spots remaining" }`; `data.error` surfaced in toast |
| `router.refresh()` fails (network error) | Silent — state is already updated optimistically; stale RSC cache may persist until next navigation |
| Status dropdown clicked outside | `mousedown` document listener closes the dropdown via `setStatusOpen(false)` |
| Language dropdown clicked outside | `mousedown` document listener closes via `setLangOpen(false)` |
| Language changed on detail page | `setEditLevel("")` resets level to avoid stale level for new language |

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Metadata save success rate | > 98% of PATCH requests return 2xx | API error log rate |
| Time to enrol a student batch | < 30 s from landing to toast confirmation | UX observation |
| Enrollment errors due to capacity | < 5% of enrolment attempts | 400 response rate on enroll endpoint |
| Page load time (TTFB) | < 600 ms | Vercel analytics |
| Student removal optimistic UX | No visible lag between click and row disappearance | `setRemovedIds` fires synchronously before API response |
| Empty-state topic CTA conversion | ≥ 50% of page visits with 0 topics result in a visit to /teacher/assignments | Navigation tracking |
