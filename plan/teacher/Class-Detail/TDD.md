# TDD — Teacher Class Detail

**Feature:** Full class management — metadata editing, enrollment, topics, status
**Route:** `/teacher/classes/[classId]`
**Last Updated:** 2026-04-15

---

## 1. Architecture Overview

The Class Detail route uses the standard Next.js 16 App Router RSC + Client split. The RSC page (`page.tsx`) handles authentication, ownership verification, and all database reads. It then passes serialised plain-object props to `ClassDetailClient`, a `"use client"` component that owns all interactive state.

```
Server (RSC)                              Client
────────────────────────────────          ─────────────────────────────────────────────
ClassDetailPage (page.tsx)                ClassDetailClient (ClassDetailClient.tsx)
  await auth()                              useState: editName, editLanguageId,
  await params → classId                              editLevel, editSessions,
  prisma.class.findUnique()                           editStartDate, editEndDate,
    include: language, enrollments          editMaxStudents, editNotes, editStatus
              (user), topicAssignments       statusOpen, langOpen, levelOpen
              (topic.language)               savingInfo
  prisma.user.findMany()                    selectedStudents (Set<string>)
    ACTIVE students not enrolled            enrolling, removingId, removedIds (Set)
  prisma.language.findMany()              handleSaveInfo → PATCH /api/teacher/classes/{id}
  Ownership check → notFound()            handleEnroll   → POST .../enroll
  Serialise props to plain objects        handleRemove   → DELETE .../enroll/{userId}
  Render ClassDetailClient                ClassSessionEditor (controlled)
                                          tLang, formatSessions
                                          toast (sonner) + router.refresh()
```

No external state manager. All interactive state lives in `ClassDetailClient` via `useState`. Three separate API interactions (save metadata, enrol, remove) are independent; they do not share a loading state.

---

## 2. Route & Data Flow

### 2.1 URL Structure

```
/teacher/classes/[classId]
                  └── classId: cuid string, e.g. "clz1abc2def3ghi"
```

### 2.2 Server-Side Flow

```
Request → ClassDetailPage (RSC)
  │
  ├─ await auth()
  │    └─ No session → redirect("/login")
  │
  ├─ await params → { classId }   (async params, Next.js 16 pattern)
  │
  ├─ await getTranslations("teacher")
  │
  ├─ prisma.class.findUnique({
  │     where: { id: classId },
  │     include: {
  │       language: true,
  │       enrollments: {
  │         include: { user: { select: { id, name, email, status } } },
  │         orderBy: { enrolledAt: "desc" }
  │       },
  │       topicAssignments: {
  │         include: { topic: { include: { language: true } } },
  │         orderBy: { assignedAt: "desc" }
  │       }
  │     }
  │   })
  │
  ├─ cls === null || cls.teacherId !== session.user.id → notFound()
  │
  ├─ enrolledIds = cls.enrollments.map(e => e.userId)
  │
  ├─ prisma.user.findMany({
  │     where: { role: "STUDENT", status: "ACTIVE",
  │              id: { notIn: enrolledIds.length > 0 ? enrolledIds : ["_none_"] } },
  │     select: { id, name, email },
  │     orderBy: { name: "asc" }
  │   })
  │
  ├─ prisma.language.findMany({ orderBy: { name: "asc" } })
  │
  └─ Render <ClassDetailClient
               classId={classId}
               classInfo={{ name, languageId, languageName, level, schedule,
                            startDate: cls.startDate.toISOString().split("T")[0],
                            endDate:   cls.endDate.toISOString().split("T")[0],
                            maxStudents, specialNotes: cls.specialNotes || "",
                            status }}
               languages={languages.map(l => ({ id, name, code }))}
               enrolledStudents={cls.enrollments.map(e => ({
                 id: e.user.id, name: e.user.name, email: e.user.email,
                 status: e.user.status, enrolledAt: e.enrolledAt.toISOString()
               }))}
               availableStudents={availableStudents}
               topics={cls.topicAssignments.map(ta => ({
                 id: ta.id, title: ta.topic.title,
                 languageName: ta.topic.language.name,
                 assignedAt: ta.assignedAt.toISOString()
               }))}
             />
```

