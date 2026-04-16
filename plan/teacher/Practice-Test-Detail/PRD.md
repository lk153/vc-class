# PRD — Practice Test Detail Modal

**Feature:** Practice Test Detail Modal
**Surface:** Modal inside `/teacher/practice-tests` (no dedicated route)
**Last Updated:** 2026-04-15
**Status:** Implemented

---

## 1. Overview

The Practice Test Detail Modal is a full-screen overlay opened from any test card on the listing page. It provides a comprehensive workspace for inspecting and editing every dimension of a practice test: metadata (title, status), behavioral settings (shuffle, time limit, attempts, instant review), question management (CRUD, bulk operations, media, advanced data), and section/hierarchy structure (PART → GROUP → EXERCISE tree). All changes are persisted immediately via API calls triggered by discrete user actions; the modal never uses a "Save All" batch pattern.

---

## 2. User Stories

### 2.1 Settings

**US-01 — Edit Title**
As a teacher, I want to click the test title and edit it inline, so that I can rename a test without leaving the modal.

**US-02 — Change Status**
As a teacher, I want to change a test's status (Draft / Active / Inactive) via a dropdown chip, so that I can control student visibility without navigating elsewhere.

**US-03 — Change Mode**
As a teacher, I want to toggle the test mode between Practice and Test, so that the student experience (feedback timing, answer reveal) matches my intent.

**US-04 — Toggle Shuffle Answers**
As a teacher, I want to enable or disable answer shuffling per test, so that I can control whether students see answers in a randomized order.

**US-05 — Toggle Shuffle Questions**
As a teacher, I want to enable or disable question order shuffling, so that I can prevent students from sharing answer patterns.

**US-06 — Set Time Limit**
As a teacher, I want to set a time limit in minutes (1–300) that auto-saves when I leave the input field, so that I can cap the exam duration without clicking a save button.

**US-07 — Set Max Attempts**
As a teacher, I want to set the maximum number of attempts (0 = unlimited, 1–99) that auto-saves on blur, so that I can control how many times a student can retake the test.

**US-08 — Toggle Instant Review**
As a teacher, I want to toggle whether students can review correct answers immediately after submission, so that I can match the setting to my pedagogical intent.

### 2.2 Questions

**US-09 — Browse Questions**
As a teacher, I want to see all questions in the test in a paginated list (10 per page) with search and type/difficulty filters, so that I can find specific questions quickly.

**US-10 — Edit Question**
As a teacher, I want to click a question to expand an in-modal editor (QuestionEditor) where I can change content, answers, correct answer, timer, difficulty, explanation, audio play limit, and advanced data, so that I can refine questions without leaving the modal.

**US-11 — Add Questions**
As a teacher, I want an "Add Question" button that creates a blank question at the end of the list, so that I can build out a test incrementally.

**US-12 — Bulk Select**
As a teacher, I want checkboxes on each question card and a "Select All" toggle, so that I can select multiple questions at once for bulk operations.

**US-13 — Bulk Delete**
As a teacher, I want to delete all selected questions in a single action with a confirmation prompt, so that I can remove unwanted questions efficiently.

**US-14 — Filter Questions by Type**
As a teacher, I want chip filters for question type (All / MC / T/F / Fill / Reorder / Bank), so that I can view only questions of a specific type.

**US-15 — Filter Questions by Difficulty**
As a teacher, I want a difficulty filter, so that I can quickly review easy or hard questions.

**US-16 — Search Questions**
As a teacher, I want a search field that filters by question content text, so that I can find specific questions without paging through the full list.

### 2.3 Test Sections

**US-17 — View Section Tree**
As a teacher, I want to see the full PART → GROUP → EXERCISE hierarchy, so that I can understand the structural breakdown of the test.

**US-18 — Add Section**
As a teacher, I want to add a PART at the top level, a GROUP inside a PART, or an EXERCISE inside a GROUP, so that I can build a hierarchical exam structure.

**US-19 — Edit Section**
As a teacher, I want to edit a section's title, description, and media URL, so that I can provide context for each test segment.

**US-20 — Delete Section**
As a teacher, I want to delete a section (and have its children deleted via cascade), so that I can restructure the test.

