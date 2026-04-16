# TDD — Teacher Media Library

**Feature:** Media file management and upload  
**Route:** `src/app/teacher/media/page.tsx`  
**Component:** `src/components/teacher/MediaTable.tsx`  
**Supporting:** `MediaUploadModal.tsx`, `MediaPicker.tsx`  
**Storage:** `@vercel/blob`  

---

## Architecture

```
MediaPage (Server Component)
│  Auth guard → redirect("/login")
│  No DB query — all data fetched client-side
│
└─ MediaTable (Client Component)  "use client"
   │  useState: data, loading, page, search, typeFilter,
   │            debouncedSearch, showUpload, deletingId,
   │            selectedIds, showDeleteConfirm, bulkDeleting,
   │            previewItem
   │  useEffect[search] → debounce timer → setDebouncedSearch
   │  useCallback fetchMedia → GET /api/teacher/media?params
   │  useEffect[fetchMedia] → fetchMedia()
   │  useEffect[debouncedSearch, typeFilter] → setPage(1), clearSelection
   │  useEffect[page] → clearSelection
   │
   ├─ StatCards × 3
   ├─ TypeFilterDropdown + SearchInput + UploadButton
   ├─ BulkActionBar (visible when selectedIds.size > 0)
   ├─ MediaTableBody (paginated rows)
   ├─ Pagination controls
   ├─ MediaUploadModal (conditional: showUpload)
   ├─ PreviewModal (conditional: previewItem !== null)
   ├─ BulkDeleteConfirmModal (conditional: showDeleteConfirm)
   └─ MobileUploadButton (ReactDOM.createPortal → document.body)

MediaUploadModal (Client Component)  "use client"
   useState: entries, uploading, dragOver
   useCallback: handleFiles (type/size validation)
   Per-file: fetch POST /api/teacher/media/upload

MediaPicker (Client Component)  "use client"
   Used by: QuestionEditor
   Read-only browsing of media library
   Returns: { fileUrl, fileType } to parent via onSelect callback
```

---

## Route & Data Flow

```
Browser GET /teacher/media
  → Next.js RSC → MediaPage
    → auth()
    → render MediaTable (no props — client fetches own data)

On mount / filter change:
  MediaTable.fetchMedia()
    → GET /api/teacher/media?page=N&search=S&type=T
      → /app/api/teacher/media/route.ts [GET]
        → auth()
        → prisma.media.findMany (paginated, filtered, with uploadedBy)
        → prisma.media.count (filtered)
        → prisma.media.findMany (all, unfiltered — for stats)
        → compute usageCount per file via prisma.question.findMany
        → return ApiResponse { results, total, page, totalPages, stats }
    → setData(json)

Upload flow:
  Teacher clicks Upload button or FAB
    → setShowUpload(true) → MediaUploadModal renders
    → Teacher drops/selects files
    → handleFiles validates types + sizes
    → For each valid file:
        → fetch POST /api/teacher/media/upload  (form data)
          → /app/api/teacher/media/upload/route.ts
            → auth()
            → put(fileName, file, { access:"public" })  [@vercel/blob]
            → prisma.media.create(...)
            → return { fileName, fileUrl, fileType, fileSize }
    → onComplete() → parent calls fetchMedia()

Delete flow (single):
  handleDelete(id)
    → fetch DELETE /api/teacher/media/[id]
      → /app/api/teacher/media/[id]/route.ts [DELETE]
        → auth() + ownership check
        → query usageCount (via prisma.question.count on media URL fields)
        → if usageCount > 0 && !force: return 409 { error:"media_in_use", usageCount }
        → del(fileUrl)  [@vercel/blob]
        → prisma.media.delete(...)
        → return 200
    → if 409: window.confirm → re-call with ?force=true
    → fetchMedia()

Bulk delete flow:
  handleBulkDelete()
    → fetch DELETE /api/teacher/media  body:{ ids }
      → /app/api/teacher/media/route.ts [DELETE]
        → auth()
        → for each id: verify ownership, check in-use (skip if in use), del + prisma.delete
        → return { deleted: N }
    → toast.success → fetchMedia()
```

---

## Component Tree

