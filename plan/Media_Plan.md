# Plan: Media Page for Teacher Site

## Storage Solution

**Vercel Blob** (free tier — Hobby plan)

| Detail | Value |
|--------|-------|
| Storage | 500MB |
| Setup | `npm install @vercel/blob` + `BLOB_READ_WRITE_TOKEN` env var |
| Public URLs | Automatic (e.g., `https://xxx.public.blob.vercel-storage.com/file.png`) |
| API | `put()`, `del()`, `list()` + client-side `upload()` |
| Extra account | None — uses existing Vercel account |
| Local dev | Works with `BLOB_READ_WRITE_TOKEN` from Vercel dashboard |

---

## 1. Data Model

### New `Media` Model

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| fileName | String | Original file name |
| fileUrl | String | Vercel Blob public URL |
| fileType | String | MIME type (image/png, audio/mpeg, video/mp4) |
| fileSize | Int | Size in bytes |
| uploadedById | FK → User | Teacher who uploaded |
| createdAt | DateTime | Upload timestamp |

```prisma
model Media {
  id           String   @id @default(cuid())
  fileName     String   @map("file_name")
  fileUrl      String   @map("file_url")
  fileType     String   @map("file_type")
  fileSize     Int      @map("file_size")
  uploadedById String   @map("uploaded_by_id")
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("media")
}
```

Add `media Media[]` relation to the `User` model.

---

## 2. Upload Architecture

### Client-Side Upload Pattern (Recommended)

Uses `@vercel/blob/client` `upload()` which uploads **directly from browser to Vercel Blob**, bypassing our API server entirely for the file transfer. This solves:
- No API body size limit issues (Next.js default is 4MB)
- Real upload progress tracking (browser → Blob directly)
- No server memory/CPU overhead for large files

**Flow:**

```
1. Client selects files → validates (type, size, count)
2. Client calls upload() from @vercel/blob/client for each file
   → Browser uploads directly to Vercel Blob (with progress callback)
   → Vercel Blob calls our token handler API to authorize
   → Returns { url } on success
3. Client sends metadata (fileName, fileUrl, fileType, fileSize) to our API
4. Our API saves Media record to DB
```

### Token Handler (Server)

A lightweight API route that Vercel Blob calls to verify the upload is authorized:

```
GET /api/teacher/media/upload → returns upload token
```

This route only validates auth (is teacher?) and returns the token. No file data passes through it.

### Upload Constraints

| Constraint | Value |
|------------|-------|
| Allowed types | `image/png`, `image/jpeg`, `audio/mpeg`, `video/mp4` |
| Max files per upload | 5 |
| Max total size per upload | 20MB |
| Max per file | 10MB |
| File path format | `media/{teacherId}/{timestamp}-{sanitized-filename}` |

### Server-Side Validation

Even though client validates, the token handler and metadata API also validate:
- Auth: user must be TEACHER
- File type: only allowed MIME types
- File count: max 5 per batch
- Storage check: warn if approaching 500MB limit

---

## 3. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/teacher/media` | List teacher's media (paginated, searchable) |
| POST | `/api/teacher/media` | Save media metadata to DB (after client-side upload) |
| GET | `/api/teacher/media/upload` | Vercel Blob token handler (authorizes client uploads) |
| DELETE | `/api/teacher/media/[mediaId]` | Delete media (Vercel Blob + DB) |

### Delete Flow

1. Verify media ownership (`uploadedById === session.user.id`)
2. Delete from Vercel Blob via `del(fileUrl)`
3. Delete `Media` record from DB

---

## 4. Pages & UI

### Media List Page (`/teacher/media`)

- **Header**: Title "Media" + "Upload Media" button
- **Stats row**: Total files, total storage used, breakdown by type (images/audio/video)
- **Search & filter**: Search by filename + filter by type dropdown (All / Images / Audio / Video)
- **Table columns**:
  - Preview (thumbnail for images, type icon for audio/video)
  - File Name
  - Published URL (with copy-to-clipboard button + toast "URL copied")
  - Size (formatted: KB/MB)
  - Created At (formatted date)
  - Actions (delete button)
