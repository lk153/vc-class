# TDD — Practice Test Detail Modal

**Surface:** Modal inside `src/components/teacher/PracticeTestGrid.tsx`
**Related components:** `QuestionEditor`, `EditableTitle`, `TestSectionBuilder`, `ChipDropdown`, `ModalOverlay`, `Tooltip`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture Overview

The Detail Modal is not a separate route. It is rendered conditionally inside `PracticeTestGrid` (Client Component) based on the `selectedTestId` state. All modal state (`detail`, `savingField`, `refreshing`, question filters, section operations) lives inside `PracticeTestGrid` and flows down as props to child components.

The modal data lifecycle follows a **fetch-then-edit** pattern: the full `TestDetail` shape is fetched on modal open, stored in `detail`, and re-fetched (`refetchDetail`) after every successful mutation. This guarantees the UI always reflects the persisted server state.

```
PracticeTestGrid ("use client")
  │
  ├── state: selectedTestId, detail, loading, savingField, refreshing
  ├── state: qSearch, qTypeFilter, qDiffFilter, qPage, selectedQIds
  │
  ├── [selectedTestId !== null] → renders:
  │
  └── ModalOverlay (CC, backdrop + click-outside)
      └── <modal panel>
          ├── <header>
          │   ├── EditableTitle (CC)   → PUT /api/teacher/practice-tests
          │   └── <close button>       → closeModal()
          │
          ├── <body: two-column layout>
          │
          ├── [left: Settings panel]
          │   ├── ChipDropdown (status) → PUT /api/teacher/practice-tests
          │   ├── <mode badge>
          │   ├── <toggle: shuffleAnswers>   → PUT
          │   ├── <toggle: shuffleQuestions> → PUT
          │   ├── TimeLimitInput             → PUT on blur
          │   ├── MaxAttemptsInput           → PUT on blur
          │   └── <toggle: showReviewMoment> → PUT
          │
          └── [right: scrollable content]
              ├── [Questions section]
              │   ├── <search input>
              │   ├── <type filter chips>
              │   ├── <difficulty filter>
              │   ├── <bulk delete button>   → DELETE /api/teacher/questions/bulk
              │   ├── <add question button>  → POST /api/teacher/questions
              │   ├── <question card> × N
              │   │   └── [expanded] QuestionEditor (CC)
              │   │         → PUT /api/teacher/questions (per field, on blur/change)
              │   └── <pagination>
              │
              └── [Test Structure section]
                  └── TestSectionBuilder (CC)
                        → POST /api/teacher/test-sections (add)
                        → PUT /api/teacher/test-sections (edit)
                        → DELETE /api/teacher/test-sections (delete)
                        → POST /api/teacher/test-sections/reorder (reorder)
```

---

## Route & Data Flow

### Modal Open
1. `selectedTestId` is set by card click.
2. `useEffect([selectedTestId])` fires; sets `loading = true`.
3. `GET /api/teacher/practice-tests/{selectedTestId}` — full `TestDetail` shape.
4. Response stored in `detail`; `loading = false`.
5. Second `useEffect([selectedTestId])` fires simultaneously: locks body scroll, adds `keydown` listener for Escape.

### Settings Update (generic `updateTest`)
```ts
async function updateTest(field: string, data: Record<string, unknown>) {
  setSavingField(field);
  try {
    const res = await fetch("/api/teacher/practice-tests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: detail.id, title: detail.title, ...data }),
    });
    if (res.ok) {
      toast.success(`${fieldLabels[field]} saved successfully`);
      await refetchDetail();
    } else {
      toast.error(`Failed to save ${fieldLabels[field].toLowerCase()}`);
    }
  } catch {
    toast.error("Failed to update");
  } finally {
    setSavingField(null);
  }
}
```

### `refetchDetail`
```ts
async function refetchDetail() {
  if (!detail) return;
  setRefreshing(true);
  try {
    const r = await fetch(`/api/teacher/practice-tests/${detail.id}`);
    if (r.ok) setDetail(await r.json());
  } catch {} finally {
    setRefreshing(false);
  }
}
```

### Modal Close
```ts
const closeModal = useCallback(() => {
  setSelectedTestId(null);   // clears detail, unlocks scroll via effect cleanup
  router.refresh();           // re-runs server component to sync listing badges
}, [router]);
```

---

## Component Tree

