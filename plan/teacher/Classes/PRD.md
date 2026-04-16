# PRD — Teacher Classes Listing & Create Class

**Feature:** Class management — browse all classes and create new ones
**Routes:** `/teacher/classes` · `/teacher/classes/create`
**Last Updated:** 2026-04-15

---

## 1. Overview

The Classes section is the central hub where teachers manage their language classes. The listing page gives teachers an at-a-glance overview of every class they own — live enrollment counts, topic coverage, schedule, and status — and lets them navigate into any class for deep editing. The Create Class page is a single-screen form that gathers all required metadata before writing the record to the database.

Together these two pages answer two fundamental teacher questions: "What classes am I running?" and "How do I start a new one?" The design prioritises quick scanning (card grid, color-coded status badges, summary stats), discoverability of the create action, and a short, frictionless form for class creation.

---

## 2. User Stories

### Classes Listing

**US-01 — View all my classes**
> As a teacher, I want to see all my classes in a card grid so I can quickly understand my current workload at a glance.

**US-02 — Read key details per card**
> As a teacher, I want each card to show the class name, language, level, status badge, enrollment count, topic count, and weekly schedule so I don't need to open each class to find basic information.

**US-03 — Understand class status at a glance**
> As a teacher, I want status badges to be colour-coded (SCHEDULING / ACTIVE / ENDED / CANCELLED) so I can instantly distinguish between live and inactive classes.

**US-04 — See aggregate stats**
> As a teacher, I want to see summary counters (total classes, active classes, total enrolled students) at the top of the page so I have a dashboard-style overview without scrolling.

**US-05 — Navigate to class detail**
> As a teacher, I want to click any class card to go to its detail page so I can manage enrollment, edit metadata, and view topic assignments.

**US-06 — Navigate to create class**
> As a teacher, I want a prominent "Create Class" button in the page header so I can start a new class without hunting through a menu.

**US-07 — Empty state guidance**
> As a teacher with no classes yet, I want a friendly empty state with a description and a create button so I understand what to do next.

### Create Class

**US-08 — Fill in class metadata**
> As a teacher, I want a form with fields for name, language, level, schedule, start/end dates, max students, and special notes so I can fully describe the class in one step.

**US-09 — Select language from a shared list**
> As a teacher, I want to pick from the platform's canonical language list rather than typing a language name so that classes, topics, and student assignments remain consistent.

**US-10 — Get level presets based on language**
> As a teacher, I want the level field to offer predefined options (CEFR A1–C2 for English; HSK 1–6 for Chinese) when a recognised language is selected so I don't have to remember the correct notation.

**US-11 — Define a weekly schedule with multiple sessions**
> As a teacher, I want to add one or more day/start-time/end-time sessions using the ClassSessionEditor so I can represent a class that meets more than once per week.

**US-12 — Cancel and return**
> As a teacher, I want a Cancel button that returns me to the classes listing without saving so I can bail out without side effects.

**US-13 — See validation feedback**
> As a teacher, I want an error toast if I submit with missing required fields so I know exactly what to complete before trying again.

