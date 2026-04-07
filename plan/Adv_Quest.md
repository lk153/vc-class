# Plan: Advanced Question Types

## 1. Overview

Extend the practice test system with advanced question types that mirror real English exam formats. Based on actual test materials (Global Success English 8), these new types cover phonetics, stress patterns, cloze passages, word reordering, and cue-based sentence writing.

### Current Question Types
- `YES_NO` — simple yes/no
- `MULTIPLE_CHOICE` — 4-option MCQ
- `GAP_FILL` — type a single word/phrase

### New Question Types

| Type | Description | Student Interaction |
|------|-------------|-------------------|
| `REORDER_WORDS` | Given scrambled words/phrases, arrange into a correct sentence | Drag-and-drop or tap-to-order |
| `CUE_WRITING` | Given word cues separated by `/`, write a complete sentence | Type full sentence |
| `PRONUNCIATION` | Choose the word with different pronunciation (underlined part) | Select from 4 options |
| `STRESS` | Choose the word with different stress pattern | Select from 4 options |
| `CLOZE_PASSAGE` | Reading passage with numbered blanks, each blank has 4 options | Select answer per blank (grouped questions) |
| `TRUE_FALSE` | Read/listen to content, mark statements as True or False | Toggle T/F per statement |
| `MATCHING` | Match items from column A to column B | Drag or select matching pairs |

---

## 2. Test Structure — Tree Hierarchy

Real English tests follow a strict tree structure:

```
PracticeTest: "Unit 10 - Communication"
├── Part: "Part II: Language"
│   ├── Group: "A. Phonetic"
│   │   ├── Exercise: "Exercise 1: Choose the word whose underlined part..."
│   │   │   ├── Question 1 (PRONUNCIATION)
│   │   │   ├── Question 2 (PRONUNCIATION)
│   │   │   └── ...
│   │   └── Exercise: "Exercise 3: Choose the word whose main stress..."
│   │       ├── Question 1 (STRESS)
│   │       └── ...
│   └── Group: "B. Vocabulary - Grammar"
│       ├── Exercise: "Exercise 1: Choose the correct meaning..."
│       │   └── Question 1-10 (MULTIPLE_CHOICE)
│       └── Exercise: "Exercise 2: Fill in the blank..."
│           └── Question 1-9 (GAP_FILL / MULTIPLE_CHOICE)
├── Part: "Part III: Skills"
│   ├── Group: "A. Listening"
│   │   ├── Exercise: "Exercise 1: Listen and complete the text"
│   │   │   └── Question 1-5 (GAP_FILL + audio content)
│   │   └── Exercise: "Exercise 2: True or False"
│   │       └── Question 1-5 (TRUE_FALSE)
│   ├── Group: "C. Reading"
│   │   └── Exercise: "Read the passage and fill blanks"
│   │       └── Question 1-5 (CLOZE_PASSAGE)
│   └── Group: "D. Writing"
│       ├── Exercise: "Exercise 1: Reorder the words"
│       │   └── Question 1-9 (REORDER_WORDS)
│       └── Exercise: "Exercise 2: Write using cues"
│           └── Question 1-9 (CUE_WRITING)
```

---

## 3. Data Model Changes

### 3.1 New `TestSection` Model (Tree)

A self-referencing tree that represents Part → Group → Exercise hierarchy.

```prisma
enum SectionLevel {
  PART
  GROUP
  EXERCISE
}

model TestSection {
  id             String       @id @default(cuid())
  practiceTestId String       @map("practice_test_id")
  practiceTest   PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  parentId       String?      @map("parent_id")
  parent         TestSection? @relation("SectionTree", fields: [parentId], references: [id], onDelete: Cascade)
  children       TestSection[] @relation("SectionTree")
  level          SectionLevel
  title          String       // e.g. "Part II: Language", "A. Phonetic", "Exercise 1: Choose..."
  description    String?      // exercise instructions (e.g. "Choose the word whose underlined part...")
  sortOrder      Int          @default(0) @map("sort_order")

  // Optional: media for the entire section (e.g. listening audio for all questions in this exercise)
  mediaUrl       String?      @map("media_url")
  mediaType      String?      @map("media_type")  // "audio" | "image" | "video"

  questions      Question[]

  @@map("test_sections")
}
```

