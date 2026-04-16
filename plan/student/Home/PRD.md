# PRD: Student Home — Topics Listing

**Route:** `/topics`
**Component:** `src/app/(student)/topics/page.tsx`
**Status:** Implemented
**Last Updated:** 2026-04-15

---

## Overview

The Student Home page is the primary landing destination after login for all students. It presents a personalized grid of vocabulary topics assigned to the classes the student is enrolled in. The page establishes the student's learning context (language label), surfaces progress at a glance, and acts as the central hub from which every study workflow originates.

The design follows the VC Class editorial aesthetic: a large, typographically dominant header above a responsive card grid, with pill-shaped language filter tabs for multi-language students.

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Student | See all topics my teacher has assigned to me | I know exactly what I should be studying |
| US-02 | Student | See my vocabulary progress on each topic card | I can prioritize topics where I am behind |
| US-03 | Student | Filter topics by language | I can focus on one language at a time when enrolled in multiple classes |
| US-04 | Student | Click a topic card to open its detail page | I can start studying flashcards or practice tests |
| US-05 | Student | See a clear empty state when no topics are assigned | I understand I need to wait for my teacher instead of thinking the page is broken |
| US-06 | Student | See my preferred learning language as context in the header | I feel the page is personalized to me |
| US-07 | Student | Not see topics from classes I am not enrolled in | My learning experience stays curated and distraction-free |
| US-08 | Teacher (admin action) | Assign a topic to a class | It appears on every enrolled student's home page automatically |

---

## Functional Requirements

### FR-01: Authentication & Authorization
- The page is only accessible to authenticated users with `role = STUDENT`.
- Unauthenticated users are redirected to `/login` via `auth()` in both the route and the layout.
- The layout (`src/app/(student)/layout.tsx`) performs a session guard; the page performs a second check as a defense-in-depth measure.

### FR-02: Topic Fetching via Enrollment
- Topics are fetched through the enrollment graph: `ClassEnrollment → Class → TopicAssignment → Topic`.
- Only topics assigned to classes where `classEnrollments.userId === session.user.id` are shown.
- Topics from classes the student has left or been removed from do not appear.

### FR-03: Deduplication
- A student may be enrolled in multiple classes that share a topic. Each topic must appear at most once.
- Deduplication is performed in-memory using a `Set<string>` of `topicId` values, iterating assignments ordered by `assignedAt DESC` (most recently assigned wins when de-duping).

### FR-04: Vocabulary Progress Calculation
- For each topic, the server fetches `FlashcardProgress` records where `userId === session.user.id`, `vocabularyId IN [topic vocab ids]`, and `learned === true`.
- `learnedWords` = count of vocabulary IDs present in the learned set.
- `totalWords` = `topic.vocabulary.length` (fetched via `include: { vocabulary: true }`).
- Progress percent = `Math.round((learnedWords / totalWords) * 100)`, clamped to 0 when `totalWords === 0`.

### FR-05: Language Context Header
- If `user.learnLanguage` is set, the header badge reads `"{language.name} Language"`.
- If not set, the badge falls back to the `student.curatedCollection` i18n key.
- The heading always reads the `student.topics` i18n key ("My Topics").
- The subheading reads the `student.topicsDescription` i18n key.

### FR-06: Language Filter Tabs
- Unique languages are derived from the deduplicated assignments list (not from a separate query).
- The filter tab list includes an "All" button (always first) and one button per language.
- If only one language is present, the filter row is still rendered (single tab scenario).
- If zero topics are assigned, the language filter row is not rendered (empty state takes over).

### FR-07: Topic Cards
- Each card links to `/topics/[topic.id]` via `<Link>`.
- Card displays: topic title, topic description (or a non-breaking space placeholder), vocabulary progress label, and a progress bar.
- Cards do not display a language badge (language context is available via filter tabs).

### FR-08: Empty State
- When `assignments.length === 0`, a centered empty state is shown with a `menu_book` icon, heading "No topics yet", and the message "No topics assigned yet. Please wait for your teacher."
- The language filter and grid are hidden.

### FR-09: Filtered Empty State
- When language filter is active but returns zero items, a secondary empty state is shown with a `filter_list_off` icon and the `common.noTopicsForLanguage` i18n text.
- This is handled client-side inside `TopicGrid`.

### FR-10: Responsive Grid
- 1 column on mobile (default).
- 2 columns at `md` breakpoint.
- 3 columns at `lg` breakpoint.
- Gap between cards is `gap-10` (40px).

---

## Non-Functional Requirements

### NFR-01: Performance
- The page is a React Server Component; no client-side data fetching occurs for the initial render.
- Prisma queries are sequential (enrollment → progress), not parallelized in the current implementation. A future optimization can run them in parallel using `Promise.all`.
- The loading skeleton (`loading.tsx`) is shown immediately via Next.js Suspense during the DB query.