**US-21 — Reorder Sections**
As a teacher, I want to move sections up and down within their sibling group, so that I can adjust the order without re-creating them.

---

## 3. Functional Requirements

### 3.1 Modal Lifecycle

| ID | Requirement |
|----|-------------|
| FR-01 | The modal opens when `selectedTestId` is set in `PracticeTestGrid`. |
| FR-02 | A `GET /api/teacher/practice-tests/{testId}` fetch is triggered immediately when `selectedTestId` changes. |
| FR-03 | A loading skeleton is shown until `detail` state is populated. |
| FR-04 | Pressing Escape calls `closeModal()`. |
| FR-05 | Clicking the backdrop calls `closeModal()`. |
| FR-06 | `closeModal()` clears `selectedTestId`, calls `router.refresh()`, and restores body scroll. |
| FR-07 | Body scroll is locked (`document.body.style.overflow = "hidden"`) while the modal is open. |

### 3.2 Editable Title

| ID | Requirement |
|----|-------------|
| FR-08 | Title renders as static text by default; clicking it switches to an `<input>` in-place. |
| FR-09 | Pressing Enter or blurring the input saves the title via `PUT /api/teacher/practice-tests`. |
| FR-10 | Pressing Escape reverts the input to the original title without saving. |
| FR-11 | An empty title is rejected; the input reverts to the previous value and shows an error toast. |

### 3.3 Settings Panel — General

| ID | Requirement |
|----|-------------|
| FR-12 | Status selector uses `ChipDropdown` with options: DRAFT, ACTIVE, INACTIVE. On change, immediately calls `PUT /api/teacher/practice-tests` with `{ status }`. |
| FR-13 | Mode field displays the current mode (PRACTICE / TEST) as a read-only badge. Mode change (if supported) uses the same PUT endpoint. |
| FR-14 | While a field is saving, the corresponding icon in `TimeLimitInput` or `MaxAttemptsInput` spins using `animate-spin`; the input is disabled. |

### 3.4 Settings Panel — Behavior

| ID | Requirement |
|----|-------------|
| FR-15 | Shuffle Answers toggle: `boolean`. On toggle, calls PUT with `{ shuffleAnswers }`. |
| FR-16 | Shuffle Questions toggle: `boolean`. On toggle, calls PUT with `{ shuffleQuestions }`. |
| FR-17 | Time Limit input (`TimeLimitInput`): local draft state, clamped to 1–300 minutes, saved on blur. If draft is empty or NaN on blur, reverts to server value without saving. |
| FR-18 | Max Attempts input (`MaxAttemptsInput`): local draft state, clamped to 0–99, saved on blur. 0 displays "unlimited". |
| FR-19 | Instant Review toggle: `boolean`. On toggle, calls PUT with `{ showReviewMoment }`. |

### 3.5 Questions Section

| ID | Requirement |
|----|-------------|
| FR-20 | Questions are rendered from `detail.questions`, sorted by `questionNumber ASC`. |
| FR-21 | Three filter controls (search, type chip, difficulty chip) filter `detail.questions` client-side within the modal. |
| FR-22 | Pagination is 10 questions per page; page resets when any filter changes. |
| FR-23 | `selectedQIds` is a `Set<string>` managed in state; checkboxes bind to this set. |
| FR-24 | Bulk delete: `DELETE /api/teacher/questions/bulk` with `{ ids: [...selectedQIds] }`. On success, calls `refetchDetail()`. |
| FR-25 | Add question: `POST /api/teacher/questions` with `{ testId: detail.id }`. On success, calls `refetchDetail()`. |
| FR-26 | `QuestionEditor` is rendered per expanded question (accordion pattern). Editor emits field-level saves via `PUT /api/teacher/questions`. |
| FR-27 | Difficulty values: 1 (Easy), 2 (Medium), 3 (Hard), 4 (Expert). |
| FR-28 | Each question card shows: question number, type chip, content preview, difficulty badge, timer, and optional media indicator. |

### 3.6 Question Editor (QuestionEditor)

