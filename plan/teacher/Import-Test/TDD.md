# TDD — Import Test (CSV Importer)

**Route:** `/teacher/practice-tests/import`
**Page component:** `src/app/teacher/practice-tests/import/page.tsx`
**Client component:** `src/components/teacher/CsvImporter.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Architecture Overview

The Import Test page follows the same **Server Component shell + Client Component** boundary as the rest of the teacher feature set. The server component fetches the teacher's topics and passes them to `CsvImporter`. All CSV parsing, validation, state management, and the import API call happen entirely client-side inside `CsvImporter`.

```
Server (RSC)                                   Client
─────────────────────────────────────────────  ──────────────────────────────────────────────
ImportPage (async Server Component)
  ├── auth() → redirect if no session
  ├── prisma.topic.findMany(createdById)
  │     include: { language: true }
  └── renders:
        <back link>                             (static HTML)
        <CsvImporter topics={[...]} />   →      CsvImporter ("use client")
                                                  useState: topicId, title, testType,
                                                            rows, importing,
                                                            importProgress,
                                                            fileSelected
                                                  Papa.parse on file upload
                                                  validateRow() per row
                                                  POST /api/teacher/practice-tests/import
                                                  router.push("/teacher/practice-tests")
                                                  renders:
                                                    TopicDropdown (local fn)
                                                    <title input>
                                                    <testType toggle>
                                                    <template download button>
                                                    <file upload area>
                                                    <parsed summary bar>
                                                    <error table>
                                                    <import button>
                                                    <progress indicator>
```

---

## Route & Data Flow

### URL
```
GET /teacher/practice-tests/import
POST /api/teacher/practice-tests/import
```

### Server-Side Request Lifecycle

1. **Layout auth guard** — `src/app/teacher/layout.tsx` enforces `role === "TEACHER"`.
2. **Page auth guard** — `ImportPage` calls `auth()` defensively; redirects to `/login` if null.
3. **Topic fetch** — `prisma.topic.findMany` scoped to `createdById: session.user.id` (see Database Queries).
4. **Prop pass** — `topics` mapped to `{ id, title, languageName }[]` and passed to `<CsvImporter>`.

### Client-Side Import Lifecycle

1. Teacher selects topic from `TopicDropdown`.
2. Teacher enters test title.
3. Teacher selects test type (Classic / Exam).
4. Teacher clicks "Download Template" → browser downloads static CSV from `/public/templates/`.
5. Teacher selects a CSV file → `handleFileUpload` fires.
6. `Papa.parse` runs synchronously with `{ header: true, skipEmptyLines: true }`.
7. Each row passed through `validateRow(row, index)` → annotated with `errors[]` and resolved media types.
8. `setRows(validated)` and `setFileSelected(true)`.
9. Teacher reviews summary bar and error table.
10. Teacher clicks "Import" → `setImporting(true)`.
11. `fetch("POST /api/teacher/practice-tests/import", { body: JSON.stringify({ topicId, title, testType, questions: rows }) })`.
12. On success: `router.push("/teacher/practice-tests")`.
13. On failure: `toast.error(...)`, `setImporting(false)`.

### Media Type Resolution

```ts
function resolveMediaType(url?: string, explicitType?: string): string | null {
  if (!url) return null;
  if (explicitType && ["image", "audio", "video"].includes(explicitType)) return explicitType;
  return detectMediaType(url);   // from @/lib/mediaType — extension-based lookup
}
```

---

## Component Tree

```
TeacherLayout (RSC, src/app/teacher/layout.tsx)
└── TeacherShell (CC, src/components/teacher/TeacherShell.tsx)
    ├── Sidebar (CC)
    ├── AccountInfo (CC)
    └── <main>
        └── ImportPage (RSC, src/app/teacher/practice-tests/import/page.tsx)
            ├── <back link href="/teacher/practice-tests">
            ├── <h1> importTest
            ├── <p> importTestSubtitle
            └── CsvImporter (CC, src/components/teacher/CsvImporter.tsx)
                ├── TopicDropdown (local fn, inline)
                │   ├── <trigger button>
                │   └── <dropdown list>
                │       ├── <placeholder option>
                │       └── <topic option> × N
                │
                ├── <title input>
                │
                ├── <testType toggle>
                │   ├── <Classic button>
                │   └── <Exam button>
                │
                ├── <template download button>
                │
                ├── [fileSelected === false]
                │   └── <file upload area (dashed border)>
                │       └── <input type="file" accept=".csv" ref={fileInputRef}>
                │
                ├── [fileSelected === true]
                │   └── <file confirmation row>
                │       ├── <filename>
                │       └── <re-upload button>
                │
                ├── [rows.length > 0]
                │   └── <parsed summary bar>
                │       ├── {validCount} valid questions
                │       └── {errorCount} rows with errors
                │
                ├── [rows.some(r => r.errors.length > 0)]
                │   └── <error table>
                │       ├── <table header: #, Content, Errors>
                │       └── <error row> × errorRows.length
                │
                ├── <import button>
                │   disabled when: !topicId || !title.trim() || !fileSelected || hasErrors || importing
                │
                └── [importing === true]
                    └── <progress indicator>
                        ├── step label
                        ├── current / total
                        └── <progress bar>
