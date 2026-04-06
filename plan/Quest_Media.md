# Plan: Rich Media Questions for Practice Tests

## 1. Overview

Enhance the practice test system to support **images, audio, and video** on both question content and answer options, with a polished student experience and powerful teacher management tools.

### Goals

- Teachers can attach media (image/audio/video) to any question's content and answers
- Teachers have professional management tools: question bank, bulk operations, analytics, test preview, scheduling
- Students experience a gamified practice session with animations, feedback, streaks, and media
- Existing text-only questions continue to work without changes (fully backward-compatible)

### Non-Goals (Deferred to v2)

- Pronunciation challenge with voice recording
- Multiple media per question content
- Drag-and-drop or hotspot question types
- ZIP-based CSV import with bundled media files

---

## 2. User Stories

### Teacher Stories

| # | Story | Priority |
|---|-------|----------|
| T1 | Attach image/audio/video to a question content | Must |
| T2 | Use images or audio as answer options | Must |
| T3 | Pick media from existing Media Library in question editor | Must |
| T4 | Import questions with media via CSV | Must |
| T5 | Set difficulty level (easy/medium/hard) per question | Must |
| T6 | Add answer explanations for learning reinforcement | Must |
| T7 | Configure practice/test mode per test | Must |
| T8 | Preview test as student ("Take as Student") | Must |
| T9 | Duplicate an entire test with all questions | Must |
| T10 | Bulk edit questions (timer, difficulty, delete) | Must |
| T11 | See per-question analytics (success rate, avg time, common wrong answer) | Must |
| T12 | See media usage tracker (which files used in which questions) | Must |
| T13 | Draft/Published test status (students only see published) | Must |
| T14 | Reorder questions via drag-and-drop | Must |
| T15 | Search and filter questions by type, difficulty, media | Must |
| T16 | Schedule test availability (start/end dates) | Nice |
| T17 | Batch media replace across all referencing questions | Nice |
| T18 | Upload new media directly from question editor | Nice |
| T19 | Duplicate individual question | Nice |
| T20 | Auto-suggest difficulty based on student performance data | Nice |

### Student Stories

| # | Story | Priority |
|---|-------|----------|
| S1 | See images, play audio/video inline in questions | Must |
| S2 | Select image/audio-based answers on visual grid | Must |
| S3 | Animated feedback (correct/incorrect) with sound effects | Must |
| S4 | Streak counter for consecutive correct answers | Must |
| S5 | Post-question review with explanation and media replay | Must |
| S6 | Celebratory results screen with confetti and review gallery | Must |
| S7 | Keyboard shortcuts on desktop (1/2/3/4, Space, Enter) | Must |
| S8 | Media loads fast, timer waits until ready | Must |
| S9 | Resume practice session if accidentally closed | Nice |
| S10 | Bookmark difficult questions for later review | Nice |
| S11 | Long-press image answers to preview larger on mobile | Nice |

---

## 3. Data Model Changes

### 3.1 Modified `Question` Model

```prisma
model Question {
  // ... existing fields ...

  // ── Media on question content ──
  contentMediaUrl  String?  @map("content_media_url")
  contentMediaType String?  @map("content_media_type")  // "image" | "audio" | "video"

  // ── Media on each answer option ──
  answer1MediaUrl  String?  @map("answer_1_media_url")
  answer1MediaType String?  @map("answer_1_media_type")  // "image" | "audio"
  answer2MediaUrl  String?  @map("answer_2_media_url")
  answer2MediaType String?  @map("answer_2_media_type")
  answer3MediaUrl  String?  @map("answer_3_media_url")
  answer3MediaType String?  @map("answer_3_media_type")
  answer4MediaUrl  String?  @map("answer_4_media_url")
  answer4MediaType String?  @map("answer_4_media_type")

  // ── Enhancements ──
  difficulty            Int      @default(1)               // 1=easy, 2=medium, 3=hard
  explanation           String?                            // shown after answering
  explanationMediaUrl   String?  @map("explanation_media_url")
  explanationMediaType  String?  @map("explanation_media_type")
  audioPlayLimit        Int?     @map("audio_play_limit")  // null=unlimited

  bookmarks  QuestionBookmark[]
}
```

