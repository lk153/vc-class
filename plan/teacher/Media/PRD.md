# PRD — Teacher Media Library

**Feature:** Media file management and upload  
**Route:** `src/app/teacher/media/page.tsx`  
**Component:** `src/components/teacher/MediaTable.tsx`  
**Supporting components:** `MediaUploadModal.tsx`, `MediaPicker.tsx`  
**Storage:** `@vercel/blob`  
**Status:** Implemented  

---

## Overview

The Media Library is the centralised repository for all files a teacher uploads for classroom use — images, audio clips, and video files. Teachers can upload multiple files at once, browse and search their library, copy a file URL to clipboard, and delete files they no longer need. The same library is accessible via the `MediaPicker` component inside the `QuestionEditor`, enabling teachers to attach media to test questions without switching pages.

---

## User Stories

| ID | As a teacher I want to… | So that… |
|----|------------------------|----------|
| M1 | See all my uploaded files in a paginated table | I can browse my library without infinite scroll performance issues |
| M2 | Filter files by type (all / images / audio / video) | I can focus on the specific media I need |
| M3 | Search by filename | I can quickly find a specific file |
| M4 | See storage statistics (total files, storage used, counts by type) | I understand my usage at a glance |
| M5 | Upload one or more files via a drag-and-drop modal | I can add new media quickly |
| M6 | Copy a file URL to clipboard | I can paste it into external tools or share with colleagues |
| M7 | Delete a single file I no longer need | I keep my library clean |
| M8 | See a warning if a file is in use by questions before deleting | I don't accidentally break a live exam |
| M9 | Force-delete a file even if it's in use (after confirming) | I can remove obsolete media when I have no other option |
| M10 | Bulk-select multiple files and delete them at once | I can clean up many files efficiently |
| M11 | Preview an image or play audio inline before deciding to delete or copy | I can confirm I have the right file |
| M12 | Upload files from a mobile device using a floating action button | The upload experience works on small screens |

---

## Functional Requirements

### FR-1: Stats Bar
- Three stat cards above the table: **Total Files**, **Storage Used** (formatted as B / KB / MB), **Type Breakdown** (image count / audio count / video count).
- Stats computed from **all** teacher's media (unfiltered by current search/type filter).
- Loading state: frosted overlay + animated bottom bar on each stat card.

### FR-2: Filters & Search
- **Type filter:** dropdown with options: All, Images (`image/`), Audio (`audio/`), Video (`video/`).
- **Search:** debounced text input (400 ms), searches by `fileName` (case-insensitive, `contains` match).
- Changing either filter resets `page` to 1 and clears `selectedIds`.
- Filters sent as query params to `GET /api/teacher/media`.

### FR-3: Media Table
- Columns: checkbox, preview/icon, filename, type badge, size, uploaded date, usage count, actions.
- Row actions: **Copy URL** (clipboard icon), **Delete** (trash icon with per-row `deletingId` spinner).
- File preview on row click: image files open a preview modal; audio files render `<AudioPlayer>`; video type shows a placeholder.
- Type icon colours: image → `#2a14b4`, audio → `#1b6b51`, video → `#7b0020`.

### FR-4: Pagination
- 10 items per page.
- Display "Showing X–Y of Z" text.
- Previous / Next buttons; disabled at boundaries.
- Changing page clears `selectedIds`.

### FR-5: Upload (MediaUploadModal)
- Triggered by "Upload Media" header button (desktop) or floating `cloud_upload` FAB (mobile).
- Drag-and-drop or file picker input.
- Allowed types: `image/png`, `image/jpeg`, `audio/mpeg`, `video/mp4`.
- Limits: max 5 files per batch, max 10 MB per file, max 20 MB total.
- Per-file progress: `pending` → `uploading` → `done` | `error`.
- On all files done: calls `onComplete()` → parent calls `fetchMedia()`.

### FR-6: Single Delete
- `DELETE /api/teacher/media/[id]` (no `force` param).
- If response body `{ error: "media_in_use", usageCount }`: show `window.confirm` with `t("mediaUsedWarning", { count })`.
- If confirmed: re-call with `?force=true`.
- Success: `toast.success(t("mediaDeleted"))`, `fetchMedia()`.