```
ModalOverlay (CC, src/components/ModalOverlay.tsx)
  backdrop: fixed inset-0 bg-black/30 backdrop-blur-sm
  └── <modal panel: bg-white rounded-2xl max-w-5xl>

      ── HEADER ──────────────────────────────────────────────
      EditableTitle (CC, src/components/teacher/EditableTitle.tsx)
        props: value={detail.title} onSave={fn} saving={savingField==="title"}
      <CloseButton onClick={closeModal}>

      ── BODY (lg:grid-cols-[320px_1fr]) ────────────────────

      [LEFT PANEL: sticky settings]
      ──────────────────────────────
      <section heading> "General"
        ChipDropdown (CC, src/components/ChipDropdown.tsx)
          props: options=["DRAFT","ACTIVE","INACTIVE"] value={detail.status}
                 onChange → updateTest("status", { status })
        <mode badge> (read-only or dropdown)

      <section heading> "Behavior"
        <ToggleRow label="Shuffle Answers">
          <toggle> onChange → updateTest("shuffle", { shuffleAnswers })
        <ToggleRow label="Shuffle Questions">
          <toggle> onChange → updateTest("shuffleQuestions", { shuffleQuestions })
        TimeLimitInput (local fn)
          props: value={detail.totalTime} onSave={min => updateTest("totalTime",{totalTime:min})}
                 saving={savingField==="totalTime"}
        MaxAttemptsInput (local fn)
          props: value={detail.maxAttempts} onSave={v => updateTest("maxAttempts",{maxAttempts:v})}
                 saving={savingField==="maxAttempts"}
        <ToggleRow label="Instant Review">
          <toggle> onChange → updateTest("review", { showReviewMoment })

      [RIGHT PANEL: scrollable]
      ──────────────────────────────
      <Questions section>
        <FilterBar>
          <SearchInput value={qSearch} onChange={setQSearch}>
          <TypeFilterChips value={qTypeFilter} onChange={setQTypeFilter}>
          <DifficultyFilter value={qDiffFilter} onChange={setQDiffFilter}>
        <BulkActions>
          <SelectAllCheckbox>
          <BulkDeleteButton disabled={selectedQIds.size===0}>
          <AddQuestionButton>
        <QuestionList>
          <QuestionCard key={q.id}> × (filteredQs per page)
            <Checkbox checked={selectedQIds.has(q.id)}>
            <QuestionNumberBadge>
            <TypeChip>
            <ContentPreview (line-clamp-1)>
            <DifficultyBadge>
            <TimerValue>
            <MediaIndicator (if contentMediaUrl)>
            <ExpandButton>
            [expanded]
            QuestionEditor (CC, src/components/teacher/QuestionEditor.tsx)
        <Pagination (10/page)>

      <TestStructure section>
        TestSectionBuilder (CC, src/components/teacher/TestSectionBuilder.tsx)
          props: testId={detail.id} sections={detail.sections}
```

**Component Classification:**

| Component | Type | Location |
|-----------|------|----------|
| `ModalOverlay` | Client Component | `src/components/ModalOverlay.tsx` |
| `EditableTitle` | Client Component | `src/components/teacher/EditableTitle.tsx` |
| `ChipDropdown` | Client Component | `src/components/ChipDropdown.tsx` |
| `TimeLimitInput` | Client fn (local) | Inside `PracticeTestGrid.tsx` |
| `MaxAttemptsInput` | Client fn (local) | Inside `PracticeTestGrid.tsx` |
| `QuestionEditor` | Client Component | `src/components/teacher/QuestionEditor.tsx` |
| `TestSectionBuilder` | Client Component | `src/components/teacher/TestSectionBuilder.tsx` |
| `Tooltip` | Client Component | `src/components/Tooltip.tsx` |
| `MediaPicker` | Client Component | `src/components/teacher/MediaPicker.tsx` |

---

## Database Queries

### GET Test Detail

```ts
// src/app/api/teacher/practice-tests/[testId]/route.ts
prisma.practiceTest.findUnique({
  where: { id: testId, createdById: session.user.id },
  include: {
    topic: { include: { language: true } },
    questions: { orderBy: { questionNumber: "asc" } },
    sections: { orderBy: { sortOrder: "asc" } },
  },
})
```

**Tables:** `practice_tests`, `topics`, `languages`, `questions`, `test_sections`
**Index:** `practice_tests.id` (PK), `practice_tests.createdById` (FK index), `questions.testId + questionNumber` (composite), `test_sections.testId + sortOrder` (composite)

### PUT Test (settings)

```ts
// src/app/api/teacher/practice-tests/route.ts
prisma.practiceTest.update({
  where: { id },
  data: { ...changedFields },
})
// If status → ACTIVE: topicAssignment lookup + notification.createMany
```

### PUT Question

```ts
// src/app/api/teacher/questions/route.ts
prisma.question.update({
  where: { id: questionId, testId: verifiedTestId },
  data: { ...changedFields },
})
```

### POST Question

