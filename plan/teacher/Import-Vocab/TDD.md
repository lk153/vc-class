# TDD — Import Vocabulary (CSV)

**Feature:** Bulk vocabulary import via CSV upload  
**Route:** `src/app/teacher/topics/[topicId]/import-vocab/page.tsx`  
**Component:** `src/components/teacher/VocabCsvImporter.tsx`  

---

## Architecture

```
ImportVocabPage (Server Component)
│  Auth guard → redirect("/login")
│  Reads topicId from params
│
└─ Page header JSX (title, subtitle, back link)
└─ VocabCsvImporter (Client Component)  "use client"
   │  useState: rows, importing, fileSelected
   │  useRef: fileInputRef
   │
   ├─ Upload card
   │   ├─ Drop-zone div → fileInputRef.current.click()
   │   ├─ input[type=file accept=.csv] (hidden)
   │   └─ Download Template button
   │
   ├─ Preview table (conditional: fileSelected && rows.length > 0)
   │
   └─ Import button (conditional: fileSelected)
```

---

## Route & Data Flow

```
Browser GET /teacher/topics/[topicId]/import-vocab
  → Next.js RSC → ImportVocabPage
    → auth()
    → render VocabCsvImporter with { topicId }

File upload flow:
  User clicks drop-zone → fileInputRef.current.click()
  User selects .csv → onChange=handleFileUpload
    → Papa.parse(file, { header:true, skipEmptyLines:true })
      → results.data → map(validateRow) → setRows(validated)
                                          setFileSelected(true)

Template download:
  User clicks Download Template
    → create <a> element, href="/templates/vocab_template.csv", click

Import flow:
  User clicks Import button → handleImport()
    → fetch POST /api/teacher/vocabulary/import
        body: { topicId, words: rows.map(mapWord) }
      → /app/api/teacher/vocabulary/import/route.ts
          → auth() + topic ownership
          → prisma.vocabulary.create × words.length (sequential)
          → 201 { count }
    → toast.success → router.push(/teacher/topics/[topicId])
```

---

## Component Tree

```
ImportVocabPage                           RSC
├── BackLink → /teacher/topics/[topicId]
├── h1 "Import Vocabularies"
├── p subtitle
└── VocabCsvImporter                      CC  props: { topicId }
    ├── UploadCard  div.bg-white.rounded-2xl
    │   ├── Label "Upload CSV"
    │   ├── DropZone div[onClick]
    │   │   ├── Icon upload_file
    │   │   └── Filename or placeholder
    │   ├── input[type=file ref=fileInputRef onChange=handleFileUpload]
    │   └── DownloadTemplateButton
    ├── PreviewCard (visible when fileSelected && rows.length > 0)
    │   ├── h2 "Preview ({count} questions)"  [uses csvPreview key]
    │   └── table.overflow-x-auto
    │       ├── thead: #, word, type, pronunciation, meaning, example, status
    │       └── tbody:
    │           └── tr × rows.length
    │               ├── td # (row.number || i+1)
    │               ├── td word
    │               ├── td type
    │               ├── td pronunciation
    │               ├── td meaning
    │               ├── td example
    │               └── td status (ValidBadge | ErrorText)
    └── ImportButton (visible when fileSelected)
        disabled={importing || hasErrors || rows.length===0}
```

---

## Database Queries

### Import (API route)
```ts
// Ownership check
const topic = await prisma.topic.findUnique({ where: { id: topicId } })
if (!topic || topic.createdById !== session.user.id) return 404

// Max sort order base
const maxSort = await prisma.vocabulary.aggregate({
  where: { topicId },
  _max: { sortOrder: true },
})
let nextSort = (maxSort._max.sortOrder ?? -1) + 1

// Sequential create (preserves order)
for (const w of words) {
  await prisma.vocabulary.create({
    data: {
      topicId, word, type, pronunciation, meaning, example,
      sortOrder: w.sortOrder ?? nextSort++,
    },
  })
}
```

> Sequential loop (not `createMany`) used to allow per-row `sortOrder` assignment and easier error isolation.

---

## API Endpoints

### POST /api/teacher/vocabulary/import
- **File:** `src/app/api/teacher/vocabulary/import/route.ts`
- **Auth:** session + `role=TEACHER` + topic ownership
- **Body:** `{ topicId: string, words: Word[] }`
  ```ts
  type Word = {
    word: string
    type?: string | null
    pronunciation?: string | null
    meaning: string
    example?: string | null
    sortOrder?: number
  }
  ```
