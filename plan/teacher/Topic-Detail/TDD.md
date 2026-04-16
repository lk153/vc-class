# TDD — Teacher Topic Detail (Vocabulary Manager)

**Feature:** Vocabulary management for a single topic  
**Route:** `src/app/teacher/topics/[topicId]/page.tsx`  
**Component:** `src/components/teacher/VocabularyManager.tsx`  

---

## Architecture

```
TeacherTopicDetailPage (Server Component)
│  Auth guard → redirect("/login")
│  prisma.topic.findUnique (with language + vocabulary)
│  notFound() if null
│
└─ Header section (RSC JSX — topic title, description, language badge)
└─ VocabularyManager (Client Component)  "use client"
   │  useState: modal (ModalState union), saving
   │
   ├─ AddWordMenu (sub-component, CC)
   │   useState: open (dropdown)
   │   useRef: ref (click-outside detection)
   │   useEffect: mousedown listener
   │
   ├─ Vocabulary Grid
   │   div[onClick=setModal edit] × vocabulary.length
   │
   └─ ModalOverlay
       └─ Vocab Form (add or edit depending on modal.mode)
```

---

## Route & Data Flow

```
Browser GET /teacher/topics/[topicId]
  → Next.js RSC → TeacherTopicDetailPage
    → auth()
    → prisma.topic.findUnique({ where:{id,createdById}, include:{language, vocabulary} })
    → notFound() | render
  → hydrate VocabularyManager

Add Word flow:
  User opens modal → fills form → submit
    → handleAdd() → fetch POST /api/teacher/vocabulary
      → /app/api/teacher/vocabulary/route.ts
        → auth() + topic ownership check
        → prisma.vocabulary.create(...)
        → 201 JSON
    → toast.success → setModal({mode:"closed"}) → router.refresh()

Edit Word flow:
  User clicks vocab card → setModal({mode:"edit", vocab})
    → modal pre-fills fields
    → submit → handleUpdate(e, vocabId) → fetch PUT /api/teacher/vocabulary
      → prisma.vocabulary.update(...)
    → toast.success → router.refresh()

Delete Word flow:
  User clicks delete icon (stopPropagation) → handleDelete(vocabId)
    → fetch DELETE /api/teacher/vocabulary { id }
    → toast.success → router.refresh()

Import navigation:
  User clicks AddWordMenu → Import
    → router.push(`/teacher/topics/${topicId}/import-vocab`)
```

---

## Component Tree

```
TeacherTopicDetailPage                    RSC
├── Header JSX
│   ├── h1 topic.title
│   ├── p topic.description
│   └── span language badge
└── VocabularyManager                     CC  props: { topicId, vocabulary }
    ├── SectionHeader
    │   ├── Icon + title + word count
    │   └── AddWordMenu                   CC (internal)
    │       ├── trigger Button
    │       └── Dropdown AnimatePresence
    │           ├── Button "Manual"       → setModal({mode:"add"})
    │           └── Button "Import"       → router.push(import-vocab)
    ├── VocabGrid div.grid
    │   └── VocabCard × N                onClick → setModal({mode:"edit", vocab})
    │       ├── word + type
    │       ├── pronunciation
    │       ├── meaning
    │       ├── example
    │       └── ActionIcons (hover)
    │           ├── EditIcon
    │           └── DeleteIcon            onClick(stop) → handleDelete
    └── ModalOverlay                      open={modal.mode!=="closed"}
        └── VocabForm
            ├── CloseButton
            ├── ModalHeader (icon + title)
            └── form[onSubmit]
                ├── input[name=word]
                ├── Grid: input[type] + input[pronunciation]
                ├── textarea[name=meaning]
                ├── input[name=example]
                └── Actions: Cancel + Save
```

---

## Database Queries

### Topic + Vocabulary Fetch
```ts
prisma.topic.findUnique({
  where: { id: topicId, createdById: session.user.id },
  include: {
    language: true,
    vocabulary: { orderBy: { sortOrder: "asc" } },
  },
})
```

### Vocabulary Create
```ts
prisma.vocabulary.create({
  data: { topicId, word, type, pronunciation, meaning, example, sortOrder },
})
```

### Vocabulary Update
```ts
// Ownership verified via join
prisma.vocabulary.update({ where: { id }, data: { word, type, pronunciation, meaning, example } })
```

### Vocabulary Delete
```ts
// Ownership verified via join
prisma.vocabulary.delete({ where: { id } })
```

### Ownership check pattern (API)
```ts
const vocab = await prisma.vocabulary.findUnique({
  where: { id },
  include: { topic: { select: { createdById: true } } },
})
if (!vocab || vocab.topic.createdById !== session.user.id) return 404
```

