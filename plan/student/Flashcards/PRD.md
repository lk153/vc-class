# PRD — Student Flashcards Page

**Feature:** Swipeable vocabulary flashcard deck for per-topic vocabulary learning
**Route:** `/topics/[topicId]/flashcards`
**Last Updated:** 2026-04-15

---

## 1. Overview

The Flashcards page is a core vocabulary-learning experience within VC Class. Students visit it from the Topic Detail page and work through a deck of vocabulary cards one at a time. Each card reveals the target word on the front face and flips to show its meaning, example sentence, and pronunciation context on the back. Students sort each card into "Learned" or "Not Learned" by swiping or tapping action buttons, and the platform persists that choice in real time.

The page is intentionally focused: no navigation distractions, a fullscreen card viewport, and tactile micro-interactions (drag physics, card flip, color-coded feedback) modeled after physical flashcard study techniques. The goal is to make vocabulary acquisition feel lightweight and satisfying, not like a chore.

---

## 2. User Stories

### Primary Flow

**US-01 — Review word front**
> As a student, I want to see each vocabulary word displayed prominently on a card so I can try to recall its meaning before flipping.

**US-02 — Flip card for definition**
> As a student, I want to tap the card to flip it and reveal the meaning, example sentence, and pronunciation so I can verify my recall.

**US-03 — Mark as Learned (swipe right / button)**
> As a student, I want to mark a word as "Learned" by swiping right or tapping the check button so the system records my progress.

**US-04 — Mark as Not Learned (swipe left / button)**
> As a student, I want to mark a word as "Not Learned" by swiping left or tapping the X button so I know which words need more study.

**US-05 — Undo previous card**
> As a student, I want to go back to the previous card to change my answer if I swiped by mistake.

**US-06 — Track position in deck**
> As a student, I want to see "X of Y cards" and a progress bar so I always know how far along I am in the deck.

**US-07 — Complete deck**
> As a student, I want to see a celebration screen when I finish all cards showing how many words I learned, with a link back to the topic.

**US-08 — Return to topic**
> As a student, I want a back link/breadcrumb to the Topic Detail page so I can navigate without using the browser back button.

### Secondary Flow

**US-09 — Resume from prior progress**
> As a student who partially completed the deck before, I want to start from the first card again on each session visit (deck is always full order), but my previously-learned status is already reflected in the final summary count.

**US-10 — Keyboard/button fallback**
> As a student on a desktop with no touch screen, I want to use the on-screen buttons to mark cards since swiping is not natural with a mouse.

---

## 3. Functional Requirements

### FR-01: Deck Initialization
- The deck is the full vocabulary list for the topic, ordered by `sortOrder` ascending.
- Each vocabulary item carries a pre-fetched `learned` boolean from `FlashcardProgress` for the current user.
- No filtering or pre-sorting of already-learned cards: all cards are presented in original order every session.
- The deck renders as a stack; only the top card (currentIndex) is interactive.

### FR-02: Card Front (Word Face)
- Displays: card number (zero-padded, e.g. "01"), word, word type (e.g. "(n)"), pronunciation (e.g. "/kəˈmjuːnɪkeɪt/")
- Word type and pronunciation appear together in a pill badge if either is present.
- Card background uses a dual-tone gradient from the 12-color rotation palette, cycling by card index.
- Bottom section of front card shows swipe indicator (check/X icon) and "Tap to flip" hint.

### FR-03: Card Back (Definition Face)
- Displays: card number, meaning text, example sentence (in quotation marks, if present).
- Card back uses the inverted gradient (bottom color becomes top, top becomes bottom).
- Bottom section of back card shows swipe indicator and "Tap to flip" hint.
- 3D Y-axis flip animation (CSS `rotateY 180deg`) triggers on tap when drag distance < 5 px.

### FR-04: Swipe / Drag Interaction
- Uses Pointer Events API (`onPointerDown`, `onPointerMove`, `onPointerUp`) with `setPointerCapture` for reliable cross-device tracking.
- Drag threshold for swipe commit: ±100 px from start position.
- Visual drag feedback: card translates on X-axis, rotates proportionally (`dragX * 0.05` degrees).
- Drag color feedback (> 50 px right): front card top gradient tints toward learned green.
- Drag color feedback (< -50 px left): front card top gradient tints toward not-learned red.
- Swipe indicator (check/X icon badge) appears above action buttons when |dragX| > 50 px.
- If drag is released below threshold, card snaps back to center with ease transition.
- Tap detection: if total drag distance ≤ 5 px, the `onClick` flip fires; otherwise flip is suppressed.

