# PRD — Import Test (CSV Importer)

**Feature:** CSV-based Practice Test Import
**Route:** `/teacher/practice-tests/import`
**Last Updated:** 2026-04-15
**Status:** Implemented

---

## 1. Overview

The Import Test page allows teachers to bulk-create a practice test (including all its questions) by uploading a CSV file. The flow is: select a topic → choose test type (Classic or Exam mode) → download the appropriate template → upload a populated CSV → review a validation report → confirm import. The server then creates the `PracticeTest` record and all `Question` records in a single batch operation. Media URLs in the CSV are auto-typed using URL pattern detection. For exam-mode tests, the CSV additionally carries section columns (`part`, `group`, `exercise`) that drive `TestSection` creation.

---

## 2. User Stories

**US-01 — Select Topic**
As a teacher, I want to select a topic from a dropdown before uploading, so that the created test is correctly associated with the right language context.

**US-02 — Name the Test**
As a teacher, I want to provide a test title before importing, so that the created test has a meaningful name in my library.

**US-03 — Choose Test Type**
As a teacher, I want to choose between "Classic" (flat question list) and "Exam" (PART/GROUP/EXERCISE hierarchy) before downloading the template, so that I fill in the correct columns for my intended structure.

**US-04 — Download Template**
As a teacher, I want a "Download Template" button that gives me a pre-formatted CSV with all required column headers, so that I don't have to guess the correct column names or order.

**US-05 — Upload CSV**
As a teacher, I want to drag-and-drop or click-to-browse a CSV file, so that the file is parsed immediately without submitting a form.

**US-06 — Preview Parsed Data**
As a teacher, I want to see a summary of how many questions were parsed and how many have errors before I commit to importing, so that I can fix issues in my spreadsheet and re-upload.

**US-07 — See Validation Errors**
As a teacher, I want a detailed error table showing every row with errors and the specific error messages, so that I can locate and fix the problems in my CSV.

**US-08 — Auto-detect Media Types**
As a teacher, I want media URLs in my CSV to have their type (image / audio / video) automatically detected from the URL extension, so that I don't need to fill in a separate type column for standard files.

**US-09 — Import with No Errors**
As a teacher, I want the "Import" button to be available only when there are no validation errors, so that I never accidentally import broken data.

**US-10 — Progress Feedback**
As a teacher, I want to see a progress indicator during the import operation (step label + count), so that I know the import is running and roughly how far along it is.

**US-11 — Post-Import Redirect**
As a teacher, after a successful import I want to be redirected to the practice tests listing where I can see my newly created test, so that I can immediately verify the result.

**US-12 — Exam Mode Sections**
As a teacher importing an exam-mode test, I want `part`, `group`, and `exercise` columns in my CSV to automatically create the PART/GROUP/EXERCISE section hierarchy, so that the test structure matches my exam outline.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement |
|----|-------------|
| FR-01 | The page calls `auth()` server-side. Redirects to `/login` if no session. |
| FR-02 | The teacher layout enforces `role === "TEACHER"`. |
| FR-03 | The import API endpoint (`POST /api/teacher/practice-tests/import`) independently verifies the session and role. |

### 3.2 Topic Selector

| ID | Requirement |
|----|-------------|
| FR-04 | Topics are fetched server-side: `prisma.topic.findMany({ where: { createdById: session.user.id }, include: { language: true } })`. |
| FR-05 | The topic dropdown shows `{topic.title} ({languageName})` per option. |
| FR-06 | An unselected topic prevents proceeding (Import button disabled; file upload blocked). |

### 3.3 Test Title

| ID | Requirement |
|----|-------------|
| FR-07 | A text input for the test title is required before import. |
| FR-08 | Title validation: non-empty, trimmed. Import is disabled if title is empty. |

### 3.4 Test Type Selection

| ID | Requirement |
|----|-------------|
| FR-09 | Two radio/tab options: "Classic" (default) and "Exam". The selection affects which template is downloaded and how section columns are processed. |
| FR-10 | Classic mode: `part`, `group`, `exercise` columns are ignored even if present in the CSV. |
| FR-11 | Exam mode: `part`, `group`, `exercise` columns are read; non-empty values drive `TestSection` creation. |

### 3.5 Template Download

| ID | Requirement |
|----|-------------|
| FR-12 | "Download Template" button triggers a download of `/public/templates/practice_test_template.csv` (Classic) or `/public/templates/exam_test_template.csv` (Exam). |
| FR-13 | Templates include all required columns as headers with a single example row. |

### 3.6 CSV Parsing & Validation (Client)