### 2.3 Client-Side Interaction Flows

#### Save Metadata (PATCH)

```
handleSaveInfo()
  │
  ├─ validSessions = editSessions.filter(s => s.day && s.startTime && s.endTime)
  ├─ Guard: !editName.trim() || !editLevel.trim() || validSessions.length === 0
  │    └─ toast.error(t("fillRequiredFields")); return
  │
  ├─ setSavingInfo(true)
  ├─ PATCH /api/teacher/classes/{classId}
  │    body: { name, languageId, level, schedule: JSON.stringify(validSessions),
  │            startDate, endDate, maxStudents, specialNotes, status }
  │
  ├─ 2xx → toast.success(t("classUpdated")); router.refresh()
  ├─ non-2xx → toast.error(t("classUpdateFailed"))
  └─ finally → setSavingInfo(false)
```

#### Enrol Students (POST)

```
handleEnroll()
  │
  ├─ Guard: selectedStudents.size === 0 → return
  ├─ setEnrolling(true)
  ├─ POST /api/teacher/classes/{classId}/enroll
  │    body: { studentIds: [...selectedStudents] }
  │
  ├─ 201 → toast.success(t("studentsEnrolled"))
  │         setSelectedStudents(new Set())
  │         router.refresh()
  ├─ non-2xx → data = await res.json(); toast.error(data.error || t("enrollFailed"))
  └─ finally → setEnrolling(false)
```

#### Remove Student (DELETE — Optimistic)

```
handleRemove(userId, name)
  │
  ├─ setRemovingId(userId)
  ├─ DELETE /api/teacher/classes/{classId}/enroll/{userId}
  │
  ├─ 2xx → toast.success(t("studentRemoved", { name }))
  │         setRemovedIds(prev => new Set(prev).add(userId))  ← optimistic hide
  │         router.refresh()
  ├─ non-2xx → toast.error(t("removeFailed"))
  └─ finally → setRemovingId(null)
```

---

## 3. Component Tree

```
TeacherShell (layout.tsx)
└── ClassDetailPage (RSC — page.tsx)
    ├── <Link href="/teacher/classes"> ← Classes
    └── ClassDetailClient ("use client" — components/teacher/ClassDetailClient.tsx)
        │
        ├── Header Row
        │   ├── Editable Name (input[type=text], dynamic ch width, borderless)
        │   │   └── edit pencil icon (group hover reveal)
        │   ├── Subtitle: languageName · level · scheduleFormatted
        │   └── Status Dropdown (div ref=statusRef)
        │       ├── Trigger <button> (coloured pill + dot + expand_more)
        │       └── [if statusOpen] Popover list (4 options × button)
        │
        ├── Info Card Row (grid 2→md:4 cols)
        │   ├── Language Card (div ref=langRef)
        │   │   ├── Label
        │   │   ├── Trigger <button>
        │   │   └── [if langOpen] Popover language list
        │   ├── Level Card (div ref=levelRef)
        │   │   ├── Label
        │   │   ├── [if presets] Custom dropdown + popover
        │   │   └── [else] borderless <input type=text>
        │   ├── Enrolled / Max Card (read display only)
        │   └── Topics Count Card (read display only)
        │
        ├── Schedule Card (bg-white rounded-2xl)
        │   └── ClassSessionEditor (controlled: editSessions, setEditSessions)
        │
        ├── Duration + Max Row (grid 1→sm:3 cols)
        │   ├── Start Date Card (<input type=date>)
        │   ├── End Date Card (<input type=date> + week count label)
        │   └── Max Students Card (<input type=number>)
        │
        ├── Special Notes Card (<textarea rows=2>)
        │
        ├── [if hasInfoChanges] Save Changes Row
        │   └── <button onClick=handleSaveInfo disabled=savingInfo>
        │         save icon (spinning progress_activity when saving)
        │
        ├── Enrolled Students Panel (bg-white rounded-2xl)
        │   ├── Header (group icon + "Enrolled Students")
        │   ├── [if visibleEnrolled.length > 0] Student rows (divide-y)
        │   │   └── StudentRow × N
        │   │       ├── Avatar circle (initials)
        │   │       ├── Name + email
        │   │       ├── Enrolled date (hidden sm:block)
        │   │       └── <button onClick=handleRemove disabled=removingId===id>
        │   │             person_remove icon + "Remove"
        │   └── [else] Empty placeholder (italic muted text)
        │
        ├── [if availableStudents.length > 0] Add Students Panel (bg-[#eff4ff])
        │   ├── Header (person_add icon + "Enrol Students")
        │   ├── [if selectedStudents.size > 0] "Enrol N" button (top-right)
        │   └── Scrollable checklist (max-h-[300px] overflow-y-auto)
        │       └── StudentToggleRow × M
        │           ├── Avatar circle (initials)
        │           ├── Name + email
        │           └── check_circle (filled, green) | radio_button_unchecked (muted)
        │
        └── Assigned Topics Panel (bg-white rounded-2xl)
            ├── Header (menu_book icon + "Topics")
            ├── [if topics.length > 0] Topic rows (divide-y)
            │   └── TopicRow × K
            │       ├── Topic title
            │       ├── Language badge (green pill)
            │       └── Assignment date (hidden sm:block)
            └── [else] Empty placeholder + hint to visit /teacher/assignments
```