### FR-05: Card Transition Animation
- Swipe-out animation: card translates to -120% X and rotates -15 degrees over 350 ms, then fades out.
- Swipe-in animation: next card slides in from right over 350 ms.
- Scroll position is preserved after each card advance (saved via `window.scrollY`, restored on same and next animation frame).
- Flip is reset to front face on card advance.

### FR-06: Action Buttons
- "Not Learned" button: red circle with X icon (`close`), left of center. Calls `markCard(false)`.
- "Back" button: light purple circle with undo icon, center. Calls `goBack()`. Disabled (opacity 30%, pointer-events none) when `currentIndex === 0`.
- "Learned" button: green circle with filled check icon, right of center. Calls `markCard(true)`.
- Buttons and swipe produce identical outcomes; both paths call the same `markCard` function.

### FR-07: Progress Tracking — Single Card (POST)
- On each `markCard(learned)` call, a `POST /api/flashcards` request is fired with `{ vocabularyId, learned }`.
- Request is fire-and-forget (no await on the fetch for UI responsiveness); errors are silently swallowed in the current implementation.
- API performs an upsert on `FlashcardProgress` (unique key: `userId + vocabularyId`).
- Sets `learnedAt` to current timestamp when `learned = true`; sets to `null` when `learned = false`.

### FR-08: Progress Tracking — Batch (PUT)
- `PUT /api/flashcards` accepts `{ vocabularyIds: string[], learned: boolean }`.
- Uses a raw SQL `INSERT … ON CONFLICT DO UPDATE` for bulk upsert performance.
- This endpoint is available for future use (e.g., "Mark All Learned" feature on Topic Detail).

### FR-09: Progress Bar
- Thin 2 px horizontal bar at the top of the page.
- Width = `(currentIndex / totalCount) * 100%`.
- Represents cards reviewed (advanced past), not cards marked learned.
- Animates with CSS `transition-all duration-500`.
- Gradient: left `#2a14b4` → right `#4338ca`.

### FR-10: Completion State
- Triggered when `currentIndex >= totalCount` (all cards have been advanced past).
- Displays: celebration icon, "All cards reviewed!" heading, "{X} of {Y} words learned" subtext.
- Shows a "Review Topic" button linking back to `/topics/[topicId]`.
- No further interaction possible from this state (must navigate away).

### FR-11: Color Rotation
- 12 dual-tone gradient palettes, each defined as `[topColor, bottomColor, textColor]`.
- Card index modulo 12 selects the active palette.
- Text color is always `#ffffff` across all palettes.
- Wave SVG divider between top and bottom card sections uses `${textColor}20` and `${textColor}50` opacity variants of the palette colors.

### FR-12: Access Control
- Server component verifies session via NextAuth (`auth()`); redirects to `/login` if unauthenticated.
- Verifies student has access to the topic via `ClassEnrollment → TopicAssignment` join; returns 404 if not enrolled.
- Topic itself is fetched with 404 guard.

### FR-13: Metadata
- Page `<title>`: `"Flashcards — {topic.title}"`.
- Meta description: `"Study vocabulary flashcards for {topic.title}. Flip cards to memorize words and track your progress."`.

---

## 4. Non-Functional Requirements

### NFR-01: Performance
- Server component pre-fetches all data (topic, vocabulary, progress) in a single render pass with 2 parallel Prisma queries (topic + progress).
- No client-side data loading on initial mount; all vocabulary is embedded in props.
- Pointer events used over touch events to avoid passive-listener scroll conflicts.

### NFR-02: Reliability
- API calls for progress marking are non-blocking; UI advances immediately without waiting for server confirmation.
- Swipe lock (`swipeOut` guard) prevents double-marking during animation.

### NFR-03: Accessibility
- Buttons have visible labels (uppercase text beneath icon).
- Card flip and swipe actions are fully keyboard-accessible via the action buttons.
- Color tinting for learned/not-learned is supplemented by icon (check/X), not color alone.
- `touch-none` and `select-none` on the draggable element prevents text selection and scroll interference during drags.

