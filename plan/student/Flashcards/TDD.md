# TDD — Student Flashcards Page

**Feature:** Swipeable vocabulary flashcard deck
**Route:** `/topics/[topicId]/flashcards`
**Last Updated:** 2026-04-15

---

## 1. Architecture Overview

The Flashcards feature follows the standard Next.js 16 App Router split: a **React Server Component** (RSC) page handles authentication, authorization, and data fetching; a **Client Component** (`FlashcardDeck`) handles all interactive state (flip, drag, swipe, progress).

```
Server (RSC)                       Client
─────────────────────              ──────────────────────────────────────
FlashcardsPage (page.tsx)    →     FlashcardDeck (FlashcardDeck.tsx)
  auth() check                       useState (cards, currentIndex, flipped,
  classEnrollment guard                         dragX, isDragging, swipeOut,
  prisma.topic + vocabulary                     swipeColor, swipeIn)
  prisma.flashcardProgress           Pointer Events (drag/swipe)
  progressMap construction           3D CSS flip
  props serialization          →     POST /api/flashcards (per card)
                                     PUT  /api/flashcards (batch, future)
```

No external state manager (no Zustand, no Redux). All flashcard UI state lives in `useState` hooks local to `FlashcardDeck`. API calls are fire-and-forget `fetch` calls inside `useCallback`.

---

## 2. Route & Data Flow

### 2.1 URL Structure

```
/topics/[topicId]/flashcards
         └── topicId: cuid string, e.g. "clz1abc2def3ghi"
```

### 2.2 Server-Side Flow

```
Request arrives at FlashcardsPage
  │
  ├─ await auth()
  │    └─ No session → redirect("/login")
  │
  ├─ await params  (async params per Next.js 16)
  │    └─ topicId: string
  │
  ├─ prisma.classEnrollment.findFirst()
  │    WHERE userId = session.user.id
  │    AND class.topicAssignments contains topicId
  │    └─ null → notFound()
  │
  ├─ prisma.topic.findUnique()
  │    WHERE id = topicId
  │    INCLUDE vocabulary ORDER BY sortOrder ASC
  │    └─ null → notFound()
  │
  ├─ prisma.flashcardProgress.findMany()
  │    WHERE userId = session.user.id
  │    AND vocabularyId IN [topic.vocabulary[*].id]
  │
  ├─ Build progressMap: { [vocabularyId]: learned }
  │
  └─ Render <FlashcardDeck
               topicId={topicId}
               topicTitle={topic.title}
               vocabulary={topic.vocabulary.map(v => ({
                 id, word, type, pronunciation, meaning, example,
                 learned: progressMap[v.id] ?? false
               }))}
             />
```

### 2.3 Client-Side Flow

```
FlashcardDeck mounts
  │
  ├─ cards = vocabulary (all items, unfiltered)
  ├─ currentIndex = 0
  ├─ flipped = false
  │
  ├─ User taps card (tap, not drag)
  │    └─ setFlipped(f => !f)
  │
  ├─ User drags card
  │    ├─ onPointerDown → save startX, setIsDragging(true), setPointerCapture
  │    ├─ onPointerMove → compute dx, setDragX(dx), if |dx| > 5 didDrag=true
  │    └─ onPointerUp   → |dragX| > 100 → markCard(true/false)
  │                     → else → setDragX(0) (snap back)
  │
  └─ markCard(learned)
       ├─ Guard: if (!currentCard || swipeOut) return
       ├─ setSwipeColor(learned ? "green" : "red")
       ├─ setSwipeOut("left")
       ├─ setTimeout 350ms:
       │    ├─ setCards(update learned flag for currentCard.id)
       │    ├─ setFlipped(false), setDragX(0)
       │    ├─ setSwipeOut(null), setSwipeColor(null)
       │    ├─ setSwipeIn(true)
       │    ├─ setCurrentIndex(i => i + 1)
       │    ├─ window.scrollTo restore
       │    └─ setTimeout 350ms: setSwipeIn(false)
       └─ fetch POST /api/flashcards { vocabularyId, learned }  ← fire & forget
```