```
MediaPage                                 RSC
└── MediaTable                            CC
    ├── StatsBar
    │   ├── StatCard "Total Files"        (stats.totalFiles)
    │   ├── StatCard "Storage Used"       (formatSize(stats.totalSize))
    │   └── StatCard "By Type"            (imageCount / audioCount / videoCount)
    ├── FiltersRow
    │   ├── TypeFilterDropdown            CC (internal, useRef click-outside)
    │   ├── SearchInput                   input[type=text] debounced
    │   └── UploadButton                  onClick → setShowUpload(true)  (hidden sm:block)
    ├── BulkActionBar                     visible when selectedIds.size > 0
    │   ├── "{N} selected" text
    │   └── DeleteSelectedButton          onClick → setShowDeleteConfirm(true)
    ├── TableCard  div.bg-white.rounded-2xl
    │   ├── thead
    │   │   └── th: checkbox-all, file, type, size, date, usage, actions
    │   ├── tbody (loading: opacity-60)
    │   │   └── tr × results.length
    │   │       ├── td checkbox
    │   │       ├── td preview (thumbnail|icon) + filename   onClick → setPreviewItem
    │   │       ├── td type badge
    │   │       ├── td size (formatSize)
    │   │       ├── td createdAt (locale date)
    │   │       ├── td usageCount badge
    │   │       └── td actions: CopyURL button + DeleteButton
    │   └── EmptyState (total===0 && !loading)
    ├── Pagination  (startItem–endItem of total)
    │   ├── PrevButton disabled={page===1}
    │   └── NextButton disabled={page===totalPages}
    ├── MediaUploadModal                  CC (conditional: showUpload)
    │   onClose → setShowUpload(false)
    │   onComplete → fetchMedia()
    ├── PreviewModal ModalOverlay         (conditional: previewItem)
    │   ├── img (image types)
    │   └── AudioPlayer (audio types)
    ├── BulkDeleteConfirmModal ModalOverlay (conditional: showDeleteConfirm)
    └── MobileUploadButton               portal → document.body  (sm:hidden)
```

---

## Database Queries

### GET /api/teacher/media — paginated results
```ts
// Filtered page
prisma.media.findMany({
  where: {
    uploadedById: session.user.id,
    ...(search && { fileName: { contains: search, mode: "insensitive" } }),
    ...(type && { fileType: { startsWith: type } }),
  },
  include: { uploadedBy: { select: { email: true } } },
  orderBy: { createdAt: "desc" },
  skip: (page - 1) * 10,
  take: 10,
})

// Filtered count
prisma.media.count({ where: filteredWhere })

// All media for stats (unfiltered)
prisma.media.findMany({
  where: { uploadedById: session.user.id },
  select: { fileType: true, fileSize: true },
})
```

### Usage count per file
```ts
// For each fileUrl in current page
prisma.question.findMany({
  where: {
    OR: fileUrls.flatMap(url => [
      { contentMediaUrl: url },
      { answer1MediaUrl: url },
      { answer2MediaUrl: url },
      { answer3MediaUrl: url },
      { answer4MediaUrl: url },
      { explanationMediaUrl: url },
    ]),
  },
  select: { contentMediaUrl: true, answer1MediaUrl: true, ... },
})
// Group by URL to produce usageCount map
```

### DELETE /api/teacher/media/[id]
```ts
// Ownership
const media = await prisma.media.findUnique({ where: { id } })
if (!media || media.uploadedById !== session.user.id) return 404

// Usage check
const questions = await prisma.question.count({
  where: { OR: [{ contentMediaUrl: media.fileUrl }, ...] }
})
if (questions > 0 && !force) return 409 { error: "media_in_use", usageCount: questions }

// Blob + DB delete
await del(media.fileUrl)
await prisma.media.delete({ where: { id } })
```

---

## API Endpoints

### GET /api/teacher/media
- **Params:** `page`, `search`, `type`
- **Response:** `{ results: MediaItem[], total, page, totalPages, stats: Stats }`
- **Stats shape:** `{ totalFiles, totalSize, imageCount, audioCount, videoCount }`

### POST /api/teacher/media/upload
- **Body:** `FormData` with file field
- **Action:** `put(fileName, stream, { access: "public" })` → `prisma.media.create`
- **Response 201:** `{ fileName, fileUrl, fileType, fileSize }`
- **Response 400:** unsupported file type or missing file
- **Response 401:** unauthorized

### DELETE /api/teacher/media/[id]
- **Query:** `?force=true` to bypass in-use guard
- **Response 200:** `{ success: true }`
- **Response 409:** `{ error: "media_in_use", usageCount: N }`
- **Response 401/404:** auth or ownership failure

### DELETE /api/teacher/media (bulk)
- **Body:** `{ ids: string[] }`
- **Action:** per-id ownership check + in-use skip + blob del + DB delete
- **Response 200:** `{ deleted: N }` — count of files actually deleted

---

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `data` | `ApiResponse \| null` | Full API response for current page/filter |
| `loading` | `boolean` | Table opacity + stat card overlays |
| `page` | `number` | Current pagination page |
| `search` | `string` | Raw search input value |
| `debouncedSearch` | `string` | Debounced (400 ms) value sent to API |
| `typeFilter` | `string` | Empty = all; `"image/"` / `"audio/"` / `"video/"` |
| `showUpload` | `boolean` | Toggle MediaUploadModal |
| `deletingId` | `string \| null` | Tracks in-progress single delete |
| `selectedIds` | `Set<string>` | Bulk selection state (immutably updated) |
| `showDeleteConfirm` | `boolean` | Toggle bulk delete confirmation modal |
| `bulkDeleting` | `boolean` | Disables bulk delete button, shows spinner |
| `previewItem` | `MediaItem \| null` | Item being previewed in modal |

Derived:
- `results = data?.results || []`
- `total`, `totalPages`, `stats` from `data`
- `allSelected = results.length > 0 && selectedIds.size === results.length`
- `startItem`, `endItem` for pagination label

No global store. `fetchMedia` is a `useCallback` with `[page, debouncedSearch, typeFilter]` deps.