| ID | Requirement |
|----|-------------|
| FR-29 | Content field: textarea or rich input; save on blur via PUT. |
| FR-30 | Answer fields (answer1–answer4): text inputs, each optionally paired with a media URL + type. Saved individually on blur. |
| FR-31 | Correct answer selector: clickable answer labels or a dedicated radio input. |
| FR-32 | Timer: integer input (seconds); saved on blur. |
| FR-33 | Difficulty: chip or dropdown selector; saves on change. |
| FR-34 | Explanation: textarea; saved on blur. Explanation can have its own media URL. |
| FR-35 | Audio Play Limit: integer input; saved on blur. |
| FR-36 | Advanced Data: raw JSON textarea; validated before save; error shown inline for invalid JSON. |
| FR-37 | Media fields use `MediaPicker` (URL input + type selector or auto-detect). |

### 3.7 Test Section Builder (TestSectionBuilder)

| ID | Requirement |
|----|-------------|
| FR-38 | Renders a tree: PART nodes at root, GROUP nodes as children of PARTs, EXERCISE nodes as children of GROUPs. |
| FR-39 | Add PART: `POST /api/teacher/test-sections` with `{ testId, level: "PART" }`. |
| FR-40 | Add GROUP inside PART: `POST /api/teacher/test-sections` with `{ testId, parentId, level: "GROUP" }`. |
| FR-41 | Add EXERCISE inside GROUP: `POST /api/teacher/test-sections` with `{ testId, parentId, level: "EXERCISE" }`. |
| FR-42 | Edit section: inline editing of title, description, mediaUrl. Saved via `PUT /api/teacher/test-sections`. |
| FR-43 | Delete section: `DELETE /api/teacher/test-sections`. Children are cascade-deleted by the DB schema. |
| FR-44 | Reorder: Up/Down arrow buttons change `sortOrder`. Triggers `POST /api/teacher/test-sections/reorder` with new order array. |
| FR-45 | Section media URL is saved with auto-detected media type. |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | Each setting save is a targeted PUT with only the changed field; `refetchDetail` is called after each save to sync the full state from the server. |
| NFR-02 | Optimistic UI | Toggle switches update optimistically in the UI (immediate visual feedback) while the network request is in flight; `savingField` indicator disables the control. |
| NFR-03 | Security | All API calls are authenticated server-side. Ownership is verified on every PUT/DELETE. No client-side trust of `detail.id`. |
| NFR-04 | Accessibility | Modal uses `role="dialog" aria-modal="true"`. Focus is trapped inside the modal. Escape closes the modal. Toggle inputs are labeled with `aria-label`. |
| NFR-05 | Internationalisation | All labels use `teacher` namespace. Difficulty labels, mode names, and status names are translated via i18n keys. |
| NFR-06 | Responsiveness | Modal is full-screen on mobile (`inset-0`) and a centered max-width panel on desktop (`max-w-5xl mx-auto`). Settings panels stack vertically on narrow viewports. |
| NFR-07 | Data Freshness | After every PUT, `refetchDetail()` re-fetches the full `TestDetail` to ensure UI reflects server state (avoids stale cache after notifications or concurrent edits). |

---

## 5. UI/UX Requirements

### 5.1 Modal Structure

- **Backdrop:** Fixed `inset-0 bg-black/30 backdrop-blur-sm z-50`.
- **Panel:** `bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col` at max-w-5xl, full-height on mobile.
- **Header bar:** `px-6 py-4 border-b border-[#c7c4d7]/20` with `EditableTitle` on the left and close button on the right.
- **Body:** Two-column layout on desktop (`lg:grid-cols-[320px_1fr]`): Settings panel on the left, Questions + Sections on the right. Single column on mobile.
- **Scroll:** Only the right column scrolls; the left settings panel is sticky.

### 5.2 Settings Panel

- Surface: `bg-[#f8f9ff] rounded-2xl p-5 space-y-4`.
- Section headings: `text-[10px] font-bold uppercase tracking-widest text-[#777586]`.
- Toggle rows: `flex items-center justify-between`. Toggle uses M3 switch style (`w-11 h-6 rounded-full` with sliding thumb).
- `TimeLimitInput` / `MaxAttemptsInput`: `bg-[#f8f9ff] rounded-2xl px-4 py-3` with icon, label, and number input.
- `ChipDropdown` for status: styled pill with chevron.