| ID | Requirement |
|----|-------------|
| FR-14 | File input accepts `.csv` files only (`accept=".csv"`). |
| FR-15 | CSV is parsed client-side using `Papa.parse` with `{ header: true, skipEmptyLines: true }`. |
| FR-16 | Required columns: `question_number`, `content`, `question_type`, `answer_1`, `correct_answer`, `timer`. |
| FR-17 | Optional columns: `answer_2`, `answer_3`, `answer_4`, `content_media_url`, `content_media_type`, `answer_1_media_url` … `answer_4_media_url`, `difficulty`, `explanation`, `advanced_data`, `part`, `group`, `exercise`. |
| FR-18 | Valid `question_type` values: `MULTIPLE_CHOICE`, `GAP_FILL`, `REORDER_WORDS`, `CUE_WRITING`, `PRONUNCIATION`, `STRESS`, `CLOZE_PASSAGE`, `TRUE_FALSE`, `MATCHING`, `WORD_BANK`. |
| FR-19 | For `MULTIPLE_CHOICE`, `PRONUNCIATION`, `STRESS`: `answer_2`, `answer_3`, `answer_4` are required. |
| FR-20 | For `MULTIPLE_CHOICE`, `PRONUNCIATION`, `STRESS`, `TRUE_FALSE`: `answer_1` is required. |
| FR-21 | `correct_answer` must match one of the answer option values (when the type uses explicit answer options). Not required for `MATCHING`, `WORD_BANK`. |
| FR-22 | `advanced_data` must be valid JSON if present. |
| FR-23 | Types requiring `advanced_data`: `REORDER_WORDS`, `CUE_WRITING`, `PRONUNCIATION`, `STRESS`, `MATCHING`, `WORD_BANK`. |
| FR-24 | Media type auto-detection: `detectMediaType(url)` from `@/lib/mediaType` resolves extension → `"image" | "audio" | "video" | null`. |
| FR-25 | If a media URL is provided but the type cannot be detected, a validation error is added to that row. |
| FR-26 | Explicit `*_media_type` columns override auto-detection if the value is one of `image`, `audio`, `video`. |
| FR-27 | Each parsed row is annotated with an `errors: string[]` array. Rows with `errors.length > 0` are shown in the error table. |

### 3.7 Error Table

| ID | Requirement |
|----|-------------|
| FR-28 | An error table is rendered when any row has errors. It shows: row number, question content preview, and a list of error messages. |
| FR-29 | The Import button is disabled when `rows.some(r => r.errors.length > 0)`. |
| FR-30 | When the file is replaced (new upload), the error table resets. |

### 3.8 Import Action

| ID | Requirement |
|----|-------------|
| FR-31 | On "Import", send `POST /api/teacher/practice-tests/import` with JSON body: `{ topicId, title, testType, questions: ValidatedRow[] }`. |
| FR-32 | Progress state: `{ step: string; current: number; total: number }` is set by the client during the multi-step import to provide visual feedback. In the current implementation, progress updates are simulated client-side based on row count; the API performs all operations server-side in one request. |
| FR-33 | On success (`200 OK`), navigate to `/teacher/practice-tests` via `router.push`. |
| FR-34 | On failure, show an error toast with the server-returned message or a generic fallback. |
| FR-35 | The Import button shows a spinner and is disabled during the request. |

### 3.9 Server-Side Import Logic

| ID | Requirement |
|----|-------------|
| FR-36 | Verify auth and topic ownership in the API handler before writing any data. |
| FR-37 | Create one `PracticeTest` record with `status: "DRAFT"`, `mode` derived from `testType`. |
| FR-38 | Create all `Question` records in a `prisma.question.createMany` call. |
| FR-39 | For exam-mode imports: deduplicate and create `TestSection` records (PART, GROUP, EXERCISE) from the unique combinations in the CSV, then assign `sectionId` to each question. |
| FR-40 | The entire import is wrapped in a `prisma.$transaction` to ensure atomicity — partial imports do not occur. |
| FR-41 | `question_number` from the CSV is used as `questionNumber` (integer). If missing or non-numeric, the 1-indexed row position is used. |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | CSV parsing is synchronous and runs on the main thread (Papa Parse); for typical test files (< 500 rows) this is imperceptible. The import API call may take 1–5s for large batches; the progress indicator manages perceived wait time. |
| NFR-02 | Security | `topicId` ownership is re-verified server-side. The API does not trust any client-computed values for `createdById`. All `advanced_data` is stored as-is (JSON string); no eval or execution. |
| NFR-03 | Data Integrity | `prisma.$transaction` ensures all-or-nothing import. If any question fails validation at DB level, the full transaction rolls back. |
| NFR-04 | Accessibility | File upload uses a real `<input type="file">` (not a div) for keyboard and AT accessibility. Error table has `<th>` headers. Progress indicator uses `role="status"`. |
| NFR-05 | Internationalisation | All validation messages in the error table and toast notifications use `teacher` namespace keys. |
| NFR-06 | File Size | No explicit client-side file size limit enforced; practical limit is browser memory for Papa Parse. Server-side, the Next.js default body size limit (4MB) applies. |

