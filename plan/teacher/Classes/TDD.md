# TDD — Teacher Classes Listing & Create Class

**Feature:** Class management — listing and creation
**Routes:** `/teacher/classes` · `/teacher/classes/create`
**Last Updated:** 2026-04-15

---

## 1. Architecture Overview

Both routes live under the teacher layout (`src/app/teacher/layout.tsx`) which wraps the page in `TeacherShell` (sidebar + main content area). The listing page is a pure React Server Component. The create page is a `"use client"` component because it owns complex form state, API calls, and side effects.

```
Server (RSC)                          Client
────────────────────────────          ──────────────────────────────────────────
ClassesPage (page.tsx)                CreateClassPage (create/page.tsx)
  auth() check                          useState: name, languageId, level,
  prisma.class.findMany()                         sessions, startDate, endDate,
    where: teacherId = user.id                    maxStudents, specialNotes,
    include: language, _count                     saving, languages
  Derive: activeCount, totalStudents    useEffect: GET /api/languages on mount
  Render grid of class cards            ClassSessionEditor (controlled)
  No hydration for grid                 handleSubmit → POST /api/teacher/classes
                                        toast (sonner) + router.push
```

No external state manager. No client-side data fetching on the listing page — everything is serialised server-side. The create page fetches only the language list client-side (small, rarely-changing data that doesn't justify a server round-trip for the whole page).

---

## 2. Route & Data Flow

### 2.1 URL Structure

```
/teacher/classes
/teacher/classes/create
```

Both are under the `src/app/teacher/` segment which requires a `TEACHER` role session (enforced at page level via `auth()`).

### 2.2 Listing — Server-Side Flow

```
Request → ClassesPage (RSC)
  │
  ├─ await auth()
  │    └─ No session → redirect("/login")
  │
  ├─ await getTranslations("teacher")
  │
  ├─ prisma.class.findMany({
  │     where: { teacherId: session.user.id },
  │     include: {
  │       language: true,
  │       _count: { select: { enrollments: true, topicAssignments: true } }
  │     },
  │     orderBy: { createdAt: "desc" }
  │   })
  │
  ├─ Derive in-memory:
  │    activeCount    = classes.filter(c => c.status === "ACTIVE").length
  │    totalStudents  = classes.reduce((sum, c) => sum + c._count.enrollments, 0)
  │
  └─ Render JSX (no client JS for grid)
```

### 2.3 Listing — Schedule Formatting

`formatSchedule(schedule: string, t: (key: string) => string): string`

Defined inline in `page.tsx`:
1. `JSON.parse(schedule)` inside try/catch.
2. If parsed value is an array, filter sessions where `day && startTime && endTime`.
3. Map each session: translate day via `DAY_TRANSLATION_KEYS[s.day]`, concatenate `${dayLabel} ${s.startTime}–${s.endTime}`.
4. Join with ` | `.
5. Catch block: return raw `schedule` string (legacy text format).

### 2.4 Create Class — Client Flow

```
CreateClassPage mounts
  │
  ├─ useState initialisation (all empty/default)
  ├─ useEffect → fetch("/api/languages").then(setLanguages)
  │
  ├─ User selects language
  │    └─ setLanguageId(id); setLevel("")   ← reset level on change
  │
  ├─ selectedLang derived: languages.find(l => l.id === languageId)
  ├─ presets derived: levelPresets[selectedLang.code] || []
  │
  ├─ User completes form + submits
  │    │
  │    ├─ validSessions = sessions.filter(s => s.day && s.startTime && s.endTime)
  │    ├─ Client validation → toast.error if any required field missing
  │    │
  │    └─ fetch("POST /api/teacher/classes", { body: JSON.stringify({
  │           name, languageId, level,
  │           schedule: JSON.stringify(validSessions),
  │           startDate, endDate, maxStudents,
  │           specialNotes: specialNotes.trim() || null
  │         })
  │       })
  │
  ├─ 201 → toast.success → router.push("/teacher/classes") + router.refresh()
  └─ non-2xx → toast.error(t("createClassError")); setSaving(false)
```

---

## 3. Component Tree

### 3.1 Classes Listing

```
TeacherShell (layout.tsx)
└── ClassesPage (RSC — page.tsx)
    ├── Header Row
    │   ├── <h1> + <p> (title + subtitle)
    │   └── <Link href="/teacher/classes/create"> Create Class button
    │
    ├── Stats Row (grid 1→sm:3 cols)
    │   ├── Stat Card: Total Classes    (school icon, #2a14b4 accent)
    │   ├── Stat Card: Active Classes   (#1b6b51 accent, pulsing dot when > 0)
    │   └── Stat Card: Total Enrolled   (#2a14b4 accent)
    │
    ├── [if classes.length === 0] Empty State
    │   ├── Icon container (rounded-full, #eff4ff bg)
    │   ├── <h2> noClasses
    │   ├── <p> noClassesDescription
    │   └── <Link> Create Class (CTA)
    │
    └── [if classes.length > 0] Card Grid (grid gap-6 sm:2 lg:3 cols)
        └── ClassCard × N  (<Link href="/teacher/classes/{cls.id}">)
            ├── Top Row
            │   ├── Icon container (school, #eff4ff bg)
            │   └── Status Badge (coloured pill)
            ├── Class name <h3>
            ├── Language · Level <p>
            ├── Meta list
            │   ├── Schedule (schedule icon + formatSchedule string)
            │   └── Duration (date_range icon + N weeks)
            └── Footer (border-t)
                ├── Enrollment counter (group icon + enrolled/maxStudents)
                ├── Topic counter (menu_book icon + N topics)
                └── "View" hover label (opacity-0 → opacity-100 on group-hover)
```

### 3.2 Create Class

```
TeacherShell (layout.tsx)
└── CreateClassPage ("use client" — create/page.tsx)
    ├── Back link (← Classes)
    └── <form onSubmit> (white card, rounded-2xl, p-8, max-w-3xl)
        ├── <h1> createClass
        ├── Class Name field
        │   └── <input type="text">
        ├── Language + Level row (grid sm:2-cols)
        │   ├── Language <select> (populated from /api/languages)
        │   └── Level: <select> (if presets) | <input type="text"> (otherwise)
        ├── Schedule section
        │   └── <ClassSessionEditor sessions onChange>
        ├── Start Date + End Date row (grid sm:2-cols)
        │   ├── <input type="date">  (startDate)
        │   └── <input type="date">  (endDate)
        ├── Max Students field
        │   └── <input type="number" min=1 max=100 class="w-32">
        ├── Special Notes field
        │   └── <textarea rows=3>
        └── Actions row (justify-end)
            ├── <Link href="/teacher/classes"> Cancel
            └── <button type="submit" disabled=saving> Create / Creating
```

---

## 4. Database Queries

### 4.1 Listing — Fetch All Classes

```sql
-- prisma.class.findMany()
SELECT
  c.*,
  l.id AS lang_id, l.name AS lang_name, l.code AS lang_code,
  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id)
    AS enrollment_count,
  (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.class_id = c.id)
    AS topic_count
FROM classes c
JOIN languages l ON l.id = c.language_id
WHERE c.teacher_id = $userId
ORDER BY c.created_at DESC;
```

Prisma translates `_count` includes into `SELECT COUNT(*)` subqueries. Single round-trip; no N+1.

### 4.2 Create — POST API: Insert Class

```sql
-- prisma.class.create()
INSERT INTO classes (
  id, name, language_id, level, schedule,
  start_date, end_date, teacher_id, max_students, special_notes,
  status, created_at, updated_at
)
VALUES (
  cuid(), $name, $languageId, $level, $schedule,
  $startDate, $endDate, $teacherId, $maxStudents, $specialNotes,
  'SCHEDULING', now(), now()
)
RETURNING *;
```

The `language` relation is included in the return (`include: { language: true }`).

### 4.3 Language List (Create Form)

```sql
-- GET /api/languages → prisma.language.findMany()
SELECT id, name, code FROM languages ORDER BY name ASC;
```

Cached implicitly by Next.js fetch deduplication if called from the same render pass; here it is a client-side `fetch`, so no server-side caching applies.

---

## 5. API Endpoints

### 5.1 GET `/api/languages`

| Attribute | Value |
|---|---|
| File | `src/app/api/languages/route.ts` |
| Auth | None required (public endpoint) |
| Response (200) | `Language[]` — `{ id, name, code }[]` |
| Usage | Populates the language dropdown on the Create form via client-side `useEffect` |

### 5.2 GET `/api/teacher/classes`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Response (200) | `Class[]` with `language` and `_count` |
| Usage | Not used by the listing page (RSC fetches directly via Prisma); available for future client-side refresh scenarios |

### 5.3 POST `/api/teacher/classes`

| Attribute | Value |
|---|---|
| File | `src/app/api/teacher/classes/route.ts` |
| Auth | Session required; `role === "TEACHER"` |
| Request body | `{ name, languageId, level, schedule, startDate, endDate, maxStudents?, specialNotes? }` |
| Validation | All required fields must be truthy strings; returns 400 with `{ error: "Missing required fields" }` otherwise |
| Response (201) | Created `Class` object with `language` included |
| Response (400) | `{ error: "Missing required fields" }` |
| Response (401) | `{ error: "Unauthorized" }` |
| Side effects | Inserts one row into `classes`; `status` defaults to `SCHEDULING` via Prisma schema default |

---

## 6. State Management

### 6.1 Listing Page (ClassesPage)

Pure RSC — zero client state. All rendering decisions are made from the Prisma result on the server. No `useState`, no `useEffect`.

### 6.2 Create Class Form State

All state is local to `CreateClassPage` via `useState`. No external store.

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `name` | `string` | `""` | Class name input value |
| `languageId` | `string` | `""` | Selected language ID |
| `level` | `string` | `""` | Selected or typed level; reset to `""` on language change |
| `sessions` | `Session[]` | `[{ day: "", startTime: "", endTime: "" }]` | ClassSessionEditor controlled state |
| `startDate` | `string` | `""` | ISO date string from date input |
| `endDate` | `string` | `""` | ISO date string from date input |
| `maxStudents` | `number` | `10` | Integer from number input |
| `specialNotes` | `string` | `""` | Optional textarea value |
| `languages` | `Language[]` | `[]` | Loaded from `GET /api/languages` on mount |
| `saving` | `boolean` | `false` | Disables submit button during in-flight POST |

### 6.3 Derived State (Create Form)

```ts
const selectedLang = languages.find((l) => l.id === languageId);
const presets = selectedLang ? levelPresets[selectedLang.code] || [] : [];
```

`levelPresets` is a module-level constant:
```ts
const levelPresets: Record<string, string[]> = {
  en: ["A1", "A2", "B1", "B2", "C1", "C2"],
  zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
};
```

When `presets.length > 0`, the level field renders as a `<select>`; otherwise it renders as a free-text `<input>`.

---

## 7. Styling

### 7.1 Design Tokens (Hardcoded Hex — Project Convention)

| Token | Hex | Usage |
|---|---|---|
| Brand Indigo | `#2a14b4` | Primary button, stat icon, link hover, card accent bar |
| Brand Indigo Hover | `#4338ca` | Button hover state |
| Brand Indigo Light | `#eff4ff` | Icon container backgrounds, empty state bg |
| Brand Indigo Pale | `#e3dfff` | Stat icon bg, back button hover |
| Text Primary | `#121c2a` | Headings, card title |
| Text Secondary | `#464554` | Body text, subtitle, form labels |
| Text Muted | `#777586` | Stat labels, meta text, back link |
| Border Muted | `#c7c4d7` | Card footer divider (15% opacity) |
| Active Green | `#a6f2d1` / `#1b6b51` | ACTIVE badge bg / text |
| Ended Red | `#ffdada` / `#7b0020` | ENDED badge bg / text |
| Card Shadow | `0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)` | Standard card elevation |
| Card Shadow Hover | `0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)` | Hovered card elevation |
| Input Fill | `#d9e3f6` at 30% opacity | Create form input background |

### 7.2 Stat Card Bottom Accent

Each stat card has an absolute-positioned `h-[3px]` bar at the bottom (`rounded-full`) in the section's accent colour at 10% opacity as track, with a full-width inner div at full opacity — creating a "full progress" indicator that serves as a decorative accent.

### 7.3 Responsive Grid

```
Stats:  grid-cols-1 → sm:grid-cols-3
Cards:  grid gap-6 sm:grid-cols-2 lg:grid-cols-3
Form:   max-w-3xl, sm:grid-cols-2 for paired fields
```

### 7.4 ClassSessionEditor

Imported from `@/components/teacher/ClassSessionEditor`. Renders rows of `[DayPicker] [FROM time] [TO time] [remove]` with an "Add Session" button below. Fully controlled via `sessions` / `onChange` props. Handles its own day dropdown open/close state internally per row.

---

## 8. i18n Keys

All keys live in the `"teacher"` namespace (`messages/en.json`, `messages/vi.json`).

### Listing Page

| Key | English Value |
|---|---|
| `teacher.classes` | `"Classes"` |
| `teacher.classesSubtitle` | `"Manage your language classes and student enrollment"` |
| `teacher.createClass` | `"Create Class"` |
| `teacher.totalClasses` | `"Total Classes"` |
| `teacher.activeClasses` | `"Active Classes"` |
| `teacher.totalEnrolled` | `"Total Enrolled"` |
| `teacher.noClasses` | `"No Classes Yet"` |
| `teacher.noClassesDescription` | `"Create your first class to start enrolling students."` |
| `teacher.scheduling` | `"Scheduling"` |
| `teacher.active` | `"Active"` |
| `teacher.ended` | `"Ended"` |
| `teacher.cancelled` | `"Cancelled"` |
| `teacher.weeks` | `"weeks"` |
| `teacher.topicsCount` | `"Topics"` |
| `teacher.view` | `"View"` |

### Create Form

| Key | English Value |
|---|---|
| `teacher.className` | `"Class Name"` |
| `teacher.classNamePlaceholder` | `"e.g. Morning Conversational English"` |
| `teacher.classLanguage` | `"Language"` |
| `teacher.selectLanguage` | `"Select language"` |
| `teacher.classLevel` | `"Level"` |
| `teacher.selectLevel` | `"Select level"` |
| `teacher.levelPlaceholder` | `"e.g. Intermediate"` |
| `teacher.classSchedule` | `"Weekly Schedule"` |
| `teacher.classStartDate` | `"Start Date"` |
| `teacher.classEndDate` | `"End Date"` |
| `teacher.classMaxStudents` | `"Max Students"` |
| `teacher.classSpecialNotes` | `"Special Notes"` |
| `teacher.specialNotesPlaceholder` | `"e.g. First class free trial | All sessions recorded"` |
| `teacher.fillRequiredFields` | `"Please fill in all required fields."` |
| `teacher.classCreated` | `"Class created successfully!"` |
| `teacher.createClassError` | `"Failed to create class. Please try again."` |
| `teacher.creating` | `"Creating..."` |

### ClassSessionEditor

| Key | English Value |
|---|---|
| `teacher.selectDay` | `"Select day"` |
| `teacher.sessionFrom` | `"From"` |
| `teacher.sessionTo` | `"To"` |
| `teacher.addClassSession` | `"Add session"` |
| `teacher.removeSession` | `"Remove session"` |
| `teacher.dayMonday` | `"Monday"` |
| `teacher.dayTuesday` | `"Tuesday"` |
| `teacher.dayWednesday` | `"Wednesday"` |
| `teacher.dayThursday` | `"Thursday"` |
| `teacher.dayFriday` | `"Friday"` |
| `teacher.daySaturday` | `"Saturday"` |
| `teacher.daySunday` | `"Sunday"` |

Language names displayed through `tLang(t, lang.name)`, which resolves keys like `teacher.languageEnglish`, `teacher.languageChinese`, etc.

---

## 9. Error Handling

### 9.1 Server-Side (ClassesPage RSC)

| Scenario | Handling |
|---|---|
| No active session | `redirect("/login")` — hard redirect before DB query |
| Prisma query error | Unhandled — propagates to Next.js default error boundary (500 page) |

### 9.2 Client-Side (CreateClassPage)

| Scenario | Handling |
|---|---|
| Language API returns non-2xx | Catch block swallowed silently; `languages` stays `[]`; select is empty |
| Language API throws (network error) | Same as above |
| Missing required fields on submit | `toast.error(t("fillRequiredFields"))`; no fetch issued; `saving` stays `false` |
| POST returns non-2xx | `toast.error(t("createClassError"))`; `setSaving(false)` in `finally` |
| POST throws (network error) | Same as non-2xx path |
| `maxStudents` input set to non-integer | `parseInt(e.target.value) || 10` coerces to 10 |
| `endDate` set before `startDate` | No client guard currently — the API accepts it; week count on the listing card will be 0 or negative |

---

## 10. Performance Considerations

### 10.1 Listing Page

- **Single Prisma query** with `include` and `_count` — PostgreSQL executes JOINs and COUNT subqueries in one round-trip.
- **RSC rendering** means the grid HTML is generated on the server; no JS bundle cost for the listing grid itself. The only JS for this page is Next.js router hydration.
- **`loading.tsx`** co-located at `src/app/teacher/classes/loading.tsx`; renders an instant skeleton (stat card placeholders, card grid skeletons) while the RSC resolves. No blank page flash.
- At typical class volumes (< 200 per teacher) the in-memory aggregation (`activeCount`, `totalStudents`) is O(N) with negligible cost.

### 10.2 Create Class Form

- **Language list** is fetched once on mount (small payload, typically < 10 rows). No re-fetch on every keystroke or field change.
- **ClassSessionEditor** is a fully controlled component; its internal `DayPicker` popover state does not cause re-renders of the parent form.
- **No debounce** needed on text inputs — derived state (`selectedLang`, `presets`) is O(1) recomputation on each keystroke.
- **`router.push` + `router.refresh()`** on success invalidates the RSC cache for the listing page, ensuring the new class card appears immediately.

### 10.3 Bundle Size Notes

- `CreateClassPage` is `"use client"` and adds to the teacher JS bundle: `useState`, `useEffect`, `useRouter`, `useTranslations`, `toast` from `sonner` (shared across the teacher shell). No new third-party libraries are introduced.
- `ClassSessionEditor` is `"use client"` and is tree-shaken into the `CreateClassPage` chunk (not loaded on the listing page).