---

## 3. Component Tree

```
FlashcardsPage (RSC — page.tsx)
└── FlashcardDeck (Client — components/student/FlashcardDeck.tsx)
    ├── Progress Bar  (div, inline style width)
    ├── Header
    │   ├── Link → /topics/[topicId]   (breadcrumb "Topic")
    │   ├── Link → /topics/[topicId]   (breadcrumb topicTitle)
    │   └── <p> cardProgress text
    │
    ├── [if allDone] Completion Screen
    │   ├── <span material-symbols> celebration
    │   ├── <h2> allCardsReviewed
    │   ├── <p>  wordsLearned
    │   └── Link → /topics/[topicId]   (reviewTopic button)
    │
    └── [if currentCard] Card + Controls
        ├── Card Viewport Section  (perspective: 1200px)
        │   ├── Blur blob: top-left (green tint)
        │   ├── Blur blob: bottom-right (indigo tint)
        │   └── Card Flip Container  (div, 3D transform, pointer events)
        │       ├── Front Face  (absolute, backface-hidden)
        │       │   ├── Top Section
        │       │   │   ├── Card number (ghosted)
        │       │   │   ├── <h1> word
        │       │   │   └── Pill: type + pronunciation (conditional)
        │       │   ├── Wave SVG Divider
        │       │   └── Bottom Section
        │       │       ├── Swipe Indicator (check/X badge, conditional)
        │       │       └── Flip Hint (sync icon + "tap to flip")
        │       └── Back Face  (absolute, backface-hidden, rotateY 180deg)
        │           ├── Top Section
        │           │   ├── Card number (ghosted)
        │           │   ├── <p> meaning
        │           │   └── <p> example (conditional, in quotes)
        │           ├── Wave SVG Divider (colors inverted)
        │           └── Bottom Section
        │               ├── Swipe Indicator
        │               └── Flip Hint
        └── Controls Section
            ├── Not Learned Button (div > button + label)
            ├── Back Button        (div > button + label, disabled if index=0)
            └── Learned Button     (div > button + label)
```

**Loading state:** `loading.tsx` co-located in the route renders a skeleton: a progress bar shimmer, a card placeholder (`aspect-[3/4]`, rounded, white bg), and two circular button placeholders.

---

## 4. Database Queries

### 4.1 Access Guard

```sql
-- prisma.classEnrollment.findFirst()
SELECT ce.id
FROM class_enrollments ce
JOIN classes c ON c.id = ce.class_id
JOIN topic_assignments ta ON ta.class_id = c.id
WHERE ce.user_id = $userId
  AND ta.topic_id = $topicId
LIMIT 1;
```

Prisma relation filter translation. No index overhead beyond the FK indexes that Prisma migrations create on `class_id` and `topic_id`.

### 4.2 Topic + Vocabulary Fetch

```sql
-- prisma.topic.findUnique() with include
SELECT t.*, v.*
FROM topics t
LEFT JOIN vocabularies v ON v.topic_id = t.id
WHERE t.id = $topicId
ORDER BY v.sort_order ASC;
```

Single query with JOIN. Returns topic metadata and all vocabulary in order.

### 4.3 FlashcardProgress Fetch

```sql
-- prisma.flashcardProgress.findMany()
SELECT vocabulary_id, learned
FROM flashcard_progress
WHERE user_id = $userId
  AND vocabulary_id = ANY($vocabularyIds);
```

Batched IN query. Returns only existing rows; missing rows default to `learned = false` in the JS `progressMap`.

### 4.4 POST: Single Progress Upsert

```sql
-- prisma.flashcardProgress.upsert()
INSERT INTO flashcard_progress (id, user_id, vocabulary_id, learned, learned_at)
VALUES (cuid(), $userId, $vocabularyId, $learned, $learnedAt)
ON CONFLICT (user_id, vocabulary_id)
DO UPDATE SET learned = $learned, learned_at = $learnedAt;
```