---

## 4. Database Queries

### 4.1 Class + Relations Fetch

```sql
-- prisma.class.findUnique() with deep include
SELECT
  c.*,
  l.id, l.name AS lang_name, l.code,
  -- enrollments
  ce.id AS enr_id, ce.enrolled_at,
  u.id AS user_id, u.name AS user_name, u.email, u.status AS user_status,
  -- topic assignments
  ta.id AS ta_id, ta.assigned_at,
  t.id AS topic_id, t.title,
  tl.name AS topic_lang_name
FROM classes c
JOIN languages l ON l.id = c.language_id
LEFT JOIN class_enrollments ce ON ce.class_id = c.id
LEFT JOIN users u ON u.id = ce.user_id
LEFT JOIN topic_assignments ta ON ta.class_id = c.id
LEFT JOIN topics t ON t.id = ta.topic_id
LEFT JOIN languages tl ON tl.id = t.language_id
WHERE c.id = $classId;
```

Prisma translates this into nested joins. The result includes all enrolled users and all assigned topics with their languages.

### 4.2 Available Students Fetch

```sql
-- prisma.user.findMany()
SELECT id, name, email
FROM users
WHERE role = 'STUDENT'
  AND status = 'ACTIVE'
  AND id NOT IN ($enrolledIds)   -- or: AND id <> '_none_' if enrolledIds is empty
ORDER BY name ASC;
```

The `["_none_"]` placeholder prevents a Prisma error when `notIn` receives an empty array.

### 4.3 Language List Fetch

```sql
-- prisma.language.findMany()
SELECT id, name, code FROM languages ORDER BY name ASC;
```

### 4.4 PATCH: Update Class

```sql
-- prisma.class.update()
UPDATE classes
SET
  name        = $name,
  language_id = $languageId,
  level       = $level,
  schedule    = $schedule,
  start_date  = $startDate,
  end_date    = $endDate,
  max_students = $maxStudents,
  special_notes = $specialNotes,
  status      = $status,
  updated_at  = now()
WHERE id = $classId
RETURNING *;
```

The API route uses a partial update pattern: it builds `updateData` by only including keys present in the request body, then calls `prisma.class.update({ where: { id: classId }, data: updateData })`. Ownership is re-verified before the update.

### 4.5 POST: Bulk Enrol Students

```sql
-- prisma.classEnrollment.createMany()
INSERT INTO class_enrollments (id, class_id, user_id, enrolled_at)
VALUES
  (cuid(), $classId, $userId1, now()),
  (cuid(), $classId, $userId2, now()),
  ...
ON CONFLICT (class_id, user_id) DO NOTHING;  -- skipDuplicates: true
```

