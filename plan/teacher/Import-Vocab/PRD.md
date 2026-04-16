# PRD — Import Vocabulary (CSV)

**Feature:** Bulk vocabulary import via CSV upload  
**Route:** `src/app/teacher/topics/[topicId]/import-vocab/page.tsx`  
**Component:** `src/components/teacher/VocabCsvImporter.tsx`  
**Status:** Implemented  

---

## Overview

The Import Vocabulary page lets teachers upload a CSV file containing many vocabulary words at once, preview the parsed rows with validation feedback, and commit the import to the database. It is the fastest path to populating a topic with an existing word list (e.g., from a textbook appendix or spreadsheet). After a successful import the teacher is redirected back to the topic detail page.

---

## User Stories

| ID | As a teacher I want to… | So that… |
|----|------------------------|----------|
| I1 | Upload a CSV file with vocabulary words | I can populate a topic without typing each word manually |
| I2 | Download a template CSV | I know exactly which columns are required and how to format them |
| I3 | See a preview of all parsed rows before importing | I can verify the data looks correct |
| I4 | See per-row validation errors highlighted | I can fix issues in my spreadsheet and re-upload |
| I5 | See a row count in the preview heading | I know how many words will be imported |
| I6 | Import all valid rows at once | The topic is populated in a single action |
| I7 | Be blocked from importing if there are validation errors | I don't accidentally create corrupted vocabulary entries |
| I8 | Return to the topic detail page after importing | I can immediately see the imported words |

---

## Functional Requirements

### FR-1: CSV Upload
- File input (`accept=".csv"`) hidden behind a styled drop-zone `div`.
- Clicking the drop-zone triggers the hidden `<input type="file">`.
- Parsing: `papaparse` with `{ header: true, skipEmptyLines: true }`.
- On parse success: validate each row and set `rows` state.
- On parse error: `toast.error(t("csvParseFailed"))`.

### FR-2: CSV Template Download
- "Download Template" button fetches `/templates/vocab_template.csv` as a file download.
- Template columns: `number, word, type, pronunciation, meaning, example`

### FR-3: Row Validation
Per-row validation runs client-side immediately after parse:
- `word` is non-empty string → required; error: `t("vocabWordRequired")`
- `meaning` is non-empty string → required; error: `t("vocabMeaningRequired")`
- Optional fields: `type`, `pronunciation`, `example`, `number`
- Errors stored as `string[]` on each `ValidatedRow`

### FR-4: Preview Table
- Rendered when `fileSelected && rows.length > 0`.
- Columns: `#`, `word`, `type`, `pronunciation`, `meaning`, `example`, `status`.
- Status cell: green "Valid" for clean rows; red comma-joined error messages for invalid rows.
- Invalid rows have a `bg-[#ffdada]/10` row background.
- Horizontally scrollable on narrow viewports.

### FR-5: Import Action
- "Import" button appears after file is selected.
- Disabled when: `importing === true`, `hasErrors === true`, or `rows.length === 0`.
- On click: `POST /api/teacher/vocabulary/import` with `{ topicId, words: [...] }`.
- `words` array maps each row to `{ word, type, pronunciation, meaning, example, sortOrder }`.
  - `sortOrder`: uses `row.number` parsed as int, else falls back to row index.
- Success: `toast.success(t("vocabImportSuccess"))`, then `router.push(/teacher/topics/[topicId])`.
- Failure: `toast.error(t("vocabImportFailed"))`.

### FR-6: Page Shell (Server Component)
- Auth guard: redirect to `/login` if no session.
- Renders page header with back-link to topic detail and subtitle.
- Passes `topicId` from `params` to `VocabCsvImporter`.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Auth | `TEACHER` role; topic ownership verified server-side on import |
| Validation | Client-side pre-validation; server also skips rows with empty `word` or `meaning` |
| File handling | CSV only; no size limit enforced client-side (PapaParse handles large files) |
| Idempotency | Re-importing the same CSV appends words; no deduplication (teacher is responsible) |
| Accessibility | File input is reachable via keyboard; status column uses colour + text (not colour alone) |

---

## UI/UX Requirements

- Page header: "Import Vocabularies" title + subtitle, back-link arrow to topic detail.
- Upload zone: dashed border, `upload_file` icon, filename display after selection.
- Template button: ghost pill style `bg-[#f0eef6] text-[#2a14b4]` with `download` icon.
- Upload card and preview table in separate white rounded-2xl cards.
- Preview table: compact `text-sm`, striped error rows.
- Import button: `#2a14b4` rounded-full; spinner `progress_activity` while importing.
- "Valid" status: `text-[#1b6b51]` green; errors: `text-[#7b0020]` red.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| CSV has no header row | PapaParse assigns column indices as keys; `word`/`meaning` keys will be undefined → all rows fail validation |
| CSV has extra columns | Ignored by PapaParse (extra keys on row object) |
| All rows are invalid | Import button stays disabled; teacher must fix and re-upload |
| Some rows are invalid | Import button disabled; all errors shown; teacher must fix before importing |
| Empty CSV file | `rows` remains `[]`; import button disabled with `rows.length === 0` check |
| Network failure on import | `catch` fires `toast.error(t("vocabImportFailed"))` |
| Non-CSV file selected | PapaParse parse error → `toast.error(t("csvParseFailed"))` |
| Very large CSV (1000+ rows) | Preview renders all rows; no pagination — acceptable for vocabulary lists |
| `number` column non-numeric | `parseInt` returns `NaN`; falls back to row index for `sortOrder` |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Successful import completion rate | > 90% of teachers who upload a file complete the import |
| Validation error discovery rate | 100% of invalid rows surfaced before user attempts import |
| Import API response time | < 2 seconds for 200-word CSV |
| Template download availability | 100% uptime (static file in `/public/templates/`) |