### 3.2 Modified `PracticeTest` Model

```prisma
model PracticeTest {
  // ... existing fields ...

  // ── Test configuration ──
  status            String   @default("draft")   // "draft" | "published" | "archived"
  mode              String   @default("test")    // "practice" | "test"
  shuffleAnswers    Boolean  @default(false)      @map("shuffle_answers")
  showReviewMoment  Boolean  @default(true)       @map("show_review_moment")
  availableFrom     DateTime?                     @map("available_from")
  availableTo       DateTime?                     @map("available_to")
  updatedAt         DateTime @updatedAt           @map("updated_at")
}
```

### 3.3 Modified `StudentAnswer` Model

```prisma
model StudentAnswer {
  // ... existing fields ...
  timeSpent  Int?  @map("time_spent")  // seconds spent on this question
}
```

### 3.4 New `QuestionBookmark` Model

```prisma
model QuestionBookmark {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId String   @map("question_id")
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([userId, questionId])
  @@map("question_bookmarks")
}
```

### 3.5 Migration SQL

```sql
-- questions: media + enhancements
ALTER TABLE "questions"
  ADD COLUMN "content_media_url" TEXT, ADD COLUMN "content_media_type" TEXT,
  ADD COLUMN "answer_1_media_url" TEXT, ADD COLUMN "answer_1_media_type" TEXT,
  ADD COLUMN "answer_2_media_url" TEXT, ADD COLUMN "answer_2_media_type" TEXT,
  ADD COLUMN "answer_3_media_url" TEXT, ADD COLUMN "answer_3_media_type" TEXT,
  ADD COLUMN "answer_4_media_url" TEXT, ADD COLUMN "answer_4_media_type" TEXT,
  ADD COLUMN "difficulty" INT NOT NULL DEFAULT 1,
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "explanation_media_url" TEXT, ADD COLUMN "explanation_media_type" TEXT,
  ADD COLUMN "audio_play_limit" INT;

-- practice_tests: configuration
ALTER TABLE "practice_tests"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'test',
  ADD COLUMN "shuffle_answers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "show_review_moment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "available_from" TIMESTAMP(3),
  ADD COLUMN "available_to" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- student_answers: timing
ALTER TABLE "student_answers" ADD COLUMN "time_spent" INT;

-- bookmarks
CREATE TABLE "question_bookmarks" (
  "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "question_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_bookmarks_pkey" PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "question_bookmarks_user_id_question_id_key" ON "question_bookmarks"("user_id", "question_id");

-- backfill: set existing tests to "published" so they remain visible
UPDATE "practice_tests" SET "status" = 'published' WHERE "status" = 'draft';
```

All ALTER TABLE operations are metadata-only on PostgreSQL (nullable columns + defaults).

---

## 4. Architecture

### 4.1 Component Map

```
src/
├── components/
│   ├── teacher/
│   │   ├── MediaPicker.tsx              # NEW — media library selector
│   │   ├── QuestionEditor.tsx           # MODIFY — media, difficulty, explanation
│   │   ├── QuestionBulkToolbar.tsx      # NEW — bulk operations bar
│   │   ├── QuestionReorder.tsx          # NEW — drag-and-drop reorder
│   │   ├── QuestionSearchFilter.tsx     # NEW — search + filter bar
│   │   ├── TestConfigPanel.tsx          # NEW — mode, shuffle, schedule, status
│   │   ├── TestPreviewModal.tsx         # NEW — "Take as Student" preview
│   │   ├── TestStatsCard.tsx            # NEW — test summary statistics
│   │   ├── QuestionAnalytics.tsx        # NEW — per-question performance stats
│   │   ├── MediaUsageColumn.tsx         # NEW — "Used in N questions" in MediaTable
│   │   ├── CsvImporter.tsx             # MODIFY — media columns
│   │   ├── PracticeTestGrid.tsx        # MODIFY — status badge, duplicate, config
│   │   └── ResultDetailModal.tsx       # MODIFY — show media in review
│   │
│   └── student/
│       ├── AudioPlayer.tsx             # NEW — waveform audio player
│       ├── AnswerFeedback.tsx          # NEW — animated correct/incorrect + sound
│       ├── StreakCounter.tsx           # NEW — streak badge with animations
│       ├── QuestionTransition.tsx      # NEW — slide animation + type badges
│       ├── CircularTimer.tsx           # NEW — ring timer with color transitions
│       ├── ResultsScreen.tsx           # NEW — confetti, gallery, share card
│       └── PracticeSession.tsx         # MODIFY — media, grid, keyboard, resume
│
├── hooks/
│   ├── useAudioManager.ts             # NEW — single-player enforcement
│   ├── useMediaPreloader.ts           # NEW — preload next question media
│   └── useSessionDraft.ts             # NEW — localStorage save/resume
│
└── lib/
    └── mediaType.ts                   # NEW — detect media type from URL
```