### 3.2 Modified `Question` Model — Link to Section

```prisma
model Question {
  // ... existing fields ...

  // ── Section link (optional — backward compatible) ──
  sectionId  String?      @map("section_id")
  section    TestSection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)

  // ── Advanced question data (JSON) ──
  advancedData  String?  @map("advanced_data")

  // ── Sub-question grouping (CLOZE_PASSAGE blanks) ──
  parentQuestionId  String?    @map("parent_question_id")
  parentQuestion    Question?  @relation("SubQuestions", fields: [parentQuestionId], references: [id], onDelete: Cascade)
  subQuestions      Question[] @relation("SubQuestions")
}
```

### 3.3 Modified `PracticeTest` Model — Add sections relation

```prisma
model PracticeTest {
  // ... existing fields ...
  sections  TestSection[]
}
```

### 3.4 Extend `QuestionType` Enum

```prisma
enum QuestionType {
  YES_NO
  MULTIPLE_CHOICE
  GAP_FILL
  REORDER_WORDS
  CUE_WRITING
  PRONUNCIATION
  STRESS
  CLOZE_PASSAGE
  TRUE_FALSE
  MATCHING
}
```

### 3.5 Backward Compatibility

- `sectionId` is nullable — existing questions without sections continue to work
- Tests without sections render flat (current behavior)
- Tests WITH sections render in the tree hierarchy
- The student practice page detects `test.sections.length > 0` to choose rendering mode

### 3.6 How It Works Together

```
PracticeTest
  ├── sections[] ← TestSection tree
  │   ├── TestSection (PART, sortOrder: 1)
  │   │   ├── TestSection (GROUP, sortOrder: 1, parentId: ^)
  │   │   │   ├── TestSection (EXERCISE, sortOrder: 1, parentId: ^)
  │   │   │   │   description: "Choose the word whose underlined part is pronounced differently"
  │   │   │   │   └── questions[] ← Question rows with sectionId pointing here
  │   │   │   └── TestSection (EXERCISE, sortOrder: 2, parentId: ^)
  │   │   └── TestSection (GROUP, sortOrder: 2, parentId: ^)
  │   └── TestSection (PART, sortOrder: 2)
  │
  └── questions[] ← Questions WITHOUT sectionId (legacy flat mode)
```

### 3.7 `advancedData` JSON Schemas Per Type

### 2.3 `advancedData` JSON Schemas Per Type

#### REORDER_WORDS
```json
{
  "fragments": ["telepathy", "ability", "communicate thoughts or ideas", "not by", "five human senses"],
  "correctOrder": [0, 3, 1, 4, 2]
}
```
- `fragments`: array of word/phrase chunks to reorder
- `correctOrder`: array of indices representing the correct arrangement
- `correctAnswer` field stores the full correct sentence: "Telepathy is the ability to communicate thoughts or ideas not by five human senses."
- Student submits their ordered indices; validated against `correctOrder`

#### CUE_WRITING
```json
{
  "cues": ["telepathy", "help", "us feel", "calm", "concentrated", "difficult times"],
  "hint": "Use present simple tense"
}
```
- `cues`: the word fragments shown to student separated by `/`
- `hint`: optional grammar hint
- `correctAnswer`: the full correct sentence
- Validation: case-insensitive match, or fuzzy match with tolerance for minor differences

#### PRONUNCIATION
```json
{
  "underlinedParts": ["a", "i", "a", "a"]
}
```
- Each element corresponds to `answer1`-`answer4`
- The underlined letter/syllable in each word
- Rendered: the word with the specific part underlined
- `correctAnswer`: the word that has different pronunciation

#### STRESS
```json
{
  "stressPositions": [2, 1, 3, 2]
}
```
- Syllable position of main stress for each answer word
- Student picks the word with different stress pattern
- Rendered with stress marks or syllable highlighting

