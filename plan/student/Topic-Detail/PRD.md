# PRD — Student Topic Detail Page

**Route:** `/topics/[topicId]`
**File:** `src/app/(student)/topics/[topicId]/page.tsx`
**Last updated:** 2026-04-15

---

## 1. Overview

The Topic Detail page is the central learning hub for a student assigned to a specific vocabulary topic. It aggregates three learning modalities — passive vocabulary review, active flashcard study, and formal assessment — into a single, cohesive screen. A student arrives here from the Topics list and uses this page as their primary workspace until they have mastered the topic's vocabulary and completed its associated practice tests.

The page is a **Next.js Server Component** that performs all data fetching on the server. Client-side interactivity is delegated to the `VocabGrid` component (marking words learned/unlearned) and to navigation links (flashcards, practice tests).

---

## 2. User Stories

| ID  | As a…   | I want to…                                              | So that…                                                        |
|-----|---------|---------------------------------------------------------|-----------------------------------------------------------------|
| US1 | Student | See the topic title, language, and description clearly  | I know what subject matter I am studying                        |
| US2 | Student | See a visual progress indicator for vocabulary mastery  | I can gauge how close I am to completing the topic              |
| US3 | Student | Browse all vocabulary words in the topic                | I can read meanings, pronunciations, and example sentences      |
| US4 | Student | Mark individual words as learned or unlearned           | I can track which words I have memorised                        |
| US5 | Student | Bulk-mark all words learned or reset all to unlearned   | I can quickly update my progress without clicking each card     |
| US6 | Student | Navigate to flashcard study mode with one click         | I can practice vocabulary in an interactive flip-card format    |
| US7 | Student | See all practice tests assigned to this topic           | I know what assessments are available                           |
| US8 | Student | See the status of each practice test at a glance        | I know whether a test is available, in progress, or graded      |
| US9 | Student | See my previous score on completed tests                | I can track my assessment performance over time                 |
| US10| Student | Click an active test to enter it directly               | I can start or resume a test without extra navigation           |
| US11| Student | See inactive tests as non-interactive cards             | I understand they are not yet available without confusion        |
| US12| Student | See my bookmarked questions from this topic's tests     | I can quickly review difficult questions I flagged              |
| US13| Student | Be blocked from accessing this page if not enrolled     | My access is scoped only to topics assigned to my class         |

---

## 3. Functional Requirements

### 3.1 Access Control

- **FR-AUTH-1:** The page requires an authenticated session. Unauthenticated requests are redirected to `/login`.
- **FR-AUTH-2:** Access is verified by checking that a `ClassEnrollment` record exists for the student's `userId`, in a class that has a `TopicAssignment` for the requested `topicId`. If no matching enrollment is found, the page returns a 404 (`notFound()`).
- **FR-AUTH-3:** The topic itself must exist in the database; if not found after access verification, `notFound()` is called.

### 3.2 Hero Section

- **FR-HERO-1:** Display a breadcrumb trail: `My Topics` (links to `/topics`) → language name (current, non-linked).
- **FR-HERO-2:** Render the topic `title` as the primary heading using a gradient text style (`from-[#2a14b4] to-[#6d28d9]`).
- **FR-HERO-3:** Render `topic.description` as a secondary paragraph if it is not null.
- **FR-HERO-4:** Display a circular SVG progress ring showing `progressPercent` (0–100).
  - Ring radius: 54 units, circumference: `2 * π * 54`.
  - Stroke-dashoffset is computed as `C - (C * progressPercent / 100)`.
  - Ring is rotated -90° so the fill starts from the 12 o'clock position.
  - Gradient fill from `#d8d0f8` to `#2a14b4`.
  - Center text: percentage (large, bold), "PROGRESS" label (small, uppercase), and `learnedCount / totalCount` fraction.
- **FR-HERO-5:** Render a "Study Flashcards" CTA button that links to `/topics/[topicId]/flashcards`. The button displays a `style` Material Symbol icon and uses `t("studyFlashcards")`.

### 3.3 Vocabulary Grid