```ts
prisma.question.create({
  data: { testId, questionNumber: nextNumber, content: "", questionType: "MULTIPLE_CHOICE", ... }
})
```

### DELETE Questions (bulk)

```ts
// src/app/api/teacher/questions/bulk/route.ts
prisma.question.deleteMany({
  where: { id: { in: ids }, testId: verifiedTestId },
})
```

### POST Test Section

```ts
// src/app/api/teacher/test-sections/route.ts
prisma.testSection.create({
  data: { testId, parentId, level, title, sortOrder: nextOrder }
})
```

### PUT Test Section

```ts
prisma.testSection.update({
  where: { id, testId: verifiedTestId },
  data: { title, description, mediaUrl, mediaType }
})
```

### DELETE Test Section

```ts
// Cascade: child sections deleted by DB schema onDelete: Cascade
prisma.testSection.delete({ where: { id, testId: verifiedTestId } })
```

### POST Test Sections Reorder

```ts
// src/app/api/teacher/test-sections/reorder/route.ts
// Upsert sortOrder for each section in the new order
prisma.$transaction(
  orderedIds.map((id, idx) =>
    prisma.testSection.update({ where: { id }, data: { sortOrder: idx } })
  )
)
```

---

## API Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/api/teacher/practice-tests/{testId}` | Fetch full TestDetail | TEACHER + owner |
| `PUT` | `/api/teacher/practice-tests` | Update test metadata/settings | TEACHER + owner |
| `PUT` | `/api/teacher/questions` | Update a single question field | TEACHER + indirect owner via testId |
| `POST` | `/api/teacher/questions` | Create a new blank question | TEACHER + owner |
| `DELETE` | `/api/teacher/questions/bulk` | Delete multiple questions | TEACHER + owner check per id |
| `POST` | `/api/teacher/test-sections` | Create a section | TEACHER + owner |
| `PUT` | `/api/teacher/test-sections` | Edit a section | TEACHER + owner |
| `DELETE` | `/api/teacher/test-sections` | Delete a section (cascade) | TEACHER + owner |
| `POST` | `/api/teacher/test-sections/reorder` | Update sortOrder for siblings | TEACHER + owner |

All endpoints:
- Call `auth()` and verify `session.user.role === "TEACHER"`.
- Re-verify ownership by checking `createdById === session.user.id` on the parent `PracticeTest` (or directly on the resource for sections/questions via the `testId` join).
- Return `401` for auth failures, `404` for not-found/unauthorized, `400` for validation errors.

---

## State Management

All modal state is co-located in `PracticeTestGrid`. No external store (Zustand/Redux) is used.

### TestDetail State

```ts
const [detail, setDetail] = useState<TestDetail | null>(null);
```

`TestDetail` shape:
```ts
type TestDetail = {
  id: string;
  title: string;
  topicTitle: string;
  languageName: string;
  status: string;
  mode: string;
  shuffleAnswers: boolean;
  shuffleQuestions: boolean;
  showReviewMoment: boolean;
  totalTime: number;
  maxAttempts: number;
  availableFrom: string | null;
  availableTo: string | null;
  questions: Question[];
  sections: Section[];
};
```

### Saving Field Tracking

```ts
const [savingField, setSavingField] = useState<string | null>(null);
const fieldLabels: Record<string, string> = {
  status: "Test status",
  shuffle: "Shuffle answers",
  shuffleQuestions: "Shuffle questions",
  review: "Instant review",
  totalTime: "Time limit",
  maxAttempts: "Max attempts",
};
```

### Question Filter Derived State (inside modal)

```ts
const filteredQs = useMemo(() => {
  return (detail?.questions ?? []).filter(q => {
    if (qTypeFilter && q.questionType !== qTypeFilter) return false;
    if (qDiffFilter && String(q.difficulty) !== qDiffFilter) return false;
    if (qSearch && !q.content.toLowerCase().includes(qSearch.toLowerCase())) return false;
    return true;
  });
}, [detail?.questions, qTypeFilter, qDiffFilter, qSearch]);

const totalQPages = Math.max(1, Math.ceil(filteredQs.length / Q_PER_PAGE));
const paginatedQs = filteredQs.slice((qPage - 1) * Q_PER_PAGE, qPage * Q_PER_PAGE);

useEffect(() => { setQPage(1); }, [qTypeFilter, qDiffFilter, qSearch]);
```

### TimeLimitInput Local State

```ts
// Local draft prevents losing cursor position or displaying stale values during save
const [draft, setDraft] = useState(String(value));
useEffect(() => { setDraft(String(value)); }, [value]);

function handleBlur() {
  const parsed = parseInt(draft);
  if (isNaN(parsed) || draft.trim() === "") { setDraft(String(value)); return; }
  const clamped = Math.max(1, Math.min(300, parsed));
  setDraft(String(clamped));
  if (clamped !== value) onSave(clamped);
}
```