A capacity check runs before the insert:
```sql
SELECT COUNT(*) AS enrolled FROM class_enrollments WHERE class_id = $classId;
-- Compare: cls.maxStudents - enrolled >= studentIds.length
```

### 4.6 DELETE: Remove Enrollment

```sql
-- prisma.classEnrollment.deleteMany()
DELETE FROM class_enrollments
WHERE class_id = $classId AND user_id = $userId;
```

`deleteMany` is used (not `delete`) so the operation is idempotent (no error if the enrollment row was already removed).

---

## 5. API Endpoints

### 5.1 PATCH `/api/teacher/classes/[classId]`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/[classId]/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Ownership | `existing.teacherId !== session.user.id` → 404 |
| Request body | Partial `Class` fields: `name?, languageId?, level?, schedule?, startDate?, endDate?, maxStudents?, specialNotes?, status?` |
| Response (200) | Updated `Class` with `language` included |
| Response (401) | `{ error: "Unauthorized" }` |
| Response (404) | `{ error: "Not found" }` |
| Side effects | Updates one row in `classes`; sets `updatedAt` automatically via Prisma `@updatedAt` |

### 5.2 DELETE `/api/teacher/classes/[classId]`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/[classId]/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Ownership | `existing.teacherId !== session.user.id` → 404 |
| Response (200) | `{ success: true }` |
| Side effects | Cascades deletes to `class_enrollments` and `topic_assignments` via `onDelete: Cascade` in the schema |
| Note | Class deletion is not surfaced in the UI currently; the endpoint exists for future use |

### 5.3 POST `/api/teacher/classes/[classId]/enroll`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/[classId]/enroll/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Ownership | `cls.teacherId !== session.user.id` → 404 |
| Request body | `{ studentIds: string[] }` |
| Validation | `studentIds` must be a non-empty array; capacity check: `studentIds.length <= cls.maxStudents - cls._count.enrollments` |
| Response (201) | `{ count: number }` — number of rows inserted |
| Response (400) | `{ error: "No students provided" }` or `{ error: "Only N spots remaining" }` |
| Response (404) | `{ error: "Not found" }` |
| Side effects | `createMany` with `skipDuplicates: true` into `class_enrollments` |

### 5.4 DELETE `/api/teacher/classes/[classId]/enroll/[userId]`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/[classId]/enroll/[userId]/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Ownership | `cls.teacherId !== session.user.id` → 404 |
| Response (200) | `{ success: true }` |
| Side effects | `deleteMany` from `class_enrollments` where `classId AND userId` |

---

## 6. State Management

All state is local to `ClassDetailClient` via `useState` and `useRef`. No external store.

### 6.1 Metadata Edit State

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `editName` | `string` | `classInfo.name` | Controlled name input |
| `editLanguageId` | `string` | `classInfo.languageId` | Selected language ID |
| `editLevel` | `string` | `classInfo.level` | Selected or typed level |
| `editSessions` | `Session[]` | `parseSessions(classInfo.schedule)` | ClassSessionEditor state |
| `editStartDate` | `string` | `classInfo.startDate` | YYYY-MM-DD date string |
| `editEndDate` | `string` | `classInfo.endDate` | YYYY-MM-DD date string |
| `editMaxStudents` | `number` | `classInfo.maxStudents` | Integer max capacity |
| `editNotes` | `string` | `classInfo.specialNotes` | Textarea value |
| `editStatus` | `string` | `classInfo.status` | ClassStatus enum value |
| `savingInfo` | `boolean` | `false` | Disables save button during PATCH |

### 6.2 Dropdown Toggle State

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `statusOpen` | `boolean` | `false` | Status popover visibility |
| `langOpen` | `boolean` | `false` | Language popover visibility |
| `levelOpen` | `boolean` | `false` | Level popover visibility |