```

**Component Classification:**

| Component | Type | Reason |
|-----------|------|--------|
| `ImportPage` | Server Component (async) | Auth, DB topic fetch |
| `CsvImporter` | Client Component (`"use client"`) | All interactive state, file parsing, API call |
| `TopicDropdown` | Client fn (local inside CsvImporter) | `useState(open)` for dropdown |

---

## Database Queries

### Server-Side: Fetch Topics

```ts
// src/app/teacher/practice-tests/import/page.tsx
prisma.topic.findMany({
  where: { createdById: session.user.id },
  include: { language: true },
  orderBy: { title: "asc" },
})
```

**Tables:** `topics`, `languages`
**Index:** `topics.createdById` (FK index), `topics.title` (ordering)
**Result shape:**
```ts
type Topic = { id: string; title: string; languageName: string }
```

### Server-Side: Import Handler (POST /api/teacher/practice-tests/import)

```ts
// 1. Verify topic ownership
prisma.topic.findUnique({ where: { id: topicId, createdById: session.user.id } })

// 2. Create PracticeTest
prisma.practiceTest.create({
  data: {
    title: title.trim(),
    topicId,
    createdById: session.user.id,
    status: "DRAFT",
    mode: testType === "exam" ? "TEST" : "PRACTICE",
    shuffleAnswers: false,
    shuffleQuestions: false,
    showReviewMoment: false,
    totalTime: 60,
    maxAttempts: 0,
  },
})

// 3. (Exam mode) Create TestSection records
// Deduplicate part/group/exercise combinations from rows
// Create PART sections, then GROUP sections with parentId, then EXERCISE sections
prisma.testSection.createMany({ data: sectionData })