---

## API Endpoints

### POST /api/teacher/vocabulary
- **Body:** `{ topicId, word, type?, pronunciation?, meaning, example?, sortOrder }`
- **Auth:** session + `role=TEACHER` + topic ownership check
- **Response 201:** created `Vocabulary` record
- **Response 400:** missing required fields
- **Response 401/404:** auth/ownership failure

### PUT /api/teacher/vocabulary
- **Body:** `{ id, word, type?, pronunciation?, meaning, example? }`
- **Auth:** session + `role=TEACHER` + vocab-via-topic ownership check
- **Response 200:** updated `Vocabulary` record

### DELETE /api/teacher/vocabulary
- **Body:** `{ id }`
- **Auth:** session + `role=TEACHER` + vocab-via-topic ownership check
- **Response 200:** `{ success: true }`

---

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `modal` | `ModalState` union | `{mode:"closed"}` / `{mode:"add"}` / `{mode:"edit", vocab:Vocab}` |
| `saving` | `boolean` | Disables Save button, shows progress_activity spinner |

`ModalState` discriminated union avoids separate `isOpen` + `editingVocab` booleans.

No global store. Server state refreshed via `router.refresh()` after each mutation.

---

## Styling

| Element | Classes |
|---------|---------|
| Section header icon | `w-10 h-10 rounded-xl bg-[#e3dfff]` |
| Vocab card | `bg-white rounded-2xl border border-[#c7c4d7]/20 p-5` |
| Vocab card hover | `hover:border-[#2a14b4]/15 hover:bg-[#f5f3ff]` |
| Word text | `font-body font-bold text-[#121c2a] text-base` |
| Type badge | `text-xs font-body text-[#2a14b4]/60 italic` |
| Pronunciation | `text-xs font-body text-[#777586] italic` |
| Meaning | `text-sm text-[#464554] font-body leading-relaxed` |
| Example | `text-xs text-[#777586] font-body` with `#2a14b4/60` quote marks |
| Action icons | `opacity-0 group-hover:opacity-100 transition-opacity` |
| Delete icon hover | `hover:text-[#7b0020] hover:bg-[#ffdada]/40` |
| Form input | `rounded-xl border border-[#c7c4d7]/30 bg-[#f8f9ff] focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4]` |
| Modal background | `bg-[#f8f9ff] rounded-2xl` |
| Add dropdown | `bg-white rounded-2xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)]` |

Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`  
Dropdown animation: `motion/react` — `initial:{opacity:0,scale:0.9,y:-4}` → `animate:{opacity:1,scale:1,y:0}` spring.

---

## i18n Keys (`teacher` namespace)

| Key | EN value |
|-----|---------|
| `vocabulary` | Vocabulary |
| `addWord` | Add Word |
| `addNewWord` | Add New Word |
| `editWord` | Edit Word |
| `word` | Word |
| `meaning` | Meaning |
| `example` | Example |
| `wordsCount` | words |
| `manual` | Manual |
| `import` | Import |
| `wordAdded` | Word added |
| `wordAddFailed` | Failed to add word |
| `wordUpdated` | Word updated |
| `wordUpdateFailed` | Failed to update word |
| `wordDeleted` | Word deleted |
| `wordDeleteFailed` | Failed to delete word |

`common` namespace: `cancel`, `save`

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|---------|
| RSC | No session | `redirect("/login")` |
| RSC | Topic not found / wrong owner | `notFound()` → 404 page |
| RSC | DB error | Unhandled (error boundary) |
| Client — handleAdd | `!res.ok` | `toast.error(t("wordAddFailed"))` |
| Client — handleAdd | Network catch | `toast.error(t("wordAddFailed"))` |
| Client — handleUpdate | `!res.ok` | `toast.error(t("wordUpdateFailed"))` |
| Client — handleDelete | `!res.ok` | `toast.error(t("wordDeleteFailed"))` |
| All handlers | `finally` | `setSaving(false)` |
| API | Missing required fields | 400 JSON error |
| API | Wrong ownership | 404 JSON error |

---

## Performance

- **Single DB query** on page load: one `findUnique` with nested `include` — no N+1.
- **Vocab list:** rendered in one pass, no virtualization needed for expected list sizes (< 200 items).
- **Modal re-renders:** controlled by `modal` state; `AnimatePresence` unmounts modal DOM when closed.
- **refresh():** only re-runs RSC; no full page reload; hydration diff is minimal (one vocab item changed).
- **AddWordMenu** uses a `mousedown` listener (not `click`) to avoid event-order issues with portal modals.
- **`motion/react`** spring for dropdown: damping 25, stiffness 400 — snappy, no layout thrash.