Each dropdown has a corresponding `useRef<HTMLDivElement>` (`statusRef`, `langRef`, `levelRef`) for click-outside detection.

A single `useEffect` registers one `mousedown` document listener on mount that checks all three refs and closes the corresponding dropdown if a click occurs outside. Cleanup removes the listener on unmount.

### 6.3 Enrollment State

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `selectedStudents` | `Set<string>` | `new Set()` | Set of student IDs checked for batch enrolment |
| `enrolling` | `boolean` | `false` | Disables "Enrol N" button during POST |
| `removingId` | `string \| null` | `null` | ID of student whose Remove button is disabled during DELETE |
| `removedIds` | `Set<string>` | `new Set()` | Optimistically hidden student IDs (removed from `visibleEnrolled`) |

### 6.4 Derived State

```ts
// Metadata
const hasInfoChanges =
  editName !== classInfo.name ||
  editLanguageId !== classInfo.languageId ||
  editLevel !== classInfo.level ||
  editScheduleJson !== classInfo.schedule ||     // JSON.stringify(valid sessions)
  editStartDate !== classInfo.startDate ||
  editEndDate !== classInfo.endDate ||
  editMaxStudents !== classInfo.maxStudents ||
  editNotes !== classInfo.specialNotes ||
  editStatus !== classInfo.status;

const selectedLang = languages.find(l => l.id === editLanguageId);
const presets = selectedLang ? levelPresets[selectedLang.code] || [] : [];
const currentStatus = statusOptions.find(s => s.value === editStatus) || statusOptions[0];

const weeks = Math.ceil(
  (new Date(editEndDate).getTime() - new Date(editStartDate).getTime()) /
  (7 * 24 * 60 * 60 * 1000)
);

// Enrollment
const visibleEnrolled = enrolledStudents.filter(s => !removedIds.has(s.id));
const editScheduleJson = JSON.stringify(
  editSessions.filter(s => s.day && s.startTime && s.endTime)
);
```

### 6.5 Status Options Constant

```ts
const statusOptions = [
  { value: "SCHEDULING", key: "scheduling", icon: "schedule",
    bg: "bg-[#d9e3f6]",      text: "text-[#464554]", dot: "bg-[#464554]" },
  { value: "ACTIVE",     key: "active",     icon: "check_circle",
    bg: "bg-[#a6f2d1]/40",   text: "text-[#1b6b51]", dot: "bg-[#1b6b51]" },
  { value: "ENDED",      key: "ended",      icon: "cancel",
    bg: "bg-[#ffdada]/40",   text: "text-[#7b0020]", dot: "bg-[#7b0020]" },
  { value: "CANCELLED",  key: "cancelled",  icon: "block",
    bg: "bg-[#d9e3f6]/50",   text: "text-[#777586]", dot: "bg-[#777586]" },
];
```

### 6.6 Level Presets Constant

```ts
const levelPresets: Record<string, string[]> = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
};
```

---

## 7. Styling

### 7.1 Design Tokens

| Token | Hex | Usage |
|---|---|---|
| Brand Indigo | `#2a14b4` | Save button, counters, link colour |
| Brand Indigo Light | `#eff4ff` | Add students panel bg |
| Brand Indigo Pale | `#e3dfff` | Avatar bg, popover selected item bg |
| Text Primary | `#121c2a` | Headings, editable field values |
| Text Secondary | `#464554` | Subtitle text |
| Text Muted | `#777586` | Labels (10px uppercase), date text |
| Border Muted | `#c7c4d7` | Dividers, input hover borders |
| Active Green | `#a6f2d1` / `#1b6b51` | ACTIVE badge, topic language badge, enrolled count |
| Ended Red | `#ffdada` / `#7b0020` | ENDED badge, remove button hover |
| Card Shadow | `0px_20px_40px_rgba(18,28,42,0.04)` | Info cards, section panels |
| Popover Shadow | `0px_20px_40px_rgba(18,28,42,0.12)` | All dropdown popovers |

### 7.2 Editable Name Input