---

## 5. UI/UX Requirements

### 5.1 Page Layout

- Contained single-column layout, `max-w-3xl mx-auto`.
- Header: `<h1>` "Import Test", subtitle explaining the CSV workflow.
- Back link to `/teacher/practice-tests` in the header area.

### 5.2 Step Flow Visual

Steps displayed as a subtle numbered sequence:
1. Select Topic & Title
2. Choose Type & Download Template
3. Upload CSV
4. Review & Import

Steps do not gate the UI; they are visual guides only.

### 5.3 Topic Dropdown

- Custom dropdown component (`TopicDropdown` local function inside `CsvImporter`).
- Shows topic + language name. Selected state highlighted with `#2a14b4` check icon.
- `max-h-[240px] overflow-y-auto` when open.

### 5.4 Test Type Toggle

- Two pill buttons: "Classic" and "Exam". Active: `bg-[#2a14b4] text-white`. Inactive: `bg-white border text-[#464554]`.
- Changing type does not clear the uploaded file (template note updates).

### 5.5 File Upload Area

- Dashed border card with `upload_file` icon, instructional text, and file browse button.
- On file selection, replaces dashed area with a "file selected" confirmation row showing filename and a re-upload button.
- Input `accept=".csv"` to hint the OS file picker.

### 5.6 Parsed Summary Bar

After parsing, shows: `{validCount} valid questions`, `{errorCount} rows with errors` (red if > 0). This bar appears above the error table.

### 5.7 Error Table

- `bg-white rounded-2xl border border-[#fca5a5]` container.
- Header: "Validation Errors" in `text-[#7b0020]` with error count badge.
- Table columns: `#` (row number), Content Preview, Errors (comma-separated list or stacked).
- Max height with `overflow-y-auto` to avoid pushing the page too long.

### 5.8 Import Button

- `bg-[#2a14b4] text-white rounded-full px-8 py-3 font-bold`.
- Disabled (and `opacity-50 cursor-not-allowed`) when: no topic selected, title empty, no file uploaded, or any validation errors.
- During import: spinner icon + "Importing…" label; button disabled.

### 5.9 Progress Indicator

- Appears below the Import button during the request.
- Shows: current step label ("Creating test…", "Adding questions…") and `{current} / {total}` count with a progress bar.

---

## 6. Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | CSV has 0 data rows (header only) | `rows` is empty; summary shows "0 valid questions"; Import button disabled. |
| EC-02 | Teacher has no topics | Topic dropdown renders empty; a note prompts the teacher to create a topic first; all import controls disabled. |
| EC-03 | CSV missing required columns | Papa Parse returns rows with `undefined` values for missing columns; validation errors added for each affected row. |
| EC-04 | Duplicate `question_number` values | Server assigns sequential `questionNumber` from row index if conflicts arise; no client-side deduplication. |
| EC-05 | Very large CSV (200+ rows) | Papa Parse runs synchronously; UI may be unresponsive for < 1s; acceptable trade-off. Import API handles via `createMany`. |
| EC-06 | Media URL with unknown extension | `detectMediaType` returns `null`; validation error added; teacher must either provide a valid URL or remove the URL. |
| EC-07 | Exam mode CSV with missing `part` values | Rows with no `part` are created as unstructured questions (no `sectionId`); sections are only created for non-empty `part` values. |
| EC-08 | Import transaction fails (DB error) | Full rollback; no `PracticeTest` or `Question` records created; error toast shown with server message. |
| EC-09 | Title is whitespace only | Trimmed to empty string; validation fails; Import button remains disabled. |
| EC-10 | Re-upload different CSV | `rows` state is replaced; error table and summary refresh; import has not been started. |
| EC-11 | `advanced_data` is `{}` (empty object) | Valid JSON; passes validation; stored as `"{}"`. |
| EC-12 | `correct_answer` matches answer with trailing space | Space is not trimmed by the validator; error shown. Template should note that values must match exactly. |

---

## 7. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Parse speed (100-row CSV) | < 100ms | Browser DevTools Performance tab |
| Zero partial imports | 0 partial test records in DB | DB integrity check; transaction usage |
| Validation accuracy | 100% of invalid rows flagged | Unit tests on `validateRow` |
| Import success rate (valid CSV) | 100% redirect to listing | Integration / E2E test |
| Error table clarity | < 2 support tickets/month for "what does this error mean" | Support ticket tracking |
| Template download success | 100% of template links resolve | Smoke test |
| i18n completeness | 0 hardcoded validation strings | CI lint |
