# TDD — Teacher Topics Listing

**Feature:** Topics listing and creation  
**Route:** `src/app/teacher/topics/page.tsx`  
**Component:** `src/components/teacher/TopicList.tsx`  

---

## Architecture

```
TeacherTopicsPage (Server Component)
│  Auth guard → redirect("/login")
│  Parallel DB: prisma.topic.findMany + prisma.language.findMany
│  Maps raw Prisma rows → typed Topic[] + Language[] props
│
└─ TopicList (Client Component)  "use client"
   │  useState: showCreate, creating, filterLangId
   │
   ├─ Create Form (conditional, inline)
   │   form[onSubmit=handleCreate] → fetch POST /api/teacher/topics
   │
   ├─ Language Filter pills
   │   Button[] — client-side filter only
   │
   └─ Topic Grid
       ├─ Link[] → /teacher/topics/[topicId]  (one per filtered topic)
       └─ Button (dashed add placeholder) → setShowCreate(true)
```

---

## Route & Data Flow

```
Browser GET /teacher/topics
  → Next.js App Router → TeacherTopicsPage (RSC)
    → auth() [NextAuth]
    → prisma: topic.findMany({ where:{createdById}, include:{language,_count} })
    → prisma: language.findMany({ orderBy:{name:"asc"} })
    → render TopicList with serialized props
  → hydrate TopicList client component

User clicks Create Topic → handleCreate()
  → fetch POST /api/teacher/topics
    → /app/api/teacher/topics/route.ts  [POST handler]
      → auth() check (role === "TEACHER")
      → prisma.topic.create({ data:{title,description,languageId,createdById} })
      → return 201 JSON
  → toast.success / router.refresh()
```

---

## Component Tree

```
TeacherTopicsPage                         RSC
└── TopicList                             CC  props: { topics, languages, teacherId }
    ├── CreateForm (conditional)
    │   ├── input[name=title]
    │   ├── select[name=languageId]
    │   └── textarea[name=description]
    ├── FilterPills
    │   ├── button "All"                  onClick → setFilterLangId(null)
    │   └── button[lang.name] × N         onClick → setFilterLangId(lang.id)
    └── TopicGrid
        ├── Link[href=/teacher/topics/id] × filteredTopics.length
        │   ├── Icon (menu_book)
        │   ├── LanguageBadge
        │   ├── h3 title
        │   ├── p description (line-clamp-2)
        │   └── Stats row (vocabCount, assignmentCount)
        └── AddPlaceholderButton          onClick → setShowCreate(true)
```

---

## Database Queries

### Topic List
```ts
prisma.topic.findMany({
  where: { createdById: session.user.id },
  include: {
    language: true,
    _count: { select: { vocabulary: true, topicAssignments: true } },
  },
  orderBy: { createdAt: "desc" },
})
// Maps to: { id, title, description, languageName, languageId, vocabCount, assignmentCount }
```

### Language Dropdown
```ts
prisma.language.findMany({ orderBy: { name: "asc" } })
// Maps to: { id, code, name }
```

### Topic Create (API route)
```ts
prisma.topic.create({
  data: { title, description: description || null, languageId, createdById: session.user.id },
})
```

---

## API Endpoints

### POST /api/teacher/topics
- **File:** `src/app/api/teacher/topics/route.ts`
- **Auth:** Session required, `role === "TEACHER"`
- **Body:** `{ title: string, description?: string, languageId: string }`
- **Response 201:** `{ id, title, description, languageId, createdById, createdAt }`
- **Response 400:** `{ error: "Title and language required" }` — when either field is missing
- **Response 401:** `{ error: "Unauthorized" }` — invalid session or wrong role

> PUT and DELETE also exist on this route for inline topic title/description editing (not exposed in the listing UI but used by future detail-page header editing).

---

## State Management

All state is local to `TopicList` (no global store, no URL params for filters):

| State var | Type | Purpose |
|-----------|------|---------|
| `showCreate` | `boolean` | Toggle inline create form |
| `creating` | `boolean` | Disable submit button, show spinner |
| `filterLangId` | `string \| null` | Client-side language filter; `null` = show all |

Derived:
- `filteredTopics` — `filterLangId ? topics.filter(…) : topics`

Server state refresh: `router.refresh()` (Next.js App Router) re-runs the RSC and streams fresh props.

---

## Styling

| Token | Value |
|-------|-------|
| Brand primary | `#2a14b4` |
| Primary hover | `#4338ca` |
| Card surface | `#fff` |
| Card shadow | `0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)` |
| Card hover shadow | `0_4px_8px_3px_rgba(0,0,0,0.08),0_1px_3px_0_rgba(0,0,0,0.1)` |
| Card hover lift | `hover:-translate-y-0.5` |
| Input bg | `bg-[#d9e3f6]/30` |
| Label style | `text-[10px] uppercase tracking-widest text-[#777586] font-bold` |
| Language badge | `bg-[#a6f2d1]/40 text-[#1b6b51]` |
| Icon bg | `bg-[#e3dfff]` |
| Icon colour | `text-[#2a14b4]` |
| Stat muted | `text-[#777586] text-xs` |
| Placeholder card | `border-dashed border-[#c7c4d7]/50` → hover `border-[#2a14b4]/20` |
| Submit button | `bg-[#2a14b4] rounded-full px-6 py-2.5 shadow-lg shadow-[#2a14b4]/20` |

Grid breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8`

---

## i18n Keys (`teacher` namespace)

| Key | EN value |
|-----|---------|
| `topics` | Topics |
| `topicsSubtitle` | Curate and manage your vocabulary collections. |
| `createNewTopic` | Create New Topic |
| `topicTitle` | Title |
| `topicTitlePlaceholder` | Enter topic title… |
| `topicLanguage` | Language |
| `topicSelectLanguage` | Select language… |
| `topicDescription` | Description |
| `topicDescriptionPlaceholder` | Brief description of the topic… |
| `topicCreated` | Topic created |
| `topicCreateFailed` | Failed to create topic |
| `wordsCount` | words |
| `learnersCount` | learners |

`common` namespace: `cancel`, `create`, `all`, `filter`  
`tLang(t, lang.name)` — resolves language display name via `src/lib/i18n/tLang.ts`

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|---------|
| Server component | No session | `redirect("/login")` |
| Server component | DB error | Unhandled (Next.js error boundary) |
| Client — handleCreate | `res.ok === false` | `toast.error(t("topicCreateFailed"))` |
| Client — handleCreate | Network `catch` | `toast.error(t("topicCreateFailed"))` |
| Client — handleCreate | `finally` | Always `setCreating(false)` |
| Browser | Empty title or no language | Native `required` blocks submission |

---

## Performance

- **Server:** `Promise.all` for topics + languages — single round-trip, no waterfall.
- **Client filter:** Pure JS array filter on already-fetched `topics` prop — no re-fetch.
- **Revalidation:** `router.refresh()` triggers a server re-render; only the RSC re-executes, no full page reload.
- **Bundle:** `TopicList` is the only CC; form, filter, and grid share one component boundary.
- **Images:** No images in topic cards — icon uses Material Symbols font (already loaded globally).
