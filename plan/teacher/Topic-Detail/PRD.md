# PRD — Teacher Topic Detail (Vocabulary Manager)

**Feature:** Vocabulary management for a single topic  
**Route:** `src/app/teacher/topics/[topicId]/page.tsx`  
**Component:** `src/components/teacher/VocabularyManager.tsx`  
**Status:** Implemented  

---

## Overview

The Topic Detail page is the vocabulary editing workspace for a single topic. A teacher arrives here after clicking a topic card on the Topics listing. They can add new vocabulary words manually via a slide-in modal, edit existing words inline (same modal pre-filled), delete words, and jump to the CSV import flow for bulk entry. The page is also the entry point for navigating to practice tests associated with the topic.

---

## User Stories

| ID | As a teacher I want to… | So that… |
|----|------------------------|----------|
| V1 | See all vocabulary for the topic I selected | I know what words have already been added |
| V2 | Add a new vocabulary word with type, pronunciation, meaning, and example | I can build a complete dictionary entry |
| V3 | Edit an existing vocabulary word without leaving the page | I can fix typos and update examples quickly |
| V4 | Delete a vocabulary word I no longer need | The topic stays clean and relevant |
| V5 | Import many words at once via CSV | I can populate a topic from an existing word list |
| V6 | See the topic title, language, and description in the page header | I know which topic I am editing |
| V7 | Navigate back to the topics list | I can quickly switch to another topic |

---

## Functional Requirements

### FR-1: Page Header (Server Component)
- Display topic `title` as the H1.
- Display `topic.description` if present.
- Display `topic.language.name` as a language badge.
- If topic does not exist or does not belong to the authenticated teacher: `notFound()`.

### FR-2: Vocabulary Grid (Client Component)
- Display all vocab items ordered by `sortOrder ASC`.
- Each card shows: `word`, `type` (italic, secondary), `pronunciation` (italic muted), `meaning`, `example` (blockquote style).
- Clicking a card opens the Edit modal pre-filled with that vocab's data.
- On hover: edit icon + delete icon appear (opacity transition).
- Delete icon click (with `e.stopPropagation()`) calls `handleDelete`.

### FR-3: Add Vocabulary Modal
- Triggered by the "Add Word" dropdown button → "Manual" option.
- Slide-in `ModalOverlay` component.
- Fields: **word** (required), **type** (optional, e.g. `(n)`, `(v)`), **pronunciation** (optional, IPA), **meaning** (required, `<textarea>`), **example** (optional).
- On submit: `POST /api/teacher/vocabulary` with `{ topicId, word, type, pronunciation, meaning, example, sortOrder: vocabulary.length }`.
- Success: toast, modal closes, `router.refresh()`.

### FR-4: Edit Vocabulary Modal
- Same modal form as Add, with all fields pre-populated from the selected vocab item.
- On submit: `PUT /api/teacher/vocabulary` with `{ id, word, type, pronunciation, meaning, example }`.
- Success: toast, modal closes, `router.refresh()`.

### FR-5: Delete Vocabulary
- `DELETE /api/teacher/vocabulary` with `{ id }`.
- No confirmation dialog (direct delete with undo-toast pattern).
- On success: `toast.success(t("wordDeleted"))`, `router.refresh()`.

### FR-6: Import Entry Point
- "Add Word" split button also offers an "Import" option (via `AddWordMenu` dropdown).
- Clicking Import navigates to `/teacher/topics/[topicId]/import-vocab`.

### FR-7: Data Fetching (Server Component)
- `prisma.topic.findUnique({ where: { id: topicId, createdById: session.user.id }, include: { language, vocabulary: { orderBy: { sortOrder: "asc" } } } })`.
- `notFound()` if result is null.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Auth | `TEACHER` role; topic ownership verified server-side (topic.createdById check) |
| Ownership | API routes re-verify ownership on every mutating request |
| Accessibility | Modal traps focus; close button, Cancel button, and Escape key all close the modal |
| Performance | Vocab list renders all words without pagination (expected < 200 items per topic) |
| i18n | All strings via `next-intl`; vocabulary field labels hardcoded in EN where no translation key exists |

---

## UI/UX Requirements

- Section header: `dictionary` icon on `#e3dfff` background, title "Vocabulary", word count subtitle.
- "Add Word" button: `#2a14b4` rounded-full with `add` icon; clicking opens a dropdown menu with two options (Manual / Import).
- Dropdown: `motion/react` spring animation; auto-closes on outside click.
- Vocab cards: `bg-white rounded-2xl` grid, 1-col mobile / 2-col desktop.
- Card hover: `bg-[#f5f3ff]` background + border tint `#2a14b4/15`.
- Modal header icons: `add_circle` for Add, `edit` for Edit.
- Form inputs: `rounded-xl border border-[#c7c4d7]/30 bg-[#f8f9ff]` with `focus:ring-2 focus:ring-[#2a14b4]/20`.
- Save button: `#2a14b4` rounded-full; spinner on `saving === true`.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| Topic has no vocabulary | Empty grid state (no placeholder); only the Add button is shown |
| Word submitted with empty `meaning` | Browser `required` validation blocks submit |
| PUT/DELETE on vocab not owned by teacher | API returns 404; client shows `toast.error` |
| Topic not found or wrong owner | Server `notFound()` renders Next.js 404 page |
| Network failure during add/edit/delete | `catch` fires `toast.error` with appropriate key |
| `sortOrder` conflict | New words appended at `vocabulary.length`; gaps are harmless (DB sorts by `sortOrder ASC`) |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to add first word | < 30 seconds from topic detail page load |
| Edit round-trip (open modal → save → refresh) | < 2 seconds on fast connection |
| Delete latency | < 1 second |
| Zero data-loss incidents | API ownership checks prevent cross-teacher mutations |