### NFR-02: Scalability
- In-memory deduplication and progress calculation are acceptable for typical class sizes (≤ 200 topics per student). Beyond that, a SQL-level distinct query should be considered.

### NFR-03: Security
- Session is validated server-side on every request; no topic data is exposed to unauthenticated clients.
- Progress data is scoped strictly to `userId === session.user.id`.

### NFR-04: Accessibility
- All interactive elements (filter buttons, card links) are keyboard navigable.
- Progress bars include implicit numeric percentage text alongside the bar for screen-reader context.
- The empty state uses a `<h2>` heading for proper document hierarchy.

### NFR-05: Internationalisation
- All visible strings are sourced from `next-intl` translation keys.
- The page uses `getTranslations("student")` server-side; `TopicGrid` uses `useTranslations("common")` and `TopicCard` uses `useTranslations("student")` client-side.

---

## UI/UX Requirements

### Layout
- The student layout wraps all content with `bg-[#f8f9ff]`, a `StudentNavbar`, and `max-w-screen-2xl mx-auto px-8 pt-12 pb-20` main area.
- The page adds `font-body` as the base font class.

### Header Section
- Language context badge: small pill, `bg-[#d9e3f6]`, `text-[#464554]`, 10px uppercase tracking-wide text.
- Page title (`h1`): 6xl on mobile, 7xl on md+, bold, `text-[#121c2a]`, tight tracking.
- Description paragraph: `text-lg`, `font-light`, `text-[#464554]`, `max-w-2xl`.
- Header is constrained to `max-w-4xl` and has `mb-16` spacing below it.

### Filter Tabs
- Spacing: `mb-10` below the tab row, `gap-2` between buttons.
- Active tab: `bg-[#2a14b4]`, white text, `shadow-lg shadow-[#2a14b4]/20`.
- Inactive tab: white background, `text-[#464554]`, hover `bg-[#eff4ff]`, card-level shadow.
- All buttons: `px-4 py-1.5`, `rounded-full`, `text-xs`, `font-bold`.

### Topic Cards
- Background: `bg-[var(--color-card,#fff)]`, `rounded-2xl`.
- Shadow: resting `shadow-[0_1px_3px_1px_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.1)]`.
- Hover: elevated shadow + `-translate-y-0.5`.
- Title: `font-bold text-lg text-[#121c2a]`, hover turns `text-[#2a14b4]`, `line-clamp-2`.
- Description: `text-sm text-[#464554]`, `line-clamp-2`, `min-h-[2.5rem]`.
- Progress label: 10px uppercase tracking-widest, `text-[#777586]`.
- Percentage text: `text-[#2a14b4] text-base font-bold`.
- Progress bar track: `bg-[#f0eef6]`, `h-1.5`, `rounded-full`.
- Progress bar fill: `bg-[#2a14b4]`, animated with `transition-all duration-500`.

### Loading State (`loading.tsx`)
- Full-width animated pulse skeleton.
- Skeleton header: two placeholder bars (title + description).
- Skeleton grid mirrors the live grid: 1/2/3 col, 6 placeholder cards with image area + content bars.

---

## Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Student has no class enrollments | Empty state with `menu_book` icon |
| Student is enrolled in a class with no topic assignments | Empty state with `menu_book` icon |
| Student is enrolled in multiple classes sharing the same topic | Topic appears exactly once (first encounter wins, ordered by `assignedAt DESC`) |
| Topic has 0 vocabulary words | Progress bar shows 0%, label shows "0 of 0 words learned", no division-by-zero error |
| All vocabulary words are learned | Progress bar shows 100%, label reflects full count |
| Student has `learnLanguageId = null` | Header badge shows "Curated Collection" fallback |
| Language filter active but no topics match | Filtered empty state with `filter_list_off` icon (handled in `TopicGrid`) |
| Very long topic title | `line-clamp-2` prevents overflow, card height remains consistent |
| Very long topic description | `line-clamp-2` + `min-h-[2.5rem]` ensures consistent card layout |
| Single language across all topics | Filter tab row renders with "All" + one language button |
| Student account is `INACTIVE` | Login page blocks entry before reaching this route |
| Database query timeout | Next.js error boundary (`error.tsx`) catches and renders fallback |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Time to First Meaningful Content (topic cards visible) | < 1.5s on 4G | Lighthouse / Web Vitals in production |
| Empty state display rate | < 5% of authenticated sessions | Server-side logging on `assignments.length === 0` |
| Filter tab interaction rate | > 30% among multi-language students | Client-side event tracking |
| Navigation from topics list to topic detail | > 60% of sessions proceed to a topic | Path analysis in analytics |
| Zero JS errors on page | 0 client-side errors in Sentry | Sentry error tracking |
| Accessibility score | >= 90 (Lighthouse) | Lighthouse CI |