**US-14 — Redirect after creation**
> As a teacher, after a successful create I want to be redirected to the Classes listing (not the new class's detail page) so I can immediately verify the new card appeared.

---

## 3. Functional Requirements

### FR-01: Classes Listing — Data

- Page fetches all `Class` records where `teacherId = session.user.id`, ordered by `createdAt DESC`.
- Each record includes `language` (for name display) and `_count: { enrollments, topicAssignments }` (for counters).
- Aggregate stats are derived in-memory from the fetched array; no separate aggregate query is needed at typical class volumes.

### FR-02: Classes Listing — Summary Stats Bar

- Three stat cards displayed above the grid:
  1. **Total Classes** — `classes.length`
  2. **Active Classes** — `classes.filter(c => c.status === "ACTIVE").length`; active count shows a pulsing green dot when > 0.
  3. **Total Enrolled** — `classes.reduce(sum, c => sum + c._count.enrollments, 0)`

### FR-03: Classes Listing — Class Card

Each card renders:
- Language icon container (indigo pill, `school` symbol).
- Status badge (top-right, colour-coded by `ClassStatus`).
- Class name (heading, truncated at 2 lines via `line-clamp-2`).
- Language name + level (subheading).
- Schedule string — parsed from `schedule` JSON using `formatSchedule`; falls back to raw text for legacy records.
- Duration — `Math.ceil((endDate - startDate) / (7 days))` weeks.
- Enrollment counter `enrolled/maxStudents`.
- Topic count with `menu_book` icon.
- Hover reveals a "View" micro-label and lifts the card (shadow elevation + -0.5 px translate).

### FR-04: Classes Listing — Status Color Coding

| Status | Badge background | Badge text | Tailwind classes |
|---|---|---|---|
| SCHEDULING | `#d9e3f6` | `#464554` | `bg-[#d9e3f6] text-[#464554]` |
| ACTIVE | `#a6f2d1/40` | `#1b6b51` | `bg-[#a6f2d1]/40 text-[#1b6b51]` |
| ENDED | `#ffdada/40` | `#7b0020` | `bg-[#ffdada]/40 text-[#7b0020]` |
| CANCELLED | `#d9e3f6/50` | `#777586` | `bg-[#d9e3f6]/50 text-[#777586]` |

### FR-05: Classes Listing — Empty State

- Shown when `classes.length === 0`.
- Contains a centered icon container, heading, description, and a "Create Class" link.
- Identical CTA style to the page header button.

### FR-06: Create Class — Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Class name | Text input | Yes | Trimmed; placeholder: translated `classNamePlaceholder` |
| Language | Select (dropdown) | Yes | Populated from `GET /api/languages`; resets Level on change |
| Level | Select or text input | Yes | Preset dropdown for known language codes (`en`, `zh`); free-text input otherwise |
| Schedule | ClassSessionEditor | Yes | At least one fully-filled session (day + startTime + endTime) required |
| Start date | Date input | Yes | `type="date"` |
| End date | Date input | Yes | `type="date"` |
| Max students | Number input | No | Default 10; min 1, max 100 |
| Special notes | Textarea | No | 3 rows; optional; trimmed; null if empty |

### FR-07: Create Class — Validation

Client-side pre-submit check (before fetch):
- `name.trim()` is non-empty.
- `languageId` is set.
- `level.trim()` is non-empty.
- At least one session with all three fields filled.
- `startDate` and `endDate` are both set.
- Failure: `toast.error(t("fillRequiredFields"))` — no request sent.

Server-side (API route):
- Same fields checked; returns 400 with `{ error: "Missing required fields" }` if any are absent.

### FR-08: Create Class — API Call

```
POST /api/teacher/classes
Content-Type: application/json

{
  name: string,
  languageId: string,
  level: string,
  schedule: string,          // JSON.stringify(validSessions)
  startDate: string,         // YYYY-MM-DD
  endDate: string,           // YYYY-MM-DD
  maxStudents: number,
  specialNotes: string | null
}
```

On 201: `toast.success(t("classCreated"))` → `router.push("/teacher/classes")` + `router.refresh()`.
On non-2xx: `toast.error(t("createClassError"))`.

### FR-09: Create Class — Language Loading

Languages are fetched from `GET /api/languages` on mount via `useEffect`. While loading, the Language select shows only the placeholder option. Failures are swallowed silently (no toast); the select remains empty.

### FR-10: Create Class — Back Navigation

- A "← Classes" back link above the form navigates to `/teacher/classes`.
- The Cancel button at the bottom of the form is a `<Link>` to `/teacher/classes`.

---

## 4. Non-Functional Requirements

### NFR-01: Performance
- Listing page uses a single Prisma query with `include` (language + counts) — no N+1 per card.
- Page is a React Server Component; HTML is fully rendered server-side with no client hydration for the grid itself.
- `loading.tsx` provides instant skeleton feedback while the server renders.

### NFR-02: Security
- Both pages require an authenticated session via `auth()`; unauthenticated users are redirected to `/login`.
- The API route checks `session.user.role === "TEACHER"` before any DB access.
- Class ownership is enforced by `teacherId = session.user.id` in the `findMany` query; teachers cannot see or modify other teachers' classes.

### NFR-03: Accessibility
- All interactive elements (buttons, links, inputs, select) are keyboard-navigable with visible focus states.
- Status badges use both colour and text label — colour alone is never the only indicator.
- Required fields are marked with `*` in their labels.
- Disabled submit button (`disabled:opacity-50`) communicates the in-progress state visually.

### NFR-04: Responsiveness
- Stat bar: single column on mobile, 3 columns on `sm:` and above.
- Card grid: single column on mobile, 2 columns on `sm:`, 3 columns on `lg:`.
- Create form: capped at `max-w-3xl`; language/level fields share a 2-column row on `sm:` and above.
- Start/end date fields share a 2-column row on `sm:` and above.

### NFR-05: Internationalisation
- All UI strings go through `useTranslations("teacher")` (client) or `getTranslations("teacher")` (server).
- Schedule day names are translated via `DAY_TRANSLATION_KEYS` from `@/lib/days`.
- Language names go through `tLang(t, lang.name)` for per-locale display.

---

## 5. UI/UX Requirements

### Classes Listing — Layout (top → bottom)
1. Page header row: title + subtitle (left), "Create Class" button (right).
2. Summary stats row (3 cards).
3. Class card grid or empty state.

### Class Card — Visual Hierarchy
- Status badge is the highest-contrast element on the card (top-right, coloured pill).
- Class name is the dominant text element (bold, large).
- Language · level is secondary (smaller, dimmer).
- Schedule and duration are tertiary (icon + text, muted colour).
- Enrollment and topic counters are at the card footer, separated by a divider.

### Create Class — Form Layout
- Single column by default; 2-column rows for Language/Level and Start/End Date.
- Each field group: label (`10px uppercase tracking-widest bold muted`) above the control.
- Input style: `bg-[#d9e3f6]/30`, no border, `rounded-lg`, `focus:ring-2 focus:ring-[#2a14b4]/30`.
- Section container: white card (`bg-white rounded-2xl shadow`) with `p-8`.
- Submit button: indigo, `rounded-full`, spinning `progress_activity` icon while saving.

### Interaction Principles
- Card hover: lift animation (`-translate-y-0.5`) + shadow elevation increase. No jarring transitions.
- Form submit: button immediately disables and shows spinner; success toast → redirect.
- Language change on create form resets the level field to empty (avoids mismatched level for a different language).

---

## 6. Edge Cases

| Case | Expected Behaviour |
|---|---|
| Teacher has no classes | Empty state shown with icon, description, and "Create Class" CTA |
| Class has 0 enrolled students | Enrollment counter shows "0/{maxStudents}" |
| Class has 0 topic assignments | Topic counter shows "0 Topics" |
| `endDate` is before `startDate` | Week count formula returns a negative or 0 number; no crash, but validation should eventually reject this case at create time |
| Schedule is legacy text (not JSON) | `formatSchedule` catches the `JSON.parse` exception and returns the raw string |
| All sessions in the ClassSessionEditor are incomplete | Validation treats `validSessions.length === 0` as failure; toast shown |
| Language list API fails | Select stays empty with only the placeholder; teacher cannot submit (languageId is required) |
| `maxStudents` input left blank | `parseInt("") || 10` defaults to 10 |
| Name contains only whitespace | `name.trim()` check catches this; toast shown |
| Level input changed by typing after a preset was selected | Both text input and preset dropdown write to the same `level` state; no conflict |
| Class created and API returns non-201 | Error toast shown; user stays on create form with all values preserved |
| Teacher is not logged in | `auth()` returns null; `redirect("/login")` fires before any DB query |

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time to create a class | < 2 minutes from landing on create page to successful redirect | UX observation / session analytics |
| Create form completion rate | ≥ 80% of form visits result in a successful POST | API 201 count / page view count |
| Listing page load time (TTFB) | < 500 ms | Vercel analytics; Prisma query timing |
| Classes listing retention | Teacher clicks into a class card within 60 s of landing | Navigation event tracking |
| Empty state CTA conversion | ≥ 60% of teachers with 0 classes click "Create Class" from the empty state | Click event tracking |
| Validation error rate on create | < 20% of submit attempts hit the client-side validation toast | Toast trigger rate vs submit attempts |