### 4.2 API Changes

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/teacher/questions` | PUT | Accept media + enhancement fields |
| `/api/teacher/questions` | DELETE | **New** — bulk delete by IDs |
| `/api/teacher/questions/reorder` | PUT | **New** — update questionNumber order |
| `/api/teacher/questions/duplicate` | POST | **New** — clone question |
| `/api/teacher/questions/bulk` | PATCH | **New** — bulk update timer/difficulty |
| `/api/teacher/questions/analytics` | GET | **New** — per-question stats |
| `/api/teacher/practice-tests` | PUT | Accept config: status, mode, shuffle, schedule |
| `/api/teacher/practice-tests/duplicate` | POST | **New** — clone entire test |
| `/api/teacher/practice-tests/[testId]` | GET | Return all new fields |
| `/api/practice-tests/import` | POST | Accept media columns |
| `/api/practice/[id]/result` | POST | Accept timeSpent per answer |
| `/api/student/bookmarks` | POST/DELETE | **New** — add/remove bookmark |
| `/api/student/bookmarks` | GET | **New** — list bookmarked questions |
| `/api/teacher/media` | GET | Add `usageCount` to response (questions referencing each URL) |

---

## 5. Teacher-Side Features

### 5.1 MediaPicker Component

Reusable component for selecting media from the library.

- Empty state: dashed placeholder "Add Media" + icon
- Selected state: inline preview (thumbnail / audio icon / video icon) + remove button
- Modal: paginated Media Library with search, type filter, "Upload New" button
- Props: `value`, `onChange`, `acceptTypes` filter

### 5.2 QuestionEditor Updates

Add to existing editor form:
- Content `MediaPicker` below question text input
- Per-answer `MediaPicker` icon button on each answer row
- Difficulty stars selector (1-3 clickable stars)
- Explanation text field + explanation `MediaPicker`
- Audio play limit dropdown (unlimited / 1 / 2 / 3)
- Media type badges in collapsed preview view

### 5.3 Test Configuration Panel

Settings panel in the practice test detail modal:

| Setting | UI | Default |
|---------|-----|---------|
| Status | Dropdown: Draft / Published / Archived | Draft |
| Mode | Toggle: Practice / Test | Test |
| Shuffle Answers | Toggle switch | Off |
| Show Review Moment | Toggle switch | On |
| Available From | Date picker (optional) | — |
| Available To | Date picker (optional) | — |

### 5.4 Test Preview ("Take as Student")

"Preview" button on any published test opens a full-screen modal simulating the student experience:
- Full media rendering, timer, animations — identical to student view
- No results saved to database
- "Exit Preview" button to close
- Helps teacher verify media questions look correct before students see them

### 5.5 Test Duplication

"Duplicate Test" action on test card:
- Clones test with all questions, media references, config
- New test gets title "{Original Title} (Copy)" and status = "draft"
- API: `POST /api/teacher/practice-tests/duplicate` with `{ testId }`

### 5.6 Question Bulk Operations

Toolbar appears when checkboxes are selected (similar to Media Table):

```
┌──────────────────────────────────────────────────────────┐
│ ☑ 5 selected    [Set Timer ▾]  [Set Difficulty ▾]  [Delete]  │
└──────────────────────────────────────────────────────────┘
```

- Select all / deselect all checkbox in header
- Bulk set timer (15s / 30s / 45s / 60s)
- Bulk set difficulty (Easy / Medium / Hard)
- Bulk delete with confirmation modal
- API: `PATCH /api/teacher/questions/bulk` with `{ ids[], field, value }`

### 5.7 Question Reorder (Drag & Drop)

- Drag handle on each question row
- Drop to reorder, updates `questionNumber` for all affected questions
- API: `PUT /api/teacher/questions/reorder` with `{ testId, orderedIds[] }`
- Use `@dnd-kit/core` library (lightweight, accessible)

### 5.8 Question Search & Filter

Filter bar above question list in test detail:

```
[ Search by content...  ]  [Type ▾]  [Difficulty ▾]  [Media ▾]
```

- Search: filters by question content text (client-side for simplicity)
- Type filter: All / Multiple Choice / Yes-No / Gap Fill
- Difficulty filter: All / Easy / Medium / Hard
- Media filter: All / Has Image / Has Audio / Has Video / Text Only

### 5.9 Question Analytics

Per-question stats panel (expandable row or tooltip):

| Metric | Source |
|--------|--------|
| Success rate | `COUNT(isCorrect=true) / COUNT(*)` from StudentAnswer |
| Average time spent | `AVG(timeSpent)` from StudentAnswer |
| Most common wrong answer | `GROUP BY selectedAnswer WHERE isCorrect=false ORDER BY count DESC LIMIT 1` |
| Attempt distribution | Count by attemptNumber (1st / 2nd / 3rd try) |

Visual indicators:
- Green badge: > 80% success ("Easy for students")
- Yellow badge: 40-80% ("Moderate")
- Red badge: < 40% ("Difficult — review question")

### 5.10 Test Statistics Summary Card

At the top of test detail modal:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 10 Q's   │ │ 3E 5M 2H │ │ 6 media  │ │ 15/20    │
│ Total    │ │ Difficulty│ │ coverage │ │ attempted│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Questions by type (MC / YN / GF)
- Questions by difficulty (Easy / Medium / Hard)
- Media coverage (with media / text-only count)
- Student completion rate

### 5.11 Media Usage Tracker

Add "Used in" column to Media Table:
- Shows count of questions referencing each media URL
- Clicking count opens a popover listing the question IDs/titles
- On media delete: warning "This file is used in N question(s)"
- API: query `questions` table for URL matches when building media list

### 5.12 Batch Media Replace

When a teacher needs to replace a media file:
- "Replace" button on media item opens file upload
- After upload, system finds all questions referencing old URL
- Shows confirmation: "Update N question(s) with new file?"
- Updates all matching URL fields in one transaction

### 5.13 Auto-Difficulty Suggestion (Nice-to-have)

After 10+ student attempts, show suggested difficulty next to current difficulty stars:
- \> 80% success -> suggest Easy
- 40-80% -> suggest Medium
- < 40% -> suggest Hard
- Teacher can accept with one click or dismiss

### 5.14 CSV Import Updates

New optional columns (auto-detected from URL extension):
- `content_media_url`, `answer_N_media_url` — media URLs
- `difficulty` — 1/2/3
- `explanation` — text
- All backward-compatible: existing CSVs work unchanged

### 5.15 Question Duplication

"Duplicate" action on individual question:
- Copies all fields including media references
- New question gets `questionNumber = max + 1`
- Opens in edit mode immediately

---

## 6. Student-Side Features

### 6.1 Media Rendering

| Content Media | Rendering |
|---------------|-----------|
| Image | Below question text, `max-w-full rounded-xl`, dark bg |
| Audio | `AudioPlayer` component with waveform |
| Video | `<video>` with controls, `max-w-full rounded-xl` |

| Answer Media | Rendering |
|--------------|-----------|
| Image | 2x2 card grid (1-col on < 380px), `object-cover` |
| Audio | Play button + text label, vertical list |

### 6.2 AudioPlayer — Waveform, play limit, `useAudioManager` integration

### 6.3 Image Answer Grid — Responsive 2x2, long-press preview, animated states

### 6.4 CircularTimer — SVG ring, green/orange/red transitions, pulse at < 5s, pause state

### 6.5 AnswerFeedback — Green pulse + ding (correct), red shake + buzz (incorrect), haptic on mobile

### 6.6 StreakCounter — 3/5/10 streak badges with escalating animations

### 6.7 QuestionTransition — Slide-left/right with `motion/react`, type badge flash

### 6.8 Post-Question Review — Correct answer highlight, explanation, audio replay, auto-advance 3s

### 6.9 Keyboard Shortcuts — 1-4/A-D select, Space play/pause, Enter submit/next, B bookmark

### 6.10 Session Resume — `localStorage` draft, resume prompt, stale-check via `updatedAt`

### 6.11 Bookmarks — Toggle icon, persisted to DB, review section on Topic Detail page

### 6.12 Wrong Answer Re-queue — Re-insert 3-4 questions later (practice mode only, max 1 re-queue)

### 6.13 Speed Bonus — "Speed Bonus!" badge at < 5s correct answer

### 6.14 Results Screen — Confetti (>= 80%), difficulty breakdown, streak stats, incorrect gallery, "Most Challenging" section

---

## 7. Implementation Milestones

### Milestone 1: Database & API Foundation

**Deliverable:** All schema changes applied, all APIs accept new fields. Zero UI changes.

| # | Task |
|---|------|
| 1 | Prisma migration: all new columns + QuestionBookmark table |
| 2 | `prisma generate` |
| 3 | Backfill existing tests to `status = 'published'` |
| 4 | `PUT /api/teacher/questions` — accept all media + enhancement fields |
| 5 | `POST /api/practice-tests/import` — accept media + enhancement CSV columns |
| 6 | `GET /api/teacher/practice-tests/[testId]` — return all new fields |
| 7 | `PUT /api/teacher/practice-tests` — accept config (status, mode, shuffle, review, schedule) |
| 8 | `POST /api/practice/[id]/result` — accept timeSpent per answer |
| 9 | `POST/DELETE /api/student/bookmarks` — bookmark CRUD |
| 10 | `src/lib/mediaType.ts` — detect type from URL extension |

### Milestone 2: Media Picker

**Deliverable:** Reusable media selector component ready for integration.

| # | Task |
|---|------|
| 11 | `MediaPicker` component with library modal, type filter, preview |
| 12 | "Upload New" integration with existing `MediaUploadModal` |

### Milestone 3: Teacher — Question Editor + Media

**Deliverable:** Teachers can create/edit media-rich questions with all new fields.

| # | Task |
|---|------|
| 13 | Content `MediaPicker` in QuestionEditor |
| 14 | Per-answer `MediaPicker` on each answer row |
| 15 | Difficulty stars selector (1-3) |
| 16 | Explanation text + explanation `MediaPicker` |
| 17 | Audio play limit selector |
| 18 | Media badges in collapsed question preview |

### Milestone 4: Teacher — Test Management

**Deliverable:** Full test lifecycle management with config, preview, and bulk operations.

| # | Task |
|---|------|
| 19 | `TestConfigPanel` — status, mode, shuffle, review, schedule |
| 20 | Status badge (Draft/Published/Archived) on test cards in grid |
| 21 | "Publish" / "Unpublish" action with confirmation |
| 22 | `TestPreviewModal` — "Take as Student" full simulation |
| 23 | Test duplication — API + UI button |
| 24 | `TestStatsCard` — questions by type, difficulty, media, completion rate |
| 25 | Filter students-visible tests by `status = 'published'` + schedule dates |

### Milestone 5: Teacher — Question Management

**Deliverable:** Bulk operations, reorder, search/filter, analytics, duplication.

| # | Task |
|---|------|
| 26 | Checkboxes on question rows |
| 27 | `QuestionBulkToolbar` — bulk set timer, difficulty, delete |
| 28 | `DELETE /api/teacher/questions` (bulk) + `PATCH /api/teacher/questions/bulk` |
| 29 | `QuestionReorder` — drag-and-drop with `@dnd-kit/core` |
| 30 | `PUT /api/teacher/questions/reorder` |
| 31 | `QuestionSearchFilter` — search, type, difficulty, media filters |
| 32 | Question duplication — API + UI action |
| 33 | `QuestionAnalytics` — per-question stats (success rate, avg time, common wrong answer) |
| 34 | `GET /api/teacher/questions/analytics?testId=` |

### Milestone 6: Teacher — Media Library Integration

**Deliverable:** Media usage tracking and batch replace.

| # | Task |
|---|------|
| 35 | `MediaUsageColumn` — "Used in N questions" in MediaTable |
| 36 | Add usage count to `GET /api/teacher/media` response |
| 37 | Media deletion warning when referenced by questions |
| 38 | Batch media replace — upload new + update all referencing questions |

### Milestone 7: Teacher — CSV Import Updates

**Deliverable:** CSV import handles media, difficulty, explanation with auto-detection.

| # | Task |
|---|------|
| 39 | Update CSV template with new columns |
| 40 | Update parser + validation for media and enhancement columns |
| 41 | Auto-detect `media_type` from URL extension |
| 42 | Show media thumbnails/icons in preview table |
| 43 | Validate `correct_answer` matches an answer option |

### Milestone 8: Student — Core Media Rendering

**Deliverable:** Students see media in questions and answers during practice.

| # | Task |
|---|------|
| 44 | `AudioPlayer` with waveform visualization |
| 45 | `useAudioManager` hook (single-player enforcement) |
| 46 | `useMediaPreloader` hook (preload next question) |
| 47 | Render content media (image/audio/video) in PracticeSession |
| 48 | Image answer 2x2 grid with responsive fallback |
| 49 | Audio answer list with play buttons |
| 50 | Timer delay until media loaded |
| 51 | `CircularTimer` component (SVG ring, color transitions) |
| 52 | Answer shuffle when enabled |
| 53 | Practice mode: no timer, allow retry |

### Milestone 9: Student — Gamification & Polish

**Deliverable:** Polished, gamified practice experience.

| # | Task |
|---|------|
| 54 | `AnswerFeedback` (animations + sound + haptic) |
| 55 | `StreakCounter` (badge + encouragement messages) |
| 56 | `QuestionTransition` (slide animations + type badges) |
| 57 | Post-question review moment with explanation |
| 58 | Difficulty stars display |
| 59 | Keyboard shortcuts (1-4, Space, Enter, B) |
| 60 | Speed bonus visual (< 5s correct) |
| 61 | Wrong answer re-queue (practice mode only) |
| 62 | Image answer long-press-to-preview (mobile) |
| 63 | `useSessionDraft` hook for resume |
| 64 | Resume prompt on practice page load |
| 65 | Bookmark icon + API integration |

### Milestone 10: Results & Review

**Deliverable:** Rich results screen and media-enhanced review.

| # | Task |
|---|------|
| 66 | `ResultsScreen` with confetti, difficulty breakdown, gallery |
| 67 | Streak + speed bonus stats in results |
| 68 | "Most challenging" section with media thumbnails |
| 69 | Update `ResultDetailModal` to show media in teacher review |
| 70 | Bookmarked questions section on Topic Detail page |

### Milestone 11: Polish & QA

| # | Task |
|---|------|
| 71 | Mobile responsiveness for all new components |
| 72 | Loading states: skeleton/spinner, "Media unavailable" fallback |
| 73 | All translation keys (EN + VI) |
| 74 | Seed data: practice test with mixed media questions |
| 75 | Auto-difficulty suggestion (nice-to-have) |
| 76 | End-to-end testing: create -> config -> preview -> import -> practice -> review |

---

## 8. Example Scenarios

### Scenario A: Listening Comprehension
> **Question:** "What animal makes this sound?"
> **Content Media:** `tiger-roar.mp3` (audio) | **Difficulty:** Medium
> **Answers:** Tiger | Elephant | Lion | Bear (text only)
> **Correct:** Tiger | **Explanation:** "Tigers produce a distinctive low-frequency roar"

### Scenario B: Visual Identification with Image Answers
> **Question:** "Which image shows a bridge?"
> **Answers:** 4 images (bridge.jpg, tower.jpg, road.jpg, tunnel.jpg)
> **Correct:** "Bridge"

### Scenario C: Audio + Image Answers
> **Question:** "Listen to the description. Which picture matches?"
> **Content Media:** `description-park.mp3` (audio)
> **Answers:** 4 images (park.jpg, beach.jpg, mountain.jpg, city.jpg)
> **Correct:** "Park"

### Scenario D: Video Context
> **Question:** "What activity is shown in this video?"
> **Content Media:** `swimming-lesson.mp4` (video)
> **Answers:** Swimming | Running | Cycling | Dancing (text only)
> **Correct:** Swimming

### Scenario E: Practice Mode with Re-queue
> Student answers Q3 incorrectly -> Q3 re-inserted after Q6
> Review moment shows explanation + audio replay after each question
> No timer, student can replay audio freely

### Scenario F: Teacher Workflow
> Teacher creates test as Draft -> adds 10 questions with media via editor
> Uses "Take as Student" to preview -> adjusts difficulty on 3 questions via bulk edit
> Publishes test -> schedules availability for next Monday
> After 15 students complete: checks analytics, sees Q7 has 20% success rate -> reviews and simplifies

---

## 9. Risks & Mitigations

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Slow media loading** — timer expires before student sees question | `useMediaPreloader` + timer waits for `onload`/`canplay` + skeleton UI |
| 2 | **Blob storage costs** — bandwidth grows with student count | Vercel CDN caching + recommended file sizes for teachers |
| 3 | **Broken media URLs** — teacher deletes file used in questions | Deletion warning with usage count + "Media unavailable" fallback UI |
| 4 | **CSV complexity** — 19+ columns unwieldy | Auto-detect media_type from extension + clear template + preview thumbnails |
| 5 | **Answer matching drift** — teacher changes answer text, forgets correctAnswer | Auto-update correctAnswer on edit + CSV validation |
| 6 | **Mobile image grid** — 2x2 too small on < 380px phones | Responsive 1-col fallback + long-press preview |
| 7 | **Audio conflicts** — multiple players simultaneously | `useAudioManager` single-player enforcement |
| 8 | **Migration safety** — adding columns to active table | All nullable + defaults = metadata-only ALTER, no rewrite |
| 9 | **Session resume staleness** — teacher modifies test after student starts | Store `updatedAt` in draft, discard if stale |
| 10 | **Web Audio API** — sound effects browser support | Feature-detect + graceful degradation |
| 11 | **Draft/Published confusion** — teacher forgets to publish | "Unpublished" warning badge + "Publish" button prominent in test config |
| 12 | **Drag-and-drop reorder** — mobile touch conflicts | Use `@dnd-kit/core` with touch sensor, separate from swipe gestures |

---

## 10. Open Questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Timer pause during audio/video playback? | Configurable per test |
| 2 | Answers support video? | No — image + audio only |
| 3 | GAP_FILL support media content? | Yes — image/audio as context |
| 4 | `correctAnswer` index-based instead of text? | Defer to v2 |
| 5 | Auto-detect media_type from URL? | Yes |
| 6 | Bookmarks persist across retakes? | Yes — per-question, not per-attempt |
| 7 | Re-queue limit in practice mode? | Max 1 per question |
| 8 | Sound effects volume control? | Use device volume for v1 |
| 9 | Question bank (cross-test reuse)? | Defer to v2 — requires question ownership refactor |
| 10 | ZIP-based CSV import with media? | Defer to v2 — teachers use Media Library + URL references for v1 |