- **FR-VOCAB-1:** Pass all vocabulary items (sorted by `sortOrder` ascending from the database) to the `VocabGrid` client component.
- **FR-VOCAB-2:** Pass `learnedIds` — an array of `vocabularyId` strings where `FlashcardProgress.learned = true` for this student — to `VocabGrid`.
- **FR-VOCAB-3:** Pass `totalCount` (total number of vocabulary items in the topic) to `VocabGrid`.
- **FR-VOCAB-4 (VocabGrid internal):** Display vocabulary items in a responsive grid: 1 column on mobile, 2 on `md`, 4 on `lg`.
- **FR-VOCAB-5 (VocabGrid internal):** Paginate items at 12 per page (`PER_PAGE = 12`). Show pagination controls (prev/next + numbered pages) when `totalPages > 1`. Windowed pagination shows at most 7 page buttons.
- **FR-VOCAB-6 (VocabGrid internal):** Each vocabulary card displays: sequential number (zero-padded), word, grammatical type (italic, if present), pronunciation (italic, if present), meaning, and example sentence (in a "EXAMPLE:" labelled section, if present).
- **FR-VOCAB-7 (VocabGrid internal):** Cards are visually distinct when learned (border `[#a6f2d1]/40`, stronger shadow) vs. not learned (border `[#e2e8f0]`, lighter shadow). A filled `check_circle` icon appears on learned cards; an empty circle border on unlearned.
- **FR-VOCAB-8 (VocabGrid internal):** A bulk-action segmented pill control appears in the section header:
  - Left segment: "Not Learned" — when all are learned, clicking triggers the unlearn confirmation modal.
  - Right segment: "Learned" — when not all are learned, clicking triggers the learn confirmation modal.
  - The active state (all learned vs. not) is reflected by which segment is highlighted.
- **FR-VOCAB-9 (VocabGrid internal):** A confirmation `ModalOverlay` is shown before executing the bulk action. The modal shows the action type, the count of affected words, and Cancel/Confirm buttons.
- **FR-VOCAB-10 (VocabGrid internal):** On confirmation, calls `PUT /api/flashcards` with `{ vocabularyIds: [...], learned: boolean }`. On success, updates local state optimistically, shows a `toast.success` message, and calls `router.refresh()` to re-sync server state. On failure, shows `toast.error`.
- **FR-VOCAB-11:** The item count label (`"{count} Items"`) is hidden on mobile (`hidden sm:block`).

### 3.4 Flashcard CTA

- **FR-FLASH-1:** A styled link button (`/topics/[topicId]/flashcards`) is rendered inside the hero section.
- **FR-FLASH-2:** The button text uses `t("studyFlashcards")` and includes a Material Symbol `style` icon.

### 3.5 Practice Tests Section

- **FR-TESTS-1:** The practice tests section is rendered only when `topic.practiceTests.length > 0`. Tests are fetched with `status IN ("ACTIVE", "INACTIVE")` — DRAFT tests are excluded from the student view.
- **FR-TESTS-2:** Tests are displayed in a responsive card grid: 1 column on mobile, 2 on `md`, 3 on `lg`.
- **FR-TESTS-3:** Each test card shows:
  - A square icon badge (purple `#e3dfff` background, `assignment` icon).
  - `ExamStatusBadge` showing the effective status (session status takes precedence over test status).
  - Previous score pill (colour-coded: green ≥ 80%, yellow 50–79%, red < 50%) if a `PracticeResult` exists.
  - Test `title`.
  - Question count (`t("questionsCount", { count: n })`).
  - Attempt number badge (shown when `examSession.attemptNumber > 1`).
  - "Best Attempt" footer (shown when a score exists but no active exam session).
- **FR-TESTS-4:** ACTIVE tests are rendered as `<Link href="/topics/[topicId]/practice?testId=[id]">` with hover shadow and `exam-ghost-border` CSS class.
- **FR-TESTS-5:** INACTIVE tests are rendered as `<div>` (not `<Link>`, not a button with `onClick`) at 50% opacity with `cursor-not-allowed`. This is intentional: Server Components cannot attach client-side `onClick` handlers.
- **FR-TESTS-6:** Exam session data is fetched per test using `ExamSession.findMany` with `distinct: ["practiceTestId"]` and `orderBy: { attemptNumber: "desc" }` to get the latest session per test. Fields selected: `practiceTestId`, `status`, `attemptNumber`.
- **FR-TESTS-7:** Practice results are fetched from `PracticeResult` for the student across all test IDs in the topic and keyed by `practiceTestId`. Only the most recent result is used (ordered by `completedAt: "desc"`).
- **FR-TESTS-8:** A bottom CTA row appears below the test grid:
  - If `allLearned` is true: a "Retake Assessment" link to `/topics/[topicId]/practice`.
  - If not all words are learned: a locked icon with `t("learnAllWordsFirst")` text (no link).