Uses Prisma's named unique key `userId_vocabularyId`. `learnedAt` is set to `NOW()` when `learned = true`, `NULL` when `false`.

### 4.5 PUT: Batch Progress Upsert

```sql
-- prisma.$executeRawUnsafe()
INSERT INTO flashcard_progress (id, vocabulary_id, user_id, learned, learned_at)
SELECT gen_random_uuid(), vid, $1, $2, $3
FROM unnest($4::text[]) AS vid
ON CONFLICT (user_id, vocabulary_id)
DO UPDATE SET learned = $2, learned_at = $3;
```

Raw SQL with `unnest` for array expansion. Parameters: `$1=userId`, `$2=learned`, `$3=learnedAt|null`, `$4=vocabularyIds[]`.

---

## 5. API Dependencies

### 5.1 POST `/api/flashcards`

**File:** `src/app/api/flashcards/route.ts`

| Attribute | Value |
|---|---|
| Method | POST |
| Auth | Session required (401 if missing) |
| Request body | `{ vocabularyId: string, learned: boolean }` |
| Validation | `vocabularyId` must be truthy string; `learned` must be boolean |
| Response (200) | Full `FlashcardProgress` object from Prisma |
| Response (400) | `{ error: "Invalid request" }` |
| Response (401) | `{ error: "Unauthorized" }` |
| Side effects | Upserts `FlashcardProgress` row; sets `learnedAt` |

Client call site in `FlashcardDeck`:
```ts
fetch("/api/flashcards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ vocabularyId: currentCard.id, learned }),
});
// No await — fire and forget
```

### 5.2 PUT `/api/flashcards`

**File:** `src/app/api/flashcards/route.ts`

| Attribute | Value |
|---|---|
| Method | PUT |
| Auth | Session required (401 if missing) |
| Request body | `{ vocabularyIds: string[], learned: boolean }` |
| Validation | `vocabularyIds` must be array; `learned` must be boolean |
| Response (200) | `{ updated: number }` |
| Response (400) | `{ error: "Invalid request" }` |
| Side effects | Bulk upserts multiple `FlashcardProgress` rows |

Not currently called from `FlashcardDeck`. Intended for "Mark All Learned" feature on Topic Detail page (`VocabGrid`).

---

## 6. State Management

All state is local to `FlashcardDeck` via React `useState` and `useRef`. No external store.

### 6.1 State Variables

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `cards` | `Vocab[]` | `vocabulary` prop | Mutable copy of vocabulary; `learned` flag updated on mark |
| `currentIndex` | `number` | `0` | Index of the currently shown card |
| `flipped` | `boolean` | `false` | Whether card is showing back face |
| `dragX` | `number` | `0` | Current horizontal drag offset in pixels |
| `isDragging` | `boolean` | `false` | Pointer is held down and dragging |
| `swipeOut` | `"left" \| "right" \| null` | `null` | Triggers swipe-out CSS transform; acts as animation lock |
| `swipeColor` | `"green" \| "red" \| null` | `null` | Overrides card background gradient for swipe color feedback |
| `swipeIn` | `boolean` | `false` | Triggers slide-in animation for incoming card |

### 6.2 Refs

| Ref | Type | Purpose |
|---|---|---|
| `startX` | `MutableRefObject<number>` | X coordinate at pointer down; used to compute `dragX` delta |
| `didDrag` | `MutableRefObject<boolean>` | Set to `true` if drag > 5 px; suppresses flip click handler |

### 6.3 Derived State

```ts
const learnedCount = cards.filter((c) => c.learned).length;
const totalCount = cards.length;
const currentCard = cards[currentIndex];
const allDone = currentIndex >= totalCount;
const progressPercent = (currentIndex / totalCount) * 100;
const [topColor, bottomColor, textColor] = cardColors[currentIndex % cardColors.length];
const cardNumber = String(currentIndex + 1).padStart(2, "0");
```