- **Pagination**: Same style as Student Results page
- **Empty state**: Icon + message + upload button

### Upload Modal (triggered by "Upload Media" button)

- **Drop zone**: Drag & drop area + "Browse files" button
- **File picker**: Accepts `.png`, `.jpg`, `.jpeg`, `.mp3`, `.mp4`
- **Selected files list** (before upload):
  - File name, size, type icon
  - Remove button per file
- **Client-side validation**:
  - Show error if > 5 files selected
  - Show error if total size > 20MB or any single file > 10MB
  - Show error for unsupported file types
- **Upload button**: Disabled until valid files selected
- **Progress** (during upload):
  - Per-file progress bar (real browser→Blob progress via `onUploadProgress`)
  - Per-file status icon: pending → uploading (%) → done (check) / error (x)
  - Overall status text: "Uploading 2 of 5..."
- **Completion**:
  - Success toast with count
  - Auto-close modal
  - Refresh media list
- **Error handling**:
  - If `BLOB_READ_WRITE_TOKEN` not configured → show clear error message
  - If individual file fails → show error on that file, continue others
  - If network error → show retry option

### Responsive

- Table switches to card layout on mobile (same pattern as Student Results)
- Upload modal is full-screen on mobile
- Drop zone works with touch (tap to browse)

---

## 5. File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/app/teacher/media/page.tsx` | Media list page (server component) |
| `src/components/teacher/MediaTable.tsx` | Client component: table + pagination + search/filter |
| `src/components/teacher/MediaUploadModal.tsx` | Upload modal with drag & drop + progress |
| `src/app/api/teacher/media/route.ts` | GET (list) + POST (save metadata) |
| `src/app/api/teacher/media/upload/route.ts` | GET (Vercel Blob token handler for client uploads) |
| `src/app/api/teacher/media/[mediaId]/route.ts` | DELETE (remove from Blob + DB) |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Media` model + `media` relation on `User` |
| `src/components/teacher/Sidebar.tsx` | Add "Media" nav item |
| `next.config.ts` | Add Vercel Blob domain to `images.remotePatterns` |
| `messages/en.json` | Add media-related i18n keys |
| `messages/vi.json` | Add media-related i18n keys |

---

## 6. Sidebar Position

Add **"Media"** nav item after "Practice Tests", before "Student Results":

```
Dashboard → Classes → Students → Topics → Assignments → Practice Tests → Media → Student Results
```

Icon: `perm_media`

---

## 7. Dependencies

```bash
npm install @vercel/blob
```

---

## 8. Environment Variables

```env
# Required — get from Vercel Dashboard > Storage > Create Blob Store
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxx
```

For local development, create a Blob store in Vercel dashboard and copy the token to `.env.local`.

### Missing Token Handling

If `BLOB_READ_WRITE_TOKEN` is not set:
- Token handler API returns 503 with clear error message
- Upload modal shows: "Media storage is not configured. Please contact admin."
- Media list page still works (shows existing records from DB)

---

## 9. Next.js Image Config

Add Vercel Blob domain to `next.config.ts` so `<Image>` can render uploaded images:

```ts
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
    },
  ],
}
```

---

## 10. UI Design

Follow **Aura Lexicon** design system from `design/` folder:
- Color palette, typography (Newsreader / Manrope)
- Material Symbols Outlined icons
- Ambient-shadow card styles
- Glassmorphic modal with backdrop blur
- Responsive mobile-first layout
- Progress bar uses primary color gradient (`#2a14b4`)
- Image thumbnails: 40x40 rounded-lg with object-cover
- Copy button: uses `navigator.clipboard.writeText()` + sonner toast "URL copied"