#### CLOZE_PASSAGE
```json
{
  "passage": "The (1) ________ \"telepathy\" has been derived from the words \"tele\" meaning \"distance\" and \"pathy\" meaning \"feeling\". So telepathy actually means getting feelings through a distance. Telepathy is the communication (2) ________ two minds, separated over a distance, without the (3) ________ of the five known senses.",
  "blanks": [
    { "number": 1, "questionId": "sub-q-1" },
    { "number": 2, "questionId": "sub-q-2" },
    { "number": 3, "questionId": "sub-q-3" }
  ]
}
```
- Parent question stores the passage text with numbered blanks
- Each blank is a sub-question (regular MULTIPLE_CHOICE) linked via `parentQuestionId`
- Student sees the full passage and answers each blank

#### TRUE_FALSE
```json
{
  "statements": [
    "The author thinks that Facebook is the best way to communicate.",
    "Travel and meeting budgets were the first to get cut back.",
    "Body language speaks a lot louder than words."
  ]
}
```
- Can also use the standard answer1/answer2 approach with "True"/"False"
- Or store statements in `advancedData` and link to sub-questions
- Typically paired with a reading/listening passage via `contentMediaUrl`

#### MATCHING
```json
{
  "columnA": ["keep in touch", "communicate", "social contact", "send a message"],
  "columnB": ["giao tiếp", "liên lạc", "gửi tin nhắn", "giao tiếp xã hội"],
  "correctPairs": [[0, 1], [1, 0], [2, 3], [3, 2]]
}
```
- Student matches items from A to B
- `correctPairs`: array of [indexA, indexB] pairs

---

## 4. Student UI Per Type

### 3.1 REORDER_WORDS

```
┌─────────────────────────────────────────────┐
│ Reorder the words to make a correct sentence│
│                                             │
│ Available fragments:                        │
│ ┌──────────┐ ┌───────┐ ┌─────────────────┐ │
│ │ not by   │ │ability│ │communicate ideas│ │
│ └──────────┘ └───────┘ └─────────────────┘ │
│ ┌──────────────────┐ ┌──────────┐          │
│ │five human senses │ │telepathy │          │
│ └──────────────────┘ └──────────┘          │
│                                             │
│ Your sentence:                              │
│ ┌──────────┐ ┌───────┐ ┌──────────┐        │
│ │telepathy │→│ability│→│ not by   │→ ...   │
│ └──────────┘ └───────┘ └──────────┘        │
│                                             │
│ [Submit]                                    │
└─────────────────────────────────────────────┘
```

**Interaction:**
- **Desktop:** Drag fragments from "Available" area to "Your sentence" area. Drag to reorder within the sentence.
- **Mobile:** Tap a fragment to add it to the end of the sentence. Tap a placed fragment to remove it back to available.
- Show numbered positions (1, 2, 3...) in the sentence area
- Correct: green highlight on all fragments; Incorrect: red, then show correct order

**Implementation:**
- Use `@dnd-kit/core` for drag-and-drop (desktop)
- Tap-to-place for mobile (simpler, more reliable)
- State: `availableFragments[]` and `orderedFragments[]`
- Submit: compare student order against `correctOrder`

### 3.2 CUE_WRITING

```
┌─────────────────────────────────────────────┐
│ Write a sentence using the cues below       │
│                                             │
│ telepathy / help / us feel / calm /         │
│ concentrated / difficult times              │
│                                             │
│ Hint: Use present simple tense              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Telepathy helps us feel calm and        │ │
│ │ concentrated in difficult times.        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Submit]                                    │
└─────────────────────────────────────────────┘
```

**Interaction:**
- Show cues as styled chips separated by `/`
- Student types full sentence in a textarea
- Validation: exact match (case-insensitive, trimmed) against `correctAnswer`
- Optional: fuzzy matching allowing minor punctuation/article differences

### 3.3 PRONUNCIATION

```
┌─────────────────────────────────────────────┐
│ Choose the word whose underlined part is    │
│ pronounced differently from the others.     │
│                                             │
│ A. l_a_nguage   B. cult_u_ral              │
│ C. inter_a_ct   D. l_a_ndline             │
│                                             │
└─────────────────────────────────────────────┘
```