- **Validation:** skips rows where `!w.word || !w.meaning` (server-side safety net)
- **Response 201:** `{ count: number }` — number of words actually created
- **Response 400:** `{ error: "topicId and words are required" }`
- **Response 401:** `{ error: "Unauthorized" }`
- **Response 404:** topic not found or wrong owner

---

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `rows` | `ValidatedRow[]` | Parsed + validated CSV rows |
| `importing` | `boolean` | Disables import button, shows spinner |
| `fileSelected` | `boolean` | Controls visibility of preview and import button |

Derived (computed inline):
- `hasErrors` — `rows.some(r => r.errors.length > 0)`

Type definitions:
```ts
type ParsedWord = {
  number?: string
  word: string
  type?: string
  pronunciation?: string
  meaning: string
  example?: string
}

type ValidatedRow = ParsedWord & { errors: string[] }
```

---

## Styling

| Element | Classes |
|---------|---------|
| Upload card | `bg-white rounded-2xl shadow-[0_1px_3px_1px…] p-6 md:p-8` |
| Drop zone | `border-2 border-dashed border-[#c7c4d7]/30 rounded-xl` + hover `border-[#2a14b4]/30 bg-[#d9e3f6]/10` |
| Drop zone icon | `text-[#2a14b4]/40` |
| Template button | `bg-[#f0eef6] text-[#2a14b4] rounded-full px-5 py-3` |
| Preview card | `bg-white rounded-2xl shadow-[…] p-6 md:p-8` |
| Table header cell | `text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]` |
| Invalid row | `bg-[#ffdada]/10` |
| Valid status | `text-[#1b6b51] text-xs` |
| Error status | `text-[#7b0020] text-xs` |
| Import button | `bg-[#2a14b4] hover:bg-[#4338ca] rounded-full px-6 py-2.5 shadow-lg shadow-[#2a14b4]/20` |
| Disabled import | `disabled:opacity-40 disabled:cursor-not-allowed` |

---

## i18n Keys (`teacher` namespace)

| Key | EN value |
|-----|---------|
| `importVocab` | Import Vocabularies |
| `importVocabSubtitle` | Import vocabulary words from a CSV file. |
| `backToTopic` | Back to Topic |
| `uploadCsv` | Upload CSV |
| `chooseCsvFile` | Choose CSV file… |
| `downloadTemplate` | Download Template |
| `csvPreview` | Preview ({count} questions) |
| `word` | Word |
| `meaning` | Meaning |
| `example` | Example |
| `csvStatus` | Status |
| `csvValid` | Valid |
| `csvParseFailed` | Failed to parse CSV file |
| `csvFixErrors` | Fix validation errors before importing |
| `import` | Import |
| `vocabImportSuccess` | Vocabularies imported successfully! |
| `vocabImportFailed` | Failed to import vocabularies |
| `vocabWordRequired` | Word is required |
| `vocabMeaningRequired` | Meaning is required |

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|---------|
| RSC | No session | `redirect("/login")` |
| Client — parse | PapaParse error callback | `toast.error(t("csvParseFailed"))` |
| Client — validation | Missing word/meaning | `errors` array populated per row; row highlighted red |
| Client — handleImport | `hasErrors === true` | `toast.error(t("csvFixErrors"))`, early return |
| Client — handleImport | `!res.ok` | `toast.error(t("vocabImportFailed"))` |
| Client — handleImport | Network catch | `toast.error(t("vocabImportFailed"))` |
| Client — handleImport | `finally` | `setImporting(false)` |
| API | Missing topicId/words | 400 response |
| API | Topic not found/wrong owner | 404 response |
| API | Row with empty word/meaning | Skipped silently (server safety net) |

---

## Performance

- **PapaParse** runs synchronously in the browser; large files (1000+ rows) may cause brief UI freeze. Acceptable for vocabulary import scale.
- **Sequential `prisma.vocabulary.create`** in the API: predictable sort order, simpler error handling vs. `createMany`. For 200-word CSV, ~200 ms total at typical DB latency.
- **No re-fetch on component mount:** component receives `topicId` as prop; no initial data load.
- **Template file:** static asset in `/public/templates/` — served by CDN, no server involvement.
- **Preview table:** rendered with plain DOM table, no virtualization. Up to ~1000 rows is acceptable in the browser without scroll performance issues.