All derived values recompute on each render; no `useMemo` since computation cost is negligible.

### 6.4 Animation Sequencing

The `markCard` function orchestrates a two-step timed sequence:

```
t=0ms    setSwipeColor, setSwipeOut("left")         → CSS: card flies out
t=350ms  update cards[], reset flipped/dragX/swipe  → state catches up
         setSwipeIn(true), setCurrentIndex(i+1)      → CSS: new card slides in
         scroll restore
t=700ms  setSwipeIn(false)                           → animation class removed
```

The `goBack` function runs a simplified version (no swipe-out, just swipe-in + index decrement).

---

## 7. Styling & Responsive Design

### 7.1 Tailwind Classes Used

The component uses Tailwind CSS v4 utility classes. Notable non-standard patterns:

- **`aspect-[3/4]`** — custom aspect ratio for card viewport; ensures consistent card height across devices.
- **`perspective: 1200px`** — applied via inline `style` (not Tailwind) since it is not a standard Tailwind utility.
- **`transformStyle: "preserve-3d"`** — inline style on the flip container.
- **`backfaceVisibility: "hidden"`** — inline style on each face div; critical for flip illusion.
- **`touch-none`** — disables native touch scrolling on the draggable card element.
- **`select-none`** — prevents text selection during drag.

### 7.2 Color Token Reference

All hex values are hardcoded (not CSS variables) per the existing project convention:

| Token | Hex | Usage |
|---|---|---|
| Brand Indigo | `#2a14b4` | Progress bar, links, primary buttons |
| Brand Indigo Light | `#4338ca` | Progress bar end, hover states |
| Text Primary | `#121c2a` | Body text, headings |
| Text Secondary | `#777586` | Labels, hints, secondary text |
| Learned Green | `#a6f2d1` / `#1b6b51` | Button bg / icon |
| Not Learned Red | `#ffdada` / `#7b0020` | Button bg / icon |
| Back Button | `#f0eef6` / `#e3dfff` | Normal / hover |
| Progress BG | `#d9e3f6` | Progress bar track |

### 7.3 Breakpoints

| Breakpoint | Card word size | Layout |
|---|---|---|
| Mobile (< 768px) | `text-5xl` | Full width card, stacked header |
| Tablet+ (≥ 768px) | `text-6xl` | Same layout, larger word |
| Desktop (≥ 1024px) | `text-6xl` | `max-w-md` card centered, `max-w-2xl` header/progress |

### 7.4 Animation CSS

The `swipeIn` state applies an inline `animation: "slideInRight 0.35s ease-out"` style. This keyframe must be defined globally:

```css
@keyframes slideInRight {
  from { transform: translateX(60px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

The wave divider SVG uses `preserveAspectRatio="none"` and `className="w-full h-14"` to scale responsively.

---

## 8. i18n Keys

All UI strings are consumed from the `"student"` namespace via `useTranslations("student")` (client component hook).

| Key | English Value | Usage |
|---|---|---|
| `student.topic` | `"Topic"` | Breadcrumb first segment label |
| `student.cardProgress` | `"{current} of {total} cards"` | Position indicator below breadcrumb |
| `student.tapToFlip` | `"Tap to flip for definition"` | Hint text on both card faces |
| `student.allCardsReviewed` | `"All cards reviewed!"` | Completion screen heading |
| `student.wordsLearned` | `"{count} of {total} words learned"` | Completion screen subtext |
| `student.reviewTopic` | `"Review Topic"` | Completion screen CTA button |
| `student.notLearned` | `"Not Learned"` | Action button label (left) |
| `student.previousCard` | `"Back"` | Action button label (center) |
| `student.learned` | `"Learned"` | Action button label (right) |

Vietnamese (`vi.json`) counterparts must exist at the same keys under `student.*`.

The page-level `generateMetadata` uses hardcoded English strings (metadata is not translated in the current implementation).

---

## 9. Error Handling

### 9.1 Server-Side (page.tsx)

| Scenario | Handling |
|---|---|
| No active session | `redirect("/login")` — Next.js hard redirect |
| Not enrolled in class with topic | `notFound()` — renders Next.js 404 page |
| Topic does not exist | `notFound()` — renders Next.js 404 page |
| Prisma query error | Unhandled — propagates to Next.js error boundary (500) |

### 9.2 Client-Side (FlashcardDeck.tsx)

| Scenario | Handling |
|---|---|
| `POST /api/flashcards` network failure | Silent failure — no error toast, no retry. UI state is already advanced. Progress is lost for that card. |
| `POST /api/flashcards` 4xx / 5xx | Same as network failure — response is not checked |
| Double-swipe attempt during animation | `swipeOut` guard in `markCard`: `if (!currentCard \|\| swipeOut) return` |
| Back button at index 0 | `goBack()` has `if (currentIndex <= 0 \|\| swipeOut) return` guard; button also has CSS `pointer-events-none` |
| Empty vocabulary array | `totalCount = 0`; `currentIndex (0) >= totalCount (0)` → `allDone = true` immediately; completion screen shown |

### 9.3 Future Improvements

- Add optimistic error recovery: if POST fails, surface a Sonner toast and revert `learned` state on the card.
- Retry logic with exponential backoff for transient network failures.
- Persist `currentIndex` to `sessionStorage` so students can resume mid-deck on page refresh.

---

## 10. Performance Considerations

### 10.1 Server

- **Two Prisma queries** per request (access guard + topic; progress). The access guard query returns at most 1 row and does not participate in the larger topic fetch, so parallelism is possible:
  ```ts
  const [hasAccess, topic] = await Promise.all([
    prisma.classEnrollment.findFirst({ ... }),
    prisma.topic.findUnique({ ... }),
  ]);
  ```
  Current implementation runs them sequentially (access guard first); refactoring to parallel would improve TTFB for large vocabulary sets.
- **Progress query** is O(N) on vocabulary count; for typical topics (5–20 words) this is negligible.

### 10.2 Client

- **No framer-motion dependency** — all animations use native CSS transforms and inline styles. Zero JS animation overhead; animations are GPU-composited.
- **Pointer capture** (`setPointerCapture`) ensures reliable drag tracking without global event listeners.
- **No `useMemo`/`useCallback` on derived values** — recomputation is O(1) or O(N) with N < 50, cheaper than memo overhead.
- **`markCard` is wrapped in `useCallback`** because it is referenced in pointer event handlers; prevents unnecessary re-creation.
- **Scroll restoration** uses `window.scrollTo` with `behavior: "instant"` (typed as `ScrollBehavior`) to prevent layout jank when the card animation causes height changes. `requestAnimationFrame` retry covers async layout commits.

### 10.3 `useMediaPreloader` Hook

The `useMediaPreloader` hook exists in `src/hooks/useMediaPreloader.ts` and is ready for use. The current `FlashcardDeck` does not invoke it because vocabulary cards carry no media URLs (`contentMediaUrl` etc. are Practice question fields, not Vocabulary fields). If vocabulary is extended to support image/audio, `useMediaPreloader` can be integrated per-card to pre-cache the next card's assets:

```ts
const nextCard = cards[currentIndex + 1] ?? null;
const { isReady } = useMediaPreloader({
  contentMediaUrl: nextCard?.imageUrl ?? null,
  contentMediaType: nextCard?.imageUrl ? "image" : null,
  // ... other fields
});
```

### 10.4 Bundle Impact

`FlashcardDeck` is a `"use client"` component. It adds to the client bundle only the component itself and `next-intl`'s `useTranslations` (already shared). No additional third-party libraries are introduced. The wave SVG divider is rendered inline (no external asset request).