**Rendering:**
- Each answer word has a specific letter/syllable underlined (from `advancedData.underlinedParts`)
- Render with `<u>` tag or bottom border styling on the specific characters
- Otherwise identical to MULTIPLE_CHOICE interaction

### 3.4 STRESS

```
┌─────────────────────────────────────────────┐
│ Choose the word whose main stress is        │
│ different from the others in the group.     │
│                                             │
│ A. social      B. video                     │
│ C. media       D. trainee                   │
│                                             │
│ (stress marks shown: SO•cial, VI•deo,       │
│  ME•dia, trai•NEE)                          │
└─────────────────────────────────────────────┘
```

**Rendering:**
- Show stress position indicator (dot above stressed syllable, or bold the stressed syllable)
- Otherwise identical to MULTIPLE_CHOICE interaction

### 3.5 CLOZE_PASSAGE

```
┌─────────────────────────────────────────────┐
│ Read the passage and fill in the blanks     │
│                                             │
│ The (1)_____ "telepathy" has been derived   │
│ from the words "tele" meaning "distance"    │
│ and "pathy" meaning "feeling". Telepathy    │
│ is the communication (2)_____ two minds,    │
│ separated over a distance, without the      │
│ (3)_____ of the five known senses.          │
│                                             │
│ 1: [A. word ▾]  2: [B. among ▾]            │
│ 3: [A. using ▾]                             │
│                                             │
│ [Submit All]                                │
└─────────────────────────────────────────────┘
```

**Interaction:**
- Full passage rendered with numbered blanks highlighted
- Below the passage: dropdown or button group for each blank
- All blanks must be answered before submit
- Results show which blanks were correct/incorrect inline

### 3.6 TRUE_FALSE

```
┌─────────────────────────────────────────────┐
│ Listen/Read and mark T (True) or F (False)  │
│                                             │
│ 1. The author thinks Facebook is the best   │
│    way to communicate.          [T] [F]     │
│                                             │
│ 2. Travel budgets were the first to get     │
│    cut back.                    [T] [F]     │
│                                             │
│ 3. Body language speaks louder than words.  │
│                                 [T] [F]     │
│                                             │
│ [Submit All]                                │
└─────────────────────────────────────────────┘
```

**Interaction:**
- Each statement has T/F toggle buttons
- Can be paired with audio/reading passage via `contentMediaUrl`
- Submit validates all answers together

### 3.7 MATCHING

```
┌─────────────────────────────────────────────┐
│ Match items from Column A to Column B       │
│                                             │
│ Column A          Column B                  │
│ 1. keep in touch  ── a. giao tiếp          │
│ 2. communicate    ── b. liên lạc            │
│ 3. social contact ── c. gửi tin nhắn        │
│ 4. send a message ── d. giao tiếp xã hội   │
│                                             │
│ Your matches: 1→b, 2→a, 3→d, 4→c           │
│                                             │
│ [Submit]                                    │
└─────────────────────────────────────────────┘
```

**Interaction:**
- **Desktop:** Draw lines by clicking A item then B item
- **Mobile:** Tap A item, then tap matching B item
- Show connected pairs with colored lines
- Correct: green lines; Incorrect: red lines + show correct

---

## 5. Student UI — Hierarchical Test Rendering

When a test has sections, the student practice page renders in **exam mode** instead of one-question-at-a-time:

```
┌─────────────────────────────────────────────────┐
│ Unit 10 - Communication                        │
│ ⏱ Total time: 45:00                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ▸ PART II: LANGUAGE                             │
│                                                 │
│   A. PHONETIC                                   │
│                                                 │
│   Exercise 1: Choose the word whose underlined  │
│   part is pronounced differently from the       │
│   others.                                       │
│                                                 │
│   1. A. l_a_nguage  B. cult_u_ral              │
│      C. inter_a_ct  D. l_a_ndline    [ ]       │
│                                                 │
│   2. A. multim_e_dia  B. landl_i_ne            │
│      C. v_i_deo  D. commun_i_cate   [ ]       │
│                                                 │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─         │
│                                                 │
│   Exercise 3: Choose the word whose main stress │
│   is different from the others in the group.    │
│                                                 │
│   1. A. social  B. video                        │
│      C. media   D. trainee           [ ]       │
│                                                 │
│   B. VOCABULARY - GRAMMAR                       │
│   ...                                           │
│                                                 │
│ ▸ PART III: SKILLS                              │
│                                                 │
│   A. LISTENING  🎧                              │
│   [▶ Play Audio]                                │
│                                                 │
│   Exercise 1: Listen and complete the text.     │
│   1. _________ [ type answer ]                  │
│   2. _________ [ type answer ]                  │
│                                                 │
│   D. WRITING                                    │
│                                                 │
│   Exercise 2: Write using the cues given below. │
│                                                 │
│   What is telepathy?                            │
│   1. telepathy / ability / communicate /        │
│      not by / five human senses                 │
│      [ __________________________________ ]     │
│                                                 │
├─────────────────────────────────────────────────┤
│ [Submit Test]                     Answered: 35/50│
└─────────────────────────────────────────────────┘
```