### NFR-04: Responsiveness
- Card is constrained to `max-w-md` with `aspect-[3/4]` — readable on any screen from 320 px wide.
- Accent blur blobs and layout padding are fluid.
- Action buttons are large touch targets (64 × 64 px for primary, 48 × 48 px for back).

### NFR-05: Security
- All API routes verify session before processing.
- `vocabularyId` validity is implicitly scoped by the user's session (only their progress is written).

---

## 5. UI/UX Requirements

### Layout Structure (top → bottom)
1. Progress bar (full width, 2 px, fixed at top of component)
2. Breadcrumb header: "Topic / {topicTitle}" + "X of Y cards" subtext
3. Card viewport (centered, `max-w-md`, `aspect-[3/4]`, 3D perspective)
4. Decorative ambient blur blobs (asymmetric, behind card)
5. Action buttons row: Not Learned | Back | Learned
6. Bottom padding

### Card Design
- Large rounded corners (`rounded-[2rem]`).
- Drop shadow: layered box shadows for depth.
- Card number in top-left, very large and ghosted (30% opacity) as a design element.
- Wave SVG divider separates the top content area from the bottom action tray.
- No border; depth conveyed through shadow and gradient contrast.

### Animation Principles
- Drag should feel physical: real-time transform with no easing while dragging.
- Snap-back uses `transform 0.5s ease` for a springy return.
- Swipe-out is fast and directional (`0.35s ease-in`), swipe-in is brisk (`0.35s ease-out`).
- Flip uses `0.5s ease` with `perspective: 1200px` and `preserve-3d` for a convincing 3D rotation.

### Color Language
- Green (#a6f2d1 / #1b6b51): Learned / correct.
- Red (#ffdada / #7b0020): Not Learned / incorrect.
- Indigo (#2a14b4 / #4338ca): Primary brand, progress, links.
- Light purple (#f0eef6 / #e3dfff): Neutral secondary actions.

### Typography
- All text uses `font-body` (project's primary sans-serif).
- Word on front face: `text-5xl md:text-6xl`, `font-bold`.
- Meaning on back face: `text-xl md:text-2xl`, `font-medium`.
- Example sentence: `text-base`, lighter opacity.
- Labels and hints: `text-[10px] uppercase tracking-[0.2em] font-bold`.

---

## 6. Edge Cases

| Case | Expected Behavior |
|---|---|
| Topic has zero vocabulary | Deck is empty; `allDone` is immediately true; completion screen shows "0 of 0 words learned" |
| Topic has exactly 1 card | "Back" button is permanently disabled; completion triggers after single swipe |
| Very long word (20+ chars) | Word wraps within card; font size is fixed (`text-5xl`), no auto-shrink |
| Very long meaning text | Meaning paragraph scrolls/wraps within the card's fixed aspect ratio container |
| Null pronunciation and type | Badge pill is omitted entirely; no empty pill rendered |
| Null example sentence | Back face omits the example paragraph; only meaning is shown |
| User swipes during swipe-out animation | `swipeOut` guard returns early from `markCard`; double-advance prevented |
| User returns to card at index 0 | "Back" button is disabled (`opacity-30`, `pointer-events-none`); `goBack()` has an additional index guard |
| API POST fails (network error) | Progress is not persisted server-side but UI continues; no error toast shown (silent failure) |
| Student revisits page | Full deck resets to index 0; prior `learned` state is fetched fresh from DB and reflected in completion summary |
| Student is not enrolled in a class with this topic | Server returns 404 (`notFound()`) |
| Student is unauthenticated | Server redirects to `/login` |
| Card rotation lands on colors 0 and 12 simultaneously | Modulo ensures only one palette is active at a time; no collision |

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Deck completion rate | ≥ 70% of sessions that load the page advance past all cards | `FlashcardProgress` count = vocabulary count per user/topic |
| "Learned" mark rate | ≥ 50% of cards marked as learned per completed session | Aggregate `learned = true` vs total per session |
| API error rate (POST /api/flashcards) | < 1% of requests return non-2xx | Server error logs / Vercel monitoring |
| Page load time (TTFB) | < 600 ms (server-side DB queries) | Vercel analytics / Lighthouse |
| Return session rate | ≥ 40% of students revisit flashcards within 7 days | Session analytics per userId/topicId |
| Mobile swipe usage | ≥ 60% of card advances via swipe (vs button tap) | Client-side event tracking (future) |