### 3.6 Bookmarked Questions Section

- **FR-BOOK-1:** A bookmarked questions section appears below the practice tests section (conditionally, only when `bookmarks.length > 0`).
- **FR-BOOK-2:** Bookmarks are fetched from `QuestionBookmark` for the student, joined to `Question`, scoped to questions belonging to tests in this topic.
- **FR-BOOK-3:** Each bookmark row shows:
  - A media thumbnail: image (if `contentMediaType === "image"`), audio icon badge (if `contentMediaType === "audio"`), or numbered label (`Q{n}`) as fallback.
  - Question `content` (truncated to one line).
  - The parent `practiceTest.title` as subtext.
  - The `correctAnswer` as a green pill on the right.
- **FR-BOOK-4:** Bookmarks are ordered by `createdAt: "desc"` (most recently bookmarked first).

### 3.7 Page Metadata

- **FR-META-1:** `generateMetadata` performs a standalone `prisma.topic.findUnique` to retrieve `title` and `description` for use in `<title>` and `<meta name="description">`.
- **FR-META-2:** Fallback title: `"Topic Detail"`. Fallback description: `"Study vocabulary and take practice tests for this topic."`.

---

## 4. Non-Functional Requirements

- **NFR-PERF-1:** All database queries run in the Next.js server-side rendering context; no client-initiated data fetches occur during the initial page render.
- **NFR-PERF-2:** The six primary Prisma queries (access check, topic, flashcard progress, practice results, exam sessions, bookmarks) should complete within 500ms in aggregate under normal database load.
- **NFR-PERF-3:** The loading skeleton (`loading.tsx`) is shown during server-side data fetching via Next.js Suspense/streaming.
- **NFR-SEC-1:** Student access is strictly verified on the server. There is no client-side trust for topic access.
- **NFR-SEC-2:** `correctAnswer` fields are not exposed to the client unless the test mode is "practice". Test-mode exams strip `correctAnswer` at the `practice/page.tsx` level.
- **NFR-A11Y-1:** All interactive elements (links, buttons, modal trigger) are keyboard-accessible and have meaningful labels or aria context.
- **NFR-I18N-1:** All user-visible strings use `getTranslations("student")` (server) or `useTranslations("student")` / `useTranslations("exam")` (client). No hardcoded English strings in the rendering layer.
- **NFR-MAINT-1:** Local TypeScript types (`VocabItem`, `PracticeTestItem`, `ProgressItem`, `PracticeResultItem`) are defined at the top of the file to avoid inference errors from Prisma's raw return types.

---

## 5. UI/UX Requirements

### 5.1 Layout

- **UX-LAYOUT-1:** The page uses a single-column layout (`font-body` root div) inside the student layout's `max-w-screen-2xl mx-auto px-8 pt-12 pb-20` container.
- **UX-LAYOUT-2:** The hero section uses a `grid-cols-1 lg:grid-cols-12` grid: title/CTA in 7 columns, progress ring in 5 columns on large screens; stacked on smaller screens.
- **UX-LAYOUT-3:** The vocabulary grid section has a `mb-16` bottom margin to create separation from the practice tests section.
- **UX-LAYOUT-4:** The bookmarks section has a `mt-12` top margin.

### 5.2 Color System

| Usage                          | Color Token               |
|-------------------------------|---------------------------|
| Primary brand                 | `#2a14b4`                |
| Brand gradient end            | `#6d28d9`                |
| Dark text / headings          | `#121c2a`                |
| Body text                     | `#464554`                |
| Muted / label text            | `#777586`                |
| Ring background               | `#e3dfff`                |
| Learned card border           | `#a6f2d1` (40% opacity)  |
| Unlearned card border         | `#e2e8f0`                |
| Score: high (≥80%)            | `#a6f2d1`/30 bg, `#1b6b51` text |
| Score: medium (50–79%)        | `#fef3c7` bg, `#92400e` text    |
| Score: low (<50%)             | `#ffdada`/50 bg, `#7b0020` text |
| Page background               | `#f8f9ff`                |
| Card background               | `#f8f9ff` (test cards)   |
| White sections                | `#ffffff`                |