### Two Rendering Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Classic** (current) | Test has NO sections | One question at a time, timer per question, immediate feedback |
| **Exam Mode** (new) | Test HAS sections | All questions on one scrollable page, single global timer, submit all at once |

### Exam Mode Features
- **Sidebar navigation:** Clickable question numbers (1-50) showing answered/unanswered status
- **Global timer:** Single countdown for entire test (configurable total minutes)
- **Section headers:** Part → Group → Exercise titles rendered inline
- **Exercise instructions:** Shown once above the question group, with optional audio player
- **Progress bar:** "Answered 35 of 50" at bottom
- **Submit all:** Single button to submit all answers at once
- **Auto-save:** Answers saved to localStorage as student works

---

## 6. Schema Migration

```sql
-- Create SectionLevel enum
CREATE TYPE "SectionLevel" AS ENUM ('PART', 'GROUP', 'EXERCISE');

-- Create test_sections table
CREATE TABLE "test_sections" (
  "id" TEXT NOT NULL,
  "practice_test_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "level" "SectionLevel" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INT NOT NULL DEFAULT 0,
  "media_url" TEXT,
  "media_type" TEXT,
  CONSTRAINT "test_sections_pkey" PRIMARY KEY ("id"),
  FOREIGN KEY ("practice_test_id") REFERENCES "practice_tests"("id") ON DELETE CASCADE,
  FOREIGN KEY ("parent_id") REFERENCES "test_sections"("id") ON DELETE CASCADE
);

-- Add new enum values to QuestionType
ALTER TYPE "QuestionType" ADD VALUE 'REORDER_WORDS';
ALTER TYPE "QuestionType" ADD VALUE 'CUE_WRITING';
ALTER TYPE "QuestionType" ADD VALUE 'PRONUNCIATION';
ALTER TYPE "QuestionType" ADD VALUE 'STRESS';
ALTER TYPE "QuestionType" ADD VALUE 'CLOZE_PASSAGE';
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';

-- Add new columns to questions
ALTER TABLE "questions"
  ADD COLUMN "section_id" TEXT REFERENCES "test_sections"("id") ON DELETE SET NULL,
  ADD COLUMN "advanced_data" TEXT,
  ADD COLUMN "parent_question_id" TEXT REFERENCES "questions"("id") ON DELETE CASCADE;
```

---

## 7. Answer Validation Per Type

| Type | Student Submits | Validation |
|------|----------------|------------|
| REORDER_WORDS | `orderedIndices: [0, 3, 1, 4, 2]` | Compare array against `advancedData.correctOrder` |
| CUE_WRITING | `sentence: "Telepathy helps us..."` | Case-insensitive trim match against `correctAnswer`. Optional: Levenshtein distance < 3 for typo tolerance |
| PRONUNCIATION | `selectedAnswer: "interact"` | Standard text match against `correctAnswer` |
| STRESS | `selectedAnswer: "trainee"` | Standard text match against `correctAnswer` |
| CLOZE_PASSAGE | `answers: { "1": "word", "2": "between" }` | Each blank validated against its sub-question's `correctAnswer` |
| TRUE_FALSE | `answers: { "1": "True", "2": "False" }` | Each statement validated against sub-question or stored answers |
| MATCHING | `pairs: [[0,1], [1,0], [2,3], [3,2]]` | Compare pairs array against `advancedData.correctPairs` |