// 4. Create Questions
prisma.question.createMany({
  data: rows.map((row, i) => ({
    testId: test.id,
    questionNumber: parseInt(row.question_number) || i + 1,
    content: row.content,
    questionType: row.question_type.toUpperCase(),
    answer1: row.answer_1 || "",
    answer2: row.answer_2 || null,
    answer3: row.answer_3 || null,
    answer4: row.answer_4 || null,
    correctAnswer: row.correct_answer || "",
    timer: parseInt(row.timer) || 30,
    contentMediaUrl: row.content_media_url || null,
    contentMediaType: row._contentMediaType || null,
    answer1MediaUrl: row.answer_1_media_url || null,
    answer1MediaType: row._a1MediaType || null,
    // ... answer 2-4 media
    difficulty: row.difficulty ? parseInt(row.difficulty) : null,
    explanation: row.explanation || null,
    advancedData: row.advanced_data || null,
    sectionId: resolvedSectionId || null,
  })),
})
```

All three DB operations (test create, section createMany, question createMany) wrapped in `prisma.$transaction`.

---

## API Endpoints

### POST `/api/teacher/practice-tests/import`

**Location:** `src/app/api/teacher/practice-tests/import/route.ts` (inferred from route structure)
**Auth:** `auth()` → 401 if not TEACHER.
**Request body:**
```ts
{
  topicId: string;
  title: string;
  testType: "classic" | "exam";
  questions: ValidatedRow[];
}
```
**Validation (server-side):**
- `topicId` must belong to `session.user.id`.
- `title` must be non-empty after trim.
- `questions` must be a non-empty array.

**Response on success:**
```json
{ "testId": "...", "questionCount": N }
```

**Response on failure:**
```json
{ "error": "string" }
```
With HTTP 400 (validation) or 500 (DB error).

**Status codes:**
| Code | Meaning |
|------|---------|
| 200 | Success; `testId` returned |
| 400 | Missing/invalid fields |
| 401 | Not authenticated or wrong role |
| 404 | `topicId` not found or not owned |
| 500 | DB transaction failure |

---

## State Management

All state is local to `CsvImporter`:

```ts
const [topicId, setTopicId] = useState("");               // selected topic ID
const [title, setTitle] = useState("");                    // test title input
const [testType, setTestType] = useState<"classic"|"exam">("classic");
const [rows, setRows] = useState<ValidatedRow[]>([]);      // parsed + validated CSV rows
const [importing, setImporting] = useState(false);         // import request in flight
const [importProgress, setImportProgress] = useState<{    // progress display
  step: string; current: number; total: number;
} | null>(null);
const [fileSelected, setFileSelected] = useState(false);  // whether a file has been parsed
```

**Derived values (computed inline or with useMemo):**
```ts
const errorRows = rows.filter(r => r.errors.length > 0);
const validCount = rows.length - errorRows.length;
const hasErrors = errorRows.length > 0;
const canImport = topicId && title.trim() && fileSelected && !hasErrors && !importing;
```

**No state resets between testType changes** — the uploaded file remains valid across type switches (server handles section column interpretation).

### `TopicDropdown` Local State

```ts
// Inside TopicDropdown function component
const [open, setOpen] = useState(false);
const ref = useRef<HTMLDivElement>(null);
// Click-outside listener via useEffect + mousedown on document
```

---

## Validation Logic

The `validateRow` function is a pure function (no side effects) that annotates each CSV row:

```ts
function validateRow(row: ParsedQuestion, index: number): ValidatedRow {
  const errors: string[] = [];
  const type = row.question_type?.toUpperCase();

  const VALID_TYPES = [
    "MULTIPLE_CHOICE", "GAP_FILL", "REORDER_WORDS", "CUE_WRITING",
    "PRONUNCIATION", "STRESS", "CLOZE_PASSAGE", "TRUE_FALSE", "MATCHING", "WORD_BANK"
  ];

  // Content required for all types
  if (!row.content) errors.push(t("csvContentRequired"));

  // Type must be in whitelist
  if (!VALID_TYPES.includes(type)) errors.push(t("csvInvalidType"));

  // Answer presence rules
  const needsAnswers = ["MULTIPLE_CHOICE", "PRONUNCIATION", "STRESS", "TRUE_FALSE"];
  if (needsAnswers.includes(type)) {
    if (!row.answer_1) errors.push(t("csvAnswer1Required"));
    if (["MULTIPLE_CHOICE", "PRONUNCIATION", "STRESS"].includes(type)) {
      if (!row.answer_2 || !row.answer_3 || !row.answer_4)
        errors.push(t("csvAllAnswersRequired"));
    }
  }

  // correct_answer rules
  const needsCorrectAnswer = !["MATCHING", "WORD_BANK"].includes(type);
  if (needsCorrectAnswer && !row.correct_answer) {
    errors.push(t("csvCorrectRequired"));
  } else if (row.correct_answer && needsAnswers.includes(type)) {
    const answers = [row.answer_1, row.answer_2, row.answer_3, row.answer_4].filter(Boolean);
    if (answers.length > 0 && !answers.includes(row.correct_answer))
      errors.push("correct_answer must match an answer option");
  }

  // advanced_data JSON validation
  if (row.advanced_data) {
    try { JSON.parse(row.advanced_data); }
    catch { errors.push("advanced_data is not valid JSON"); }
  }
  const needsAdvanced = ["REORDER_WORDS", "CUE_WRITING", "PRONUNCIATION", "STRESS", "MATCHING", "WORD_BANK"];
  if (needsAdvanced.includes(type) && !row.advanced_data)
    errors.push("advanced_data required for " + type);

  // Media type resolution
  const _contentMediaType = resolveMediaType(row.content_media_url, row.content_media_type);
  const _a1MediaType = resolveMediaType(row.answer_1_media_url, row.answer_1_media_type);
  // ... a2, a3, a4

  // Warn if URL provided but type undetectable
  if (row.content_media_url && !_contentMediaType)
    errors.push("Cannot detect content media type from URL");
  // ... per answer

  return {
    ...row,
    question_number: row.question_number || String(index + 1),
    errors,
    _contentMediaType,
    _a1MediaType, _a2MediaType, _a3MediaType, _a4MediaType,
  };
}
```

**Unit-testable:** `validateRow` has no external dependencies (uses `t()` for error strings, but this can be stubbed). It is a pure row → annotated row transform.

---

## Styling

### Design Tokens (same as platform)

| Token | Value |
|-------|-------|
| Primary | `#2a14b4` |
| Error | `#7b0020` |
| Error surface | `#fee2e2` |
| Border | `#c7c4d7` |
| Card shadow | `0_1px_3px_1px_rgba(0,0,0,0.06), 0_1px_2px_0_rgba(0,0,0,0.1)` |