### FR-7: Bulk Delete
- Checkbox column in table; select-all toggles full page selection.
- "Delete Selected" button appears when `selectedIds.size > 0`; shows count.
- Confirmation modal (`ModalOverlay`) before executing.
- `DELETE /api/teacher/media` with `{ ids: string[] }`.
- Success: `toast.success(t("bulkDeleteSuccess", { count }))`.

### FR-8: Copy URL
- `navigator.clipboard.writeText(fileUrl)`.
- `toast.success(t("urlCopied"))`.

### FR-9: MediaPicker (Embedded Use)
- `MediaPicker` component (separate file) is embedded in `QuestionEditor`.
- Renders a compact dropdown showing the teacher's media library.
- Allows selecting a single file; returns `{ fileUrl, fileType }` to parent.
- Does not expose delete or upload; read-only browsing.

### FR-10: Empty State
- When `total === 0` and not loading: show empty state card with `perm_media` icon, `t("noMedia")`, and `t("noMediaDescription")`.
- "Upload your first file" CTA opens `MediaUploadModal`.

---

## Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Auth | `TEACHER` role; all API routes verify session |
| File ownership | `uploadedById` on every media record; API filters by `session.user.id` |
| Storage | `@vercel/blob` for file storage; `del(url)` on delete |
| File security | MIME type checked server-side on upload; no arbitrary type allowed |
| Performance | Paginated API (10/page); stats computed separately from page results |
| Accessibility | Checkbox inputs labelled; action buttons have `title` attributes |
| Mobile | Floating FAB via `ReactDOM.createPortal` to `document.body` (bypasses overflow constraints) |

---

## UI/UX Requirements

- Design system: Intellectual Sanctuary — same tokens as Topics and Topic Detail.
- Stats cards: `bg-white rounded-2xl shadow`, icon on `#e3dfff` bg, bold metric, muted label.
- Type breakdown card: three verticals with dividers; image `#2a14b4`, audio `#1b6b51`, video `#7b0020`.
- Type filter: custom `TypeFilterDropdown` (not native `<select>`) with Material Symbols icons; `expand_more` chevron rotates 180° when open.
- Table: `bg-white rounded-2xl`; row hover `hover:bg-[#fafafe]`; selected row `bg-[#eff4ff]`.
- Delete icon: red on hover `hover:text-[#7b0020] hover:bg-[#ffdada]/30`.
- Loading: `opacity-60` table content; animated `loading-bar` bottom stripe on stat cards.
- Mobile FAB: `fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#2a14b4]`, portal-rendered, hidden on `sm:` breakpoint and above.
- Upload modal: drag-and-drop zone with animated drag-over state; per-file progress bar.

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| File in use by 1+ questions — single delete | Warning `window.confirm` with usage count; force-delete if confirmed |
| Bulk delete includes files in use | Bulk delete route skips in-use files by default; count returned is actually-deleted count |
| No files match current filter/search | Empty rows section (not full empty state); stats still show totals |
| Upload of disallowed type | Client rejects with per-file `hasInvalidType` flag before upload starts |
| Upload exceeds 10 MB per file | Client rejects with `hasOversizedFile` flag |
| Upload batch > 5 files | Client rejects with `tooManyFiles` flag |
| Clipboard API unavailable | `navigator.clipboard.writeText` throws; no fallback (silent error acceptable) |
| Network failure on fetch | `fetchMedia` silently ignores error; UI shows stale data |
| Session expires | Next hard navigation redirects to `/login`; API calls return 401 (unhandled silently) |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Upload success rate | > 98% for valid files under size limits |
| Search response time (debounced) | < 500 ms from keystroke to results (400 ms debounce + < 100 ms API) |
| Delete with in-use warning | 100% of in-use files surface warning before deletion |
| URL copy success rate | > 99% (clipboard API supported in all modern browsers) |
| Page load (client fetch) | Stats + first page of results < 800 ms on production |