### Special: `selectedAnswer` Storage

For complex types, `selectedAnswer` in `StudentAnswer` stores JSON:
```typescript
// REORDER_WORDS
selectedAnswer: "[0,3,1,4,2]"

// CLOZE_PASSAGE (per sub-question)
selectedAnswer: "word"  // standard text

// MATCHING
selectedAnswer: "[[0,1],[1,0],[2,3],[3,2]]"

// TRUE_FALSE
selectedAnswer: "True"  // or "False"
```

---

## 8. Teacher Editor Changes

### 6.1 QuestionEditor — Type-Specific Forms

When teacher selects a question type, show the appropriate editor:

**REORDER_WORDS editor:**
```
Fragments (one per line):
[ telepathy              ]
[ ability                ]
[ communicate thoughts   ]
[ not by                 ]
[ five human senses      ]
[+ Add fragment]

Correct sentence:
[ Telepathy is the ability to communicate thoughts not by five human senses. ]

Correct order (drag to reorder or enter indices):
[ 0, 3, 1, 4, 2 ]
```

**CUE_WRITING editor:**
```
Cues (separated by /):
[ telepathy / help / us feel / calm / concentrated / difficult times ]

Hint (optional):
[ Use present simple tense ]

Correct sentence:
[ Telepathy helps us feel calm and concentrated in difficult times. ]
```

**PRONUNCIATION editor:**
```
Standard 4-answer MCQ form +
Underlined parts (one per answer):
Answer 1: language    Underlined: [ a ]
Answer 2: cultural    Underlined: [ u ]
Answer 3: interact    Underlined: [ a ]
Answer 4: landline    Underlined: [ a ]
```

**CLOZE_PASSAGE editor:**
```
Passage (use {1}, {2}, {3} for blanks):
[ The (1)_____ "telepathy" has been derived from... ]

Blank 1: [A. word] [B. phrase] [C. letter] [D. signal]  Correct: [A. word]
Blank 2: [A. through] [B. among] [C. between] [D. across]  Correct: [C. between]
...
```

### 6.2 CSV Import — New Columns

For simple types (PRONUNCIATION, STRESS): same CSV format, just new `question_type` values.

For complex types, use `advanced_data` column with JSON:
```csv
question_number,content,question_type,advanced_data,answer_1,answer_2,answer_3,answer_4,correct_answer,timer
1,"Reorder to make a sentence",REORDER_WORDS,"{""fragments"":[""telepathy"",""ability"",""communicate""],""correctOrder"":[0,2,1]}",,,,,Telepathy communicate ability,30
```

---

## 9. Implementation Phases

### Phase 1: Schema + API Foundation

| # | Task |
|---|------|
| 1 | Prisma migration: `SectionLevel` enum, `test_sections` table, new `QuestionType` values, `section_id` + `advanced_data` + `parent_question_id` on questions |
| 2 | `prisma generate` |
| 3 | Create `POST/PUT/DELETE /api/teacher/test-sections` — CRUD for test sections |
| 4 | Update `PUT /api/teacher/questions` to accept `advancedData`, `sectionId` |
| 5 | Update `POST /api/practice-tests/import` for new types + sections |
| 6 | Update `GET /api/teacher/practice-tests/[testId]` to return sections tree + `advancedData` |

### Phase 2: Teacher — Section Builder

| # | Task |
|---|------|
| 7 | `TestSectionBuilder` component — tree editor for Part → Group → Exercise |
| 8 | Add/edit/delete/reorder sections within the test detail modal |
| 9 | Assign questions to sections (drag or dropdown) |
| 10 | Section-level media attachment (e.g., listening audio for an exercise) |

### Phase 3: Teacher — Advanced Question Editors

| # | Task |
|---|------|
| 11 | REORDER_WORDS editor form — fragment list + correct order |
| 12 | CUE_WRITING editor form — cue input + hint + correct sentence |
| 13 | PRONUNCIATION editor form — MCQ + underlined part per answer |
| 14 | STRESS editor form — MCQ + stress position per answer |
| 15 | CLOZE_PASSAGE editor — passage textarea + sub-question blanks |
| 16 | TRUE_FALSE editor — statements list + T/F toggle per statement |
| 17 | MATCHING editor — column A + column B + pair connections |
| 18 | Update CSV importer for new types + section structure |