---

## Styling

### Modal Dimensions

| Viewport | Panel style |
|----------|-------------|
| `< lg` | `fixed inset-0 rounded-none` (full screen) |
| `≥ lg` | `rounded-2xl max-w-5xl w-full max-h-[90vh] mx-auto my-auto` |

### Toggle Switch (M3 style)

```html
<button
  role="switch"
  aria-checked={value}
  onClick={onToggle}
  class="relative w-11 h-6 rounded-full transition-colors
         {value ? 'bg-[#2a14b4]' : 'bg-[#c7c4d7]'}"
>
  <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow
               transition-transform {value ? 'translate-x-5' : 'translate-x-0'}" />
</button>
```

### Section Level Colors

| Level | Icon | Icon color | Row background |
|-------|------|------------|----------------|
| PART | `menu_book` | `#2a14b4` | `#f7f2fa` |
| GROUP | `folder_open` | `#1b6b51` | `#f0fdf4` |
| EXERCISE | `description` | `#92400e` | `#fffbeb` |

### Question Type Chips

```
Q_TYPE_CHIPS = [
  { val: "", label: "All", icon: "checklist" },
  { val: "MULTIPLE_CHOICE", label: "MC", icon: "radio_button_checked" },
  { val: "TRUE_FALSE", label: "T/F", icon: "check_box" },
  { val: "GAP_FILL", label: "Fill", icon: "edit" },
  { val: "REORDER_WORDS", label: "Reorder", icon: "swap_vert" },
  { val: "WORD_BANK", label: "Bank", icon: "view_module" },
]
```

---

## i18n Keys

All keys in `teacher` namespace:

| Key | Usage |
|-----|-------|
| `settings` | Settings panel heading |
| `general` | General settings sub-heading |
| `behavior` | Behavior settings sub-heading |
| `shuffleAnswers` | Toggle label |
| `shuffleQuestions` | Toggle label |
| `timeLimit` | TimeLimitInput label |
| `maxAttempts` | MaxAttemptsInput label |
| `instantReview` | Toggle label |
| `questions` | Section heading |
| `addQuestion` | Add question button |
| `bulkDelete` | Bulk delete button |
| `testStructure` | Section heading |
| `noQuestionsYet` | Question empty state |
| `easy` / `medium` / `hard` / `expert` | Difficulty labels |
| `classUpdateFailed` | Generic fetch error (reused) |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| GET detail fails | Error toast; `selectedTestId` cleared; modal never opens. |
| PUT settings fails | Error toast with field name; `savingField` cleared; UI shows last server value on next `refetchDetail`. |
| TimeLimitInput NaN | Draft reverts to server value; no API call; no toast. |
| TimeLimitInput out of range | Clamped silently before save; draft updates to clamped value. |
| PUT question fails | Error toast; field in `QuestionEditor` reverts via local state reset. |
| POST question fails | Error toast; no question added; question list unchanged. |
| Bulk delete fails | Error toast; selected IDs remain; no questions removed. |
| Section add fails | Error toast; `TestSectionBuilder` keeps its current `sections` state (no optimistic update). |
| Section reorder fails | Error toast; section order reverts to pre-action order (kept in local state of `TestSectionBuilder`). |
| JSON parse error in advancedData | Inline error message rendered below the textarea; save button disabled. |
| `refetchDetail` fails silently | Try/catch with empty catch; modal continues to display last known `detail`; user can retry by triggering another save. |

---

## Performance

| Concern | Approach |
|---------|----------|
| Modal data fetch | Lazy: only fetched when `selectedTestId` is set. Not prefetched or cached. |
| Question filtering | `useMemo` on `detail.questions` (already in memory); no API call for filter changes. |
| Settings save granularity | One field per PUT; no full-object serialization except title (required by API). |
| `refetchDetail` frequency | Once per successful save; capped by user interaction rate. |
| `AnimatePresence` usage | Used for modal enter/exit (`motion/react`); QuestionEditor expand/collapse uses CSS height transitions via Tailwind, not JS animation, to keep list rendering fast. |
| Section tree rendering | Flat `sections[]` array; tree structure computed with `useMemo` inside `TestSectionBuilder` by filtering on `level` and `parentId`. No recursive component; flat list with visual indentation. |
| Bulk delete | Server uses `deleteMany` (single DB round-trip); client `refetchDetail` follows immediately. |
| Scroll containment | Right panel has `overflow-y-auto`; left settings panel is `position: sticky top-0`. This prevents the whole modal from growing unboundedly. |