```
input[type="text"]
  style={{ width: `${Math.max(editName.length, 1) + 1}ch` }}
  className="font-body font-bold text-2xl sm:text-3xl text-[#121c2a]
             bg-transparent border-b-2 border-transparent
             hover:border-[#c7c4d7]/40 focus:border-[#2a14b4]
             outline-none transition-colors px-0 py-0.5
             min-w-[2ch] max-w-full"
```

The pencil icon sits beside the input with `pointer-events-none` and fades from muted to indigo on the enclosing `group/name` hover.

### 7.3 Borderless Date / Number Inputs

All date and number inputs inside the info cards use:
```
className="... bg-transparent border-b-2 border-transparent
            hover:border-[#c7c4d7]/40 focus:border-[#2a14b4]
            outline-none transition-colors px-0 py-0.5"
```

No outer border; the bottom border appears on hover/focus only.

### 7.4 Popover Pattern

All three dropdowns (status, language, level) use the same layered `z-50` popover:
```
position: absolute; top: 100%; right/left: 0; mt: 6px
bg-white rounded-2xl
shadow-[0px_20px_40px_rgba(18,28,42,0.12)]
border border-[#c7c4d7]/15
py-1.5
```

Selected option: `bg-[#f5f3ff]` bg + `check` icon in indigo on the right.
Hover: `hover:bg-[#f8f9ff]`.

### 7.5 Student Toggle Row

```
button.w-full.text-left.flex.items-center.gap-3.p-3.rounded-xl
  isSelected → bg-white shadow-card   (selected: elevated)
  !isSelected → hover:bg-white/60     (hover: slight lift)

check_circle (filled via fontVariationSettings "'FILL' 1", green) when selected
radio_button_unchecked (muted) when not selected
```

### 7.6 Responsive Layout

```
Header row:      flex-col sm:flex-row sm:items-start justify-between
Info card row:   grid-cols-2 md:grid-cols-4
Duration row:    grid-cols-1 sm:grid-cols-3
Student list:    date column hidden sm:block
```

---

## 8. i18n Keys

All keys in the `"teacher"` namespace.

### Metadata & Header

| Key | English Value |
|---|---|
| `teacher.classes` | `"Classes"` |
| `teacher.classLanguage` | `"Language"` |
| `teacher.classLevel` | `"Level"` |
| `teacher.classSchedule` | `"Weekly Schedule"` |
| `teacher.classStartDate` | `"Start Date"` |
| `teacher.classEndDate` | `"End Date"` |
| `teacher.classMaxStudents` | `"Max Students"` |
| `teacher.classSpecialNotes` | `"Special Notes"` |
| `teacher.weeksCount` | `"{count} weeks"` |
| `teacher.selectLevel` | `"Select level"` |
| `teacher.fillRequiredFields` | `"Please fill in all required fields."` |
| `teacher.classUpdated` | `"Class updated successfully!"` |
| `teacher.classUpdateFailed` | `"Failed to save changes. Please try again."` |
| `teacher.saveChanges` | `"Save Changes"` |
| `teacher.savingChanges` | `"Saving..."` |

### Status

| Key | English Value |
|---|---|
| `teacher.scheduling` | `"Scheduling"` |
| `teacher.active` | `"Active"` |
| `teacher.ended` | `"Ended"` |
| `teacher.cancelled` | `"Cancelled"` |

### Enrollment

| Key | English Value |
|---|---|
| `teacher.enrolledStudents` | `"Enrolled Students"` |
| `teacher.enrollStudents` | `"Add Students"` |
| `teacher.removeStudent` | `"Remove"` |
| `teacher.studentsEnrolled` | `"Students enrolled successfully!"` |
| `teacher.studentRemoved` | `"{name} has been removed from the class."` |
| `teacher.enrollFailed` | `"Failed to enrol students. Please try again."` |
| `teacher.removeFailed` | `"Failed to remove student. Please try again."` |

### Topics

| Key | English Value |
|---|---|
| `teacher.classTopics` | `"Assigned Topics"` |

---

## 9. Error Handling