### Phase 4: Student — Exam Mode (Hierarchical Rendering)

| # | Task |
|---|------|
| 19 | `ExamSession` component — full-page scrollable test with sections |
| 20 | Section header rendering (Part → Group → Exercise with instructions) |
| 21 | Sidebar question navigator (clickable question numbers) |
| 22 | Global timer (single countdown for entire test) |
| 23 | Auto-save answers to localStorage as student works |
| 24 | "Submit All" with confirmation |
| 25 | Progress indicator ("Answered 35 of 50") |

### Phase 5: Student — Advanced Question Renderers

| # | Task |
|---|------|
| 26 | PRONUNCIATION renderer — word with underlined part |
| 27 | STRESS renderer — word with stress indicator |
| 28 | TRUE_FALSE renderer — statement list with T/F toggles |
| 29 | CUE_WRITING renderer — cue chips + textarea |
| 30 | REORDER_WORDS renderer — drag/tap-to-order UI |
| 31 | Install `@dnd-kit/core` for drag-and-drop |
| 32 | CLOZE_PASSAGE renderer — passage with inline dropdowns |
| 33 | MATCHING renderer — two-column connection UI |

### Phase 6: Answer Validation + Results

| # | Task |
|---|------|
| 34 | Validate REORDER_WORDS (array comparison) |
| 35 | Validate CUE_WRITING (exact + fuzzy match) |
| 36 | Validate CLOZE_PASSAGE (per-blank) |
| 37 | Validate MATCHING (pairs comparison) |
| 38 | Validate TRUE_FALSE (per-statement) |
| 39 | Exam mode results page — score per section/part breakdown |
| 40 | Update ResultDetailModal for new types |
| 41 | Update ResultsScreen for new types |

### Phase 7: Polish & QA

| # | Task |
|---|------|
| 42 | Mobile responsiveness for exam mode + drag-and-drop |
| 43 | Animations for reorder and matching |
| 44 | Translation keys (EN + VI) |
| 45 | Seed data: one full exam with Part/Group/Exercise structure + advanced questions |
| 46 | End-to-end testing: create sections → add questions → student takes exam → review results |

---

## 10. File Changes Summary

| File | Change | Phase |
|------|--------|-------|
| `prisma/schema.prisma` | Add `SectionLevel` enum, `TestSection` model, new `QuestionType` values, new fields on Question | 1 |
| `prisma/migrations/xxx/migration.sql` | CREATE TYPE + CREATE TABLE + ALTER TYPE + ALTER TABLE | 1 |
| `src/app/api/teacher/test-sections/route.ts` | **New** — CRUD for test sections | 1 |
| `src/app/api/teacher/questions/route.ts` | Accept `advancedData`, `sectionId` | 1 |
| `src/app/api/practice-tests/import/route.ts` | Handle new types + sections | 1 |
| `src/app/api/teacher/practice-tests/[testId]/route.ts` | Return sections tree + `advancedData` | 1 |
| `src/components/teacher/TestSectionBuilder.tsx` | **New** — tree editor for Part/Group/Exercise | 2 |
| `src/components/teacher/QuestionEditor.tsx` | Type-specific editor forms | 3 |
| `src/components/teacher/PracticeTestGrid.tsx` | Section builder integration in test detail modal | 2 |
| `src/components/teacher/CsvImporter.tsx` | New type validation + section columns | 3 |
| `src/components/student/ExamSession.tsx` | **New** — full-page hierarchical test with global timer | 4 |
| `src/components/student/ExamSidebar.tsx` | **New** — clickable question navigator | 4 |
| `src/components/student/PracticeSession.tsx` | Detect exam mode, delegate to ExamSession | 4 |
| `src/components/student/ReorderWords.tsx` | **New** — drag/tap reorder UI | 5 |
| `src/components/student/CueWriting.tsx` | **New** — cue chips + textarea | 5 |
| `src/components/student/ClozePassage.tsx` | **New** — passage with inline dropdowns | 5 |
| `src/components/student/MatchingPairs.tsx` | **New** — two-column connection UI | 5 |
| `src/components/student/TrueFalseList.tsx` | **New** — statement list with T/F toggles | 5 |
| `src/components/student/PronunciationQ.tsx` | **New** — MCQ with underlined parts | 5 |
| `src/components/student/StressQ.tsx` | **New** — MCQ with stress indicators | 5 |
| `src/components/teacher/ResultDetailModal.tsx` | Show advanced answers + section breakdown | 6 |
| `src/components/student/ResultsScreen.tsx` | Score per section/part breakdown | 6 |
| `src/app/(student)/topics/[topicId]/practice/page.tsx` | Pass sections to ExamSession | 4 |
| `messages/en.json` | Translation keys | 7 |
| `messages/vi.json` | Vietnamese translations | 7 |