---

## Styling

| Element | Classes |
|---------|---------|
| Stat card | `bg-white rounded-2xl shadow-[0_1px_3px_1px…] p-5 overflow-hidden relative` |
| Stat loading overlay | `absolute inset-0 bg-white/60 backdrop-blur-[1px]` |
| Stat loading bar | `absolute bottom-0 h-[3px] bg-[#2a14b4] animate-[loading-bar_1.5s_ease-in-out_infinite]` |
| Filter row | `flex items-center gap-3 flex-wrap mb-4` |
| Type filter button | `px-4 py-2.5 bg-[#d9e3f6]/50 rounded-full flex items-center gap-2` |
| Search input | `pl-9 pr-4 py-2.5 bg-[#d9e3f6]/50 rounded-full text-sm` |
| Upload button | `bg-[#2a14b4] text-white px-5 py-2.5 rounded-full font-bold shadow-lg` |
| Table row hover | `hover:bg-[#fafafe]` |
| Table row selected | `bg-[#eff4ff]` |
| Type icon: image | `text-[#2a14b4]` |
| Type icon: audio | `text-[#1b6b51]` |
| Type icon: video | `text-[#7b0020]` |
| Delete button hover | `hover:text-[#7b0020] hover:bg-[#ffdada]/30 rounded-lg` |
| Table opacity loading | `opacity-60 transition-opacity` |
| Mobile FAB | `fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[#2a14b4] shadow-lg shadow-[#2a14b4]/30` |
| Pagination button | `px-3 py-2 rounded-lg bg-white border border-[#c7c4d7]/20 text-sm disabled:opacity-40` |

---

## i18n Keys (`teacher` namespace)

| Key | EN value |
|-----|---------|
| `media` | Media |
| `mediaDescription` | Manage your media files for classroom use. |
| `uploadMedia` | Upload Media |
| `totalFiles` | Total Files |
| `storageUsed` | Storage Used |
| `images` | Images |
| `audio` | Audio |
| `videos` | Videos |
| `noMedia` | No media files yet |
| `noMediaDescription` | Upload your first media file to get started. |
| `deleteMedia` | Delete |
| `bulkDeleteMedia` | Delete Selected |
| `mediaDeleted` | Media deleted |
| `mediaDeleteFailed` | Failed to delete |
| `mediaUsedWarning` | This file is used in {count} question(s). Deleting it will break those questions. |
| `urlCopied` | URL copied to clipboard |
| `bulkDeleteSuccess` | {count} file(s) deleted |
| `bulkDeleteFailed` | Failed to delete files |
| `mediaLibrary` | Media Library |

`common` namespace: `cancel`, `confirm`, `all`, `filter`, `search`

---

## Error Handling

| Layer | Error | Handling |
|-------|-------|---------|
| RSC | No session | `redirect("/login")` |
| Client — fetchMedia | Network/non-ok | Silently ignored; stale data remains |
| Client — handleDelete | 409 in-use | `window.confirm` with count; re-call with `force=true` |
| Client — handleDelete | Other non-ok | `toast.error(t("mediaDeleteFailed"))` |
| Client — handleDelete | Network catch | `toast.error(t("mediaDeleteFailed"))` |
| Client — handleDelete | `finally` | `setDeletingId(null)` |
| Client — handleBulkDelete | Non-ok | `toast.error(t("bulkDeleteFailed"))` |
| Client — handleBulkDelete | Network catch | `toast.error(t("bulkDeleteFailed"))` |
| Client — handleBulkDelete | `finally` | `setBulkDeleting(false)` |
| Client — copyUrl | Clipboard throws | Silent (no fallback) |
| Upload modal — per file | Invalid type | Per-file `hasInvalidType` flag; file listed as error |
| Upload modal — per file | Oversized | Per-file `hasOversizedFile` flag |
| Upload modal — per file | Server error | Per-file `status: "error"` with error message |
| API — GET | DB error | 500 (unhandled, triggers error boundary) |
| API — DELETE | `del()` Blob error | Unhandled; DB record may remain orphaned |

---

## Performance

- **Paginated API:** 10 items per page; avoids loading entire media library into memory.
- **Stats unfiltered:** computed from a separate `select:{fileType,fileSize}` query — minimal data transfer.
- **Usage count:** single `prisma.question.findMany` across all URL fields for the current page's files — batched, not per-file N+1.
- **Debounce:** 400 ms on search input prevents a request per keystroke.
- **`useCallback` + `useEffect` deps:** `fetchMedia` only re-runs when `page`, `debouncedSearch`, or `typeFilter` change.
- **Mobile FAB:** `ReactDOM.createPortal` to `document.body` avoids `overflow:hidden` clipping from table container.
- **`@vercel/blob` CDN:** uploaded files served from Vercel's global edge network; no origin hit for asset delivery.
- **Table loading opacity:** `opacity-60` on table body during re-fetch avoids full skeleton re-render.
- **`TypeFilterDropdown`:** custom CC with `useRef` + `mousedown` listener — avoids native `<select>` styling limitations; closes correctly even when portal modals are open.