### 5.3 Question Cards

- Container: `bg-white rounded-xl border border-[#c7c4d7]/20 p-4` with hover shadow.
- Left: checkbox, question number badge (`w-7 h-7 rounded-full bg-[#e3dfff] text-[#2a14b4] text-xs`).
- Center: type chip, content preview (1 line, truncated), difficulty dot.
- Right: timer value, media icon (if present), expand button.
- Expanded: `QuestionEditor` renders below the card row with `AnimatePresence` slide-down.

### 5.4 Difficulty Badges

| Level | Label | Background | Text |
|-------|-------|------------|------|
| 1 | Easy | `#a6f2d1/40` | `#1b6b51` |
| 2 | Medium | `#fef3c7/60` | `#92400e` |
| 3 | Hard | `#fce7f3/60` | `#9d174d` |
| 4 | Expert | `#fee2e2/60` | `#7b0020` |

### 5.5 Section Tree

- PART: `bg-[#f7f2fa]` with `menu_book` icon in `#2a14b4`.
- GROUP: `bg-[#f0fdf4]` with `folder_open` icon in `#1b6b51`, indented `ml-4`.
- EXERCISE: `bg-[#fffbeb]` with `description` icon in `#92400e`, indented `ml-8`.
- Each row: title, description (if present), media indicator, edit/delete/up/down buttons (icon buttons, visible on hover).
- "Add" buttons appear at the bottom of each level group.

### 5.6 Saving Indicators

- `savingField !== null` during a PUT: spinner icon (`progress_activity animate-spin`) replaces the relevant icon.
- Toast on success: `toast.success("{Field} saved successfully")`.
- Toast on failure: `toast.error("Failed to save {field}")`.

---

## 6. Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | Test has 0 questions | Questions section shows empty state; "Add Question" CTA is prominent. |
| EC-02 | Bulk select with 0 items | Bulk delete button is disabled. |
| EC-03 | Blur on time limit with empty input | `draft` reverts to current server value; no API call made. |
| EC-04 | Time limit entry above 300 | Clamped to 300 before save; `draft` updated to "300". |
| EC-05 | Max attempts set to 0 | Displays "unlimited" label; saved as `0` in DB. |
| EC-06 | Section add fails | Error toast; section does not appear in tree; no stale state. |
| EC-07 | Delete section with children | Server cascade handles deletion; `refetchDetail` after success removes all orphaned children from UI. |
| EC-08 | QuestionEditor: invalid JSON in advanced_data | Inline error message; PUT not sent until valid JSON is entered. |
| EC-09 | Status changed to ACTIVE | PUT succeeds; notifications created server-side; modal reflects ACTIVE status; listing card updates on close. |
| EC-10 | Question page > 1, then type filter changes | Question pagination resets to page 1. |
| EC-11 | Modal open while another modal (delete confirm) is already open | Delete confirm is part of the same z-index context; only one can be open at a time (state is mutually exclusive). |
| EC-12 | Network drops while saving | PUT fails; toast shown; `savingField` cleared; UI retains the pre-save displayed value (server value from last refetch). |
| EC-13 | Two teachers have the same test title | No conflict; titles are not unique; server scopes all queries by `createdById`. |
| EC-14 | Section reorder: only one sibling | Up/Down buttons are disabled when the section is the sole child at its level. |

---

## 7. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Settings save latency | < 300ms round-trip | Network waterfall in DevTools |
| `refetchDetail` overhead | < 200ms | Measured via fetch timing in dev |
| Zero stale-state bugs | 0 reported cases | QA session + code review |
| Question pagination accuracy | Exactly 10 per page | Unit test on slice logic |
| Toast success rate | 100% visible on successful save | Manual QA walkthrough |
| Accessibility: focus trap | Focus stays inside modal | Playwright accessibility audit |
| i18n completeness | 0 hardcoded strings | CI type check |
| Section tree render correctness | Correct PART/GROUP/EXERCISE nesting | Unit test on tree-building logic |