---

## 11. Risks & Mitigations

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Drag-and-drop on mobile** — touch conflicts with scrolling | Use `@dnd-kit` touch sensor with activation delay; provide tap-to-place fallback |
| 2 | **CUE_WRITING exact match too strict** — students write correct sentence with minor differences (extra comma, "the" vs no "the") | Implement fuzzy matching: normalize whitespace/punctuation, optional Levenshtein distance threshold |
| 3 | **CLOZE_PASSAGE sub-questions complexity** — parent/child relationship adds query complexity | Keep sub-questions as regular Question rows with `parentQuestionId`; fetch all in one query with `include: { subQuestions }` |
| 4 | **Enum migration on PostgreSQL** — adding values to existing enum requires special handling | Use `ALTER TYPE ... ADD VALUE` which is safe and non-blocking |
| 5 | **`advancedData` as JSON string** — no DB-level validation | Validate JSON structure in API layer before saving; provide TypeScript types for each format |
| 6 | **MATCHING rendering complexity** — drawing SVG lines between columns | Use simple index-based matching UI instead of SVG lines for v1; upgrade to visual lines in v2 |
| 7 | **Section tree depth** — 3-level tree (Part/Group/Exercise) adds UI complexity | Keep the tree editor simple: collapsible list, not a full tree visualizer. Max 3 levels enforced in UI |
| 8 | **Exam mode vs Classic mode** — two very different UIs to maintain | Share question renderer components between both modes; only the layout wrapper differs |
| 9 | **Global timer in exam mode** — students may lose work on timeout | Auto-save all answers to localStorage every 30s; submit what's answered on timeout instead of discarding |
| 10 | **Section-level scoring** — teacher wants per-part/per-group score breakdown | Store section hierarchy in result; compute Part II score, Part III score separately in results view |

---

## 12. Open Questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should REORDER_WORDS support drag-and-drop on mobile? | Start with tap-to-place (simpler); add drag later if needed |
| 2 | How strict should CUE_WRITING validation be? | Case-insensitive + trim. Allow ±2 Levenshtein distance. Show "almost correct" feedback for close matches |
| 3 | Should CLOZE_PASSAGE have its own timer or per-blank timer? | Single timer for the entire passage (all blanks) — exam mode has global timer |
| 4 | Should MATCHING support partial scoring? | Yes — each correct pair scores independently (e.g., 3/4 pairs correct = 75% for that question) |
| 5 | Priority order for implementation? | Phase 1-2 (schema + sections) first, then REORDER_WORDS + CUE_WRITING (user request), then exam mode, then remaining types |
| 6 | Can a test have BOTH flat questions and sections? | No — a test is either flat (classic mode) or sectioned (exam mode). Enforced by UI: once a section is added, all questions must be in a section |
| 7 | Should exam mode show one section at a time or all at once? | All at once on a scrollable page (like a real exam). Sidebar navigator for jumping between parts |
| 8 | Should per-section time limits be supported? | Defer to v2. For v1, single global timer for the entire exam |
| 9 | How to handle section media (e.g., listening audio shared by all questions in an exercise)? | `TestSection.mediaUrl` stores the audio/image. Rendered once above the exercise questions. Audio plays via shared `AudioPlayer` |