### 9.1 Server-Side (ClassDetailPage RSC)

| Scenario | Handling |
|---|---|
| No active session | `redirect("/login")` — hard redirect |
| Class not found (invalid classId) | `notFound()` → Next.js 404 page |
| Class found but belongs to a different teacher | `notFound()` — same as not found (no 403 leakage) |
| Prisma query error (e.g. DB unreachable) | Unhandled — propagates to Next.js error boundary (500 page) |

### 9.2 Client-Side (ClassDetailClient)

| Scenario | Handling |
|---|---|
| Save with empty name or level | `toast.error(t("fillRequiredFields"))`; no fetch |
| Save with zero complete sessions | Same as above |
| PATCH returns non-2xx | `toast.error(t("classUpdateFailed"))`; `setSavingInfo(false)` |
| PATCH throws (network error) | Same |
| Enrol with no selected students | Guard `selectedStudents.size === 0`; function returns early |
| Enrol POST returns 400 (capacity) | `data.error` is surfaced in `toast.error(data.error || t("enrollFailed"))` |
| Enrol POST non-2xx other | `toast.error(data.error || t("enrollFailed"))` |
| Remove DELETE returns non-2xx | `toast.error(t("removeFailed"))`; row is NOT added to `removedIds` |
| Remove DELETE throws | Same as non-2xx |
| Status dropdown closed by clicking outside | `mousedown` listener → `setStatusOpen(false)` |
| Language dropdown closed by clicking outside | `mousedown` listener → `setLangOpen(false)` |
| Level dropdown closed by clicking outside | `mousedown` listener → `setLevelOpen(false)` |

---

## 10. Performance Considerations

### 10.1 Server-Side

- **Three Prisma queries per request:** class+relations (1), available students (2), languages (3). Queries 2 and 3 do not depend on query 1's result (beyond the `enrolledIds` array); they can be parallelised:
  ```ts
  const [availableStudents, languages] = await Promise.all([
    prisma.user.findMany({ ... }),
    prisma.language.findMany({ ... }),
  ]);
  ```
  The class query must complete first (to extract `enrolledIds`), so the pattern is sequential-then-parallel.

- The `notIn` available-students query has a `["_none_"]` workaround for empty arrays. This adds a trivially false predicate that the query planner discards efficiently.

- Enrolled student list is ordered `enrolledAt DESC` server-side; no client-side re-sorting needed.

### 10.2 Client-Side

- **`router.refresh()`** after mutations re-runs the RSC and patches only changed nodes in the React tree; it does not cause a full page navigation or scroll reset.

- **`hasInfoChanges`** is a pure derived boolean recomputed on every render. At 9 fields it is O(1) string comparison per field — no `useMemo` needed.

- **`visibleEnrolled`** is an `Array.filter` over the enrolled list. For typical class sizes (< 50 students) the O(N) filter is negligible; no memo needed.

- **`editScheduleJson`** is `JSON.stringify` of a small array (typically 1–5 sessions); computed inline without memoisation.

- **Click-outside detection** uses a single document `mousedown` listener for all three dropdowns, registered in one `useEffect`. This is more efficient than three separate effects and listeners.

- **Student toggle** uses `Set<string>` for O(1) membership checks in `selectedStudents.has(id)` — avoids O(N) array scans in the checklist render.

- **Optimistic removal** (`removedIds` Set + `visibleEnrolled` filter) gives instant UI feedback without waiting for `router.refresh()`. The RSC refresh is still triggered to sync server state, but it doesn't gate the visual update.

### 10.3 Bundle Impact

`ClassDetailClient` is `"use client"`. It adds to the teacher JS bundle: `useState`, `useRef`, `useEffect`, `useRouter`, `useTranslations`, `tLang`, `ClassSessionEditor`, `parseSessions`, `formatSessions`, and `toast`. All of these are already present in the teacher shell or shared across teacher pages — no new third-party libraries are added. `ClassDetailClient` does not import `framer-motion` or any animation library; all transitions use Tailwind utility classes.
