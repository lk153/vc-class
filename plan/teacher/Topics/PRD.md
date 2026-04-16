# PRD — Teacher Topics Listing

**Feature:** Topics listing and creation  
**Route:** `src/app/teacher/topics/page.tsx`  
**Component:** `src/components/teacher/TopicList.tsx`  
**Status:** Implemented  

---

## Overview

The Topics page is the teacher's primary workspace for managing vocabulary collections. Each Topic bundles a set of vocabulary words under a single language and is the foundational unit that links to practice tests and class assignments. Teachers create topics here and navigate into them to manage vocabulary.

---

## User Stories

| ID | As a teacher I want to… | So that… |
|----|------------------------|----------|
| T1 | See all my topics at a glance | I can quickly find a topic to edit or assign |
| T2 | Filter topics by language | I can focus on one language at a time |
| T3 | Know how many words and learner-assignments each topic has | I can gauge coverage before creating more content |
| T4 | Create a new topic with a title, language, and optional description | I can start building a vocabulary set |
| T5 | Navigate into a topic to manage its vocabulary | I can add, edit, and reorder words |
| T6 | See a visual prompt to create my first topic when I have none | I am not confused by an empty state |

---

## Functional Requirements

### FR-1: Topic Grid
- Display teacher's own topics in a responsive grid (1 / 2 / 3 columns: mobile / tablet / desktop).
- Each card shows: title, language badge, vocab count (`wordsCount`), assignment count (`learnersCount`), description excerpt (2-line clamp).
- Clicking any card navigates to `/teacher/topics/[topicId]`.
- Empty state card (dashed border) always appears as the last grid cell; clicking it opens the create form.

### FR-2: Language Filter
- A row of pill buttons appears above the grid: "All" + one pill per distinct language across all teacher's topics.
- Selecting a pill filters the grid client-side (no network request).
- Active pill uses primary brand colour; inactive uses card background.

### FR-3: Create Topic Form
- Triggered by the empty-state card or a header CTA button (same `setShowCreate(true)` toggle).
- Inline form rendered above the grid when `showCreate === true`.
- Fields:
  - **Title** — required text input
  - **Language** — required `<select>` populated from `prisma.language.findMany`
  - **Description** — optional `<textarea>`
- On submit: `POST /api/teacher/topics` with `{ title, description, languageId, createdById }`.
- Success: `toast.success`, form closes, page rehydrates via `router.refresh()`.
- Failure: `toast.error`; form stays open.
- Cancel button closes the form without saving.
- Submit button shows `progress_activity` spinner while `creating === true` and is `disabled`.

### FR-4: Data Fetching (Server Component)
- Parallel `Promise.all`: `prisma.topic.findMany` (with `language`, `_count.vocabulary`, `_count.topicAssignments`) + `prisma.language.findMany`.
- Filter by `createdById: session.user.id`.
- Order by `createdAt: "desc"`.
- Session guard: redirect to `/login` if unauthenticated.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Auth | `TEACHER` role only; enforced at server-component level |
| Performance | Parallel DB queries; no topic list exceeds 200 rows in practice |
| Accessibility | Filter pills are `<button>` elements with meaningful text; form uses `<label>` for all inputs |
| SEO | `export const metadata: Metadata = { title: "Topics" }` |
| i18n | All strings via `useTranslations("teacher")` and `useTranslations("common")`; language names via `tLang` helper |

---

## UI/UX Requirements

- Design system: "Intellectual Sanctuary / Aura Lexicon" — brand colour `#2a14b4`, card surface `#fff`, text `#121c2a` / `#464554` / `#777586`.
- Font: `font-body` throughout.
- Cards use `rounded-2xl` + `shadow-[0_1px_3px_1px_rgba(0,0,0,0.06)…]`; hover lifts (`hover:-translate-y-0.5`, deeper shadow).
- Topic icon: `menu_book` on `#e3dfff` background.
- Language badge: `bg-[#a6f2d1]/40 text-[#1b6b51]` pill.
- Arrow CTA on each card transitions from `#eff4ff` to `#2a14b4` text-white on group-hover.
- Create form: 2-column grid (title + language) with full-width description textarea below.
- Mobile: single column; filter pills wrap.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| No topics yet | Grid contains only the dashed "Create New Topic" placeholder |
| Only one language across all topics | Filter row shows "All" + one language pill |
| Topic has 0 vocabulary words | `vocabCount` renders as "0 words" |
| Topic has 0 class assignments | `assignmentCount` renders as "0 learners" |
| Title field submitted empty | Browser native `required` validation blocks submit |
| Language not selected | Browser native `required` validation blocks submit |
| Network error on create | `catch` block fires `toast.error(t("topicCreateFailed"))` |
| Session expires mid-session | Server redirect to `/login` on next hard navigation |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time-to-first-topic created | < 60 seconds from landing on page |
| Create form error rate | < 5% of submissions (robust validation messaging) |
| Filter usage | Measurable engagement when teacher has 3+ languages |
| Page load (server render) | < 400 ms p95 on production (parallel DB queries) |