### File Upload Area

```
border-2 border-dashed border-[#c7c4d7]/40
rounded-2xl p-10 text-center bg-[#f8f9ff]
hover:border-[#2a14b4]/40 hover:bg-[#eff4ff]/50
transition-colors cursor-pointer
```

### Error Table

```
bg-white rounded-2xl border border-[#fca5a5]
overflow-hidden max-h-[300px] overflow-y-auto
```
Table header row: `bg-[#fee2e2]/40`. Error cell: `text-[#7b0020] text-sm`.

### Progress Bar

```
w-full h-2 rounded-full bg-[#e3dfff]
→ fill: h-full bg-[#2a14b4] rounded-full
   style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
   transition-all duration-300
```

### Test Type Toggle

Active: `bg-[#2a14b4] text-white shadow-sm`
Inactive: `bg-white border border-[#c7c4d7]/30 text-[#464554] hover:border-[#2a14b4]/40`
Container: `flex rounded-xl overflow-hidden border border-[#c7c4d7]/30`

---

## i18n Keys

All keys in `teacher` namespace:

| Key | Usage |
|-----|-------|
| `importTest` | Page `<h1>` |
| `importTestSubtitle` | Page subtitle |
| `selectTopic` | TopicDropdown placeholder |
| `testTitle` | Title input label |
| `testType` | Type toggle label |
| `classicMode` | Classic option label |
| `examMode` | Exam option label |
| `downloadTemplate` | Template button label |
| `uploadCsv` | File upload area instruction |
| `csvContentRequired` | Validation error |
| `csvInvalidType` | Validation error |
| `csvAnswer1Required` | Validation error |
| `csvAllAnswersRequired` | Validation error |
| `csvCorrectRequired` | Validation error |
| `csvParseFailed` | Papa Parse error toast |
| `importing` | Button label during import |
| `importSuccess` | Success toast (if used) |
| `importFailed` | Error toast |
| `validationErrors` | Error table heading |
| `noTopicsYet` | Empty topic dropdown state |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Papa Parse error (malformed CSV) | `toast.error(t("csvParseFailed"))`; `rows` and `fileSelected` remain unchanged (empty). |
| Row validation error | Row annotated with `errors[]`; displayed in error table; Import button disabled. |
| `POST /import` returns 400 | `toast.error(data.error || t("importFailed"))`; `importing` cleared. |
| `POST /import` returns 401 | Same toast; user session has expired; next navigation redirects to `/login`. |
| `POST /import` returns 404 | Topic not found/not owned; error toast. |
| `POST /import` returns 500 | Transaction failed; error toast with generic message; no partial data in DB. |
| Network failure during import | `catch` block fires; `toast.error(t("importFailed"))`; `importing` cleared. |
| Empty CSV (header only) | `rows` is `[]`; `fileSelected` remains `false`; Import button disabled. |
| Teacher has no topics | `topics` prop is `[]`; `TopicDropdown` renders an empty list with a "no topics" message; Import disabled. |

---

## Performance

| Concern | Approach |
|---------|----------|
| CSV parsing | Papa Parse runs synchronously; no Web Worker. Acceptable for < 500 rows. For > 500 rows, parsing latency is 50–200ms (imperceptible). |
| Validation | `validateRow` runs per-row in `results.data.map()` — O(n) with low constant. No async operations. |
| Topic dropdown | Topics are passed as a prop (already fetched server-side); no client-side fetch. Dropdown renders at most ~50 items without virtualization. |
| Import API call | Single POST; server uses `createMany` (one SQL INSERT per table) + `$transaction`. Expected latency: 200–2000ms depending on row count. Progress indicator manages perceived wait. |
| Re-upload | Calling `handleFileUpload` again replaces `rows` state in one `setState`; React re-renders only the changed subtrees. |
| Template download | Served as a static file from `/public/templates/`; no server processing. CDN-cacheable. |