### 5.3 Typography

- Font family: `font-body` (CSS variable defined globally).
- Headings: `font-bold`, sizes: `text-3xl md:text-4xl` (H1), `text-2xl` (H2 section headers), `font-bold` (test card titles).
- Labels/badges: `text-[10px]`, `uppercase`, `tracking-[0.15em]` or `tracking-[0.2em]`, `font-bold`.
- Body/description: `text-lg` (hero description), `text-sm` (test descriptions).

### 5.4 Interactive States

- Hero flashcard button: no hover state defined (static CTA).
- Active test cards: hover triggers `shadow-[0_4px_24px_rgba(94,53,241,0.06)]` and `exam-ghost-border` class effect.
- Inactive test cards: `opacity-50`, `cursor-not-allowed`, no hover state.
- VocabGrid pagination: disabled arrows at 30% opacity.
- Modal confirm button: spinner icon (`animate-spin`) during save operation; both buttons disabled while saving.

### 5.5 Decorative Elements

- Hero section: two decorative blobs (absolute-positioned, blurred circles) at `top-right` and `bottom-left`.
- Practice tests section: a gradient corner accent (`top-right`, gradient `from-[#2a14b4]/[0.04]`).

---

## 6. Edge Cases

| Case | Behavior |
|------|----------|
| Topic has 0 vocabulary items | Progress ring shows 0%, `learnedCount / totalCount` = `0 / 0`. `allLearned` is false (`totalCount > 0` guard). No VocabGrid items rendered; grid area is empty but section header shows. |
| Topic has vocabulary but student has 0 progress | `learnedIds` is empty array, `learnedSet` is empty. All cards render in the "not learned" visual state. Progress ring at 0%. |
| All vocabulary learned | `allLearned = true`. Segmented pill shows "Learned" as active. Practice test section bottom CTA changes to "Retake Assessment" link instead of locked state. |
| Topic has no practice tests | Practice tests section is not rendered (`topic.practiceTests.length === 0` guard). |
| All practice tests are INACTIVE | All test cards render as `<div>` with `opacity-50 cursor-not-allowed`. The bottom CTA still shows based on `allLearned`. |
| Student has no exam sessions for a test | `sessionsByTest.get(test.id)` returns `undefined`. `ExamStatusBadge` renders with `testStatus` only (e.g., "Available"). No attempt badge shown. |
| Student has no previous practice results | `resultsByTest.get(test.id)` returns `undefined`. No score pill shown on the test card. |
| Student has completed all attempts for a graded test | `canRetake = false` (handled in `practice/page.tsx`). The topic detail page still renders the test as a Link since it is ACTIVE; gating on attempt exhaustion is delegated to `ExamEntryGate`. |
| Bookmarks list is empty | Bookmarked Questions section is not rendered (`bookmarks.length > 0` guard). |
| Topic description is null | Description paragraph is not rendered (`topic.description && ...` guard). |
| Topic has > 12 vocabulary items | VocabGrid shows page 1 of `Math.ceil(total/12)` pages. Pagination controls appear. |
| Metadata query runs before access check | `generateMetadata` is a separate function and does not perform access verification. The main page function handles access; `generateMetadata` will return fallback strings if the topic is not found. |
| Student is enrolled in multiple classes with the same topic assigned | `findFirst` on `ClassEnrollment` returns on the first match; access is granted. |

---

## 7. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Page load time (server render, p95) | < 800ms | Next.js server timing headers / Vercel analytics |
| Vocabulary marked-learned rate | > 60% of assigned vocabulary marked before test attempt | Prisma `FlashcardProgress` aggregates |
| Flashcard CTA click-through rate | > 40% of topic detail visitors navigate to flashcards | Navigation analytics (page view → flashcard page view) |
| Practice test start rate (active tests) | > 70% of students with `allLearned = true` start at least one test | ExamSession creation events |
| Bulk "mark all learned" modal completion rate | > 80% (users who open modal complete the action) | Modal open event vs. API call event |
| Zero unauthorized access incidents | 100% | Server-side 404 rate for students without enrollment (monitored via error logging) |
| Bookmarked questions section engagement | Track whether bookmarks section is visible (> 0 bookmarks) | QuestionBookmark count per student per topic |
