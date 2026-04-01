# Requirements
I need to build e-learning website that help student to learn & practice on each assigned topic from their teachers:

The flow using of `Student` site (http://localhost:18888) will be:
1/ Student goes to `Student` website and register account: email, name, password, learn language (currently, we support English and Chinese firstly, so make it as separated data migration that I could adjust in future for more support language for learning) (student account 's status after registered will be `inactive` ). Student account need to be activated by teacher.
2/ After activated, student could login. then it will redirect to `Topic List` page which it's content is depended on the topics assigned to the classes the student is enrolled in
3/ Student will choose any topic then it will redirect student to `Topic Detail` page:
    - Topic will have Flashcard page to learn new vocabulary (E.g: 8 new words, when student swipes to right as `Learned` for this word, or swipe to left as `Not Learn`)
    - After confirming learned all vocabulary. It will show button `Practice`. Student will submit this button to start randomly practice

4/ The Practice will have many kind of questions:
    - Yes/No question
    - Multiple Choices question
    - Gap-fill question

    For each question, when student already submitted their answer, it will show right or wrong for that question immediately. Then after finishing all questions, the remain questions which student has answer wrongly will be retry to answer again (just have max 3 times to re-try answer)

5/ After finish answering all questions (include retried questions). System will calculate score for this practice. Then it will redirect student go to `Result Overview` page which will show:
 - how many correct & incorrect questions
 - Total score of this practice
 - Button `Review Topic` to go back to `Topic Summary` page to re-learn new words or grammar which student want to review again


Beside the `Student` website, we have `Teacher` site (http://localhost:18888/teacher) for:
1/ Manage classes (create, edit, delete classes with language, level, schedule, dates, capacity)
2/ Enroll students into classes
3/ Assign `Topic` to classes which topic could be learned by enrolled students. E.g: Teacher A assigns `Park` & `Playground` topic to Class X. Then students enrolled in Class X can view `Park` & `Playground` topic when they go to `Topic List` page on Student site
4/ Assign `Practice Test` to their student via topics
5/ View & comment on student `Practice Results`
6/ Manage media files (images, audio, video) uploaded to Vercel Blob storage


NOTE:

`Practice Test` is the list of questions which is imported by teacher. Import file is csv file which has columns: question_number, question_content, question_type, answer_1, answer_2, answer_3, answer_4, correct_answers

E.g
question_number, question_content, question_type, answer_1, answer_2, answer_3, answer_4, correct_answers
1, "What is this?", "multiple_choice", "tiger", "lion", "cat", "dog", "answer_1" (Yes-No question will match correct answer with `correct_answers` column only)
2, "Is it green?", "yes_no", "Yes", "No", "", "", "answer_1" (Yes-No question will match correct answer with `correct_answers` column only)
3, "What is drink?", "gap_fill", "juice", "", "", "", "" (Gap-fill question will match correct answer with `answer_1` column only)



# UI
UI needs to be clean, bright, especially that suitable for student learning and reading

# UX
UX is easier for new users (student, teacher) could be familar to use

# Tech stacks:

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL 16 (Supabase in production, Docker locally)
- **ORM**: Prisma 7 (with `@prisma/adapter-pg` for Supabase SSL compatibility)
- **Auth**: NextAuth.js v5 (credentials login, JWT strategy)
- **Validation**: Zod
- **Icons**: Material Symbols Outlined
- **i18n**: English & Vietnamese (UI) via `next-intl`
- **Media Storage**: Vercel Blob
- **Toasts**: Sonner

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)


### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```
DATABASE_URL="postgresql://luminaled:luminaled@localhost:5433/luminaled"
NEXTAUTH_URL="http://localhost:18888"
NEXTAUTH_SECRET="generate-a-random-secret-here"
BLOB_READ_WRITE_TOKEN="vercel-blob-token-here"
```

---

# Implementation Plan

## Key Design Decisions

- **Port**: `18888` for everything (dev server + NEXTAUTH_URL)
- **Learn languages vs i18n**: Two separate concepts:
  - **Learn languages** (English, Chinese) = curriculum content, stored in DB `Language` table, seeded via migration
  - **i18n** (English, Vietnamese) = UI translations via `next-intl` JSON message files
- **Single Next.js app**: Student routes at `/`, Teacher routes at `/teacher/*`, separated by middleware role checks
- **Flashcard swipe**: CSS transforms + custom pointer/touch event hook (no extra library)
- **Class-based model**: Students are enrolled in Classes. Topics are assigned to Classes (not directly to students). Students see topics from all their enrolled classes.
- **Prisma adapter**: Uses `@prisma/adapter-pg` with custom SSL config to support Supabase's PostgreSQL

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project
- `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Update `package.json` dev script: `"dev": "next dev -p 18888"`

### 1.2 Docker Compose — PostgreSQL 16

File: `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: luminaled
      POSTGRES_PASSWORD: luminaled
      POSTGRES_DB: luminaled
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 1.3 Environment Variables

File: `.env.example`
```
DATABASE_URL="postgresql://luminaled:luminaled@localhost:5433/luminaled"
NEXTAUTH_URL="http://localhost:18888"
NEXTAUTH_SECRET="generate-a-random-secret-here"
BLOB_READ_WRITE_TOKEN="vercel-blob-token-here"
```

### 1.4 npm Dependencies

**Production:**
```
next@16  react@19  typescript  tailwindcss@4
prisma@7  @prisma/client@7  @prisma/adapter-pg  pg
next-auth@5  @auth/prisma-adapter  bcryptjs  zod  next-intl  papaparse  sonner
@vercel/blob
```

**Dev:**
```
@types/bcryptjs  @types/papaparse  @types/pg
```

### 1.5 i18n Setup (next-intl)

- `messages/en.json` — English UI strings
- `messages/vi.json` — Vietnamese UI strings
- `src/lib/i18n/request.ts` — `getRequestConfig` reads locale from cookie (default: "en", 1-year expiry)
- Locale switcher: `POST /api/locale` sets cookie

### 1.6 Material Symbols Outlined

Add Google Fonts link in root layout `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
```
Usage: `<span className="material-symbols-outlined">home</span>`

### 1.7 Tailwind v4 Theme

File: `src/app/globals.css`
```css
@import "tailwindcss";
```

---

## Phase 2: Database Schema (Prisma)

### 2.1 Prisma Schema

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  STUDENT
  TEACHER
}

enum AccountStatus {
  INACTIVE
  ACTIVE
}

enum QuestionType {
  YES_NO
  MULTIPLE_CHOICE
  GAP_FILL
}

enum ClassStatus {
  SCHEDULING
  ACTIVE
  ENDED
  CANCELLED
}

model User {
  id              String        @id @default(cuid())
  email           String        @unique
  name            String
  passwordHash    String        @map("password_hash")
  role            UserRole      @default(STUDENT)
  status          AccountStatus @default(INACTIVE)
  learnLanguageId String?       @map("learn_language_id")
  learnLanguage   Language?     @relation(fields: [learnLanguageId], references: [id])
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  classEnrollments  ClassEnrollment[]
  practiceResults   PracticeResult[]
  studentAnswers    StudentAnswer[]
  flashcardProgress FlashcardProgress[]
  comments          Comment[]
  createdTopics     Topic[]        @relation("TopicCreator")
  createdTests      PracticeTest[] @relation("TestCreator")
  teachingClasses   Class[]        @relation("ClassTeacher")
  media             Media[]

  @@map("users")
}

model Language {
  id        String   @id @default(cuid())
  code      String   @unique      // "en", "zh"
  name      String                 // "English", "Chinese"
  createdAt DateTime @default(now()) @map("created_at")

  users   User[]
  topics  Topic[]
  classes Class[]

  @@map("languages")
}

model Class {
  id           String      @id @default(cuid())
  name         String
  languageId   String      @map("language_id")
  language     Language    @relation(fields: [languageId], references: [id])
  level        String
  schedule     String                     // JSON string: [{day, startTime, endTime}]
  startDate    DateTime    @map("start_date")
  endDate      DateTime    @map("end_date")
  teacherId    String      @map("teacher_id")
  teacher      User        @relation("ClassTeacher", fields: [teacherId], references: [id])
  maxStudents  Int         @default(10) @map("max_students")
  specialNotes String?     @map("special_notes")
  status       ClassStatus @default(SCHEDULING)
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  enrollments      ClassEnrollment[]
  topicAssignments TopicAssignment[]

  @@map("classes")
}

model ClassEnrollment {
  id         String   @id @default(cuid())
  classId    String   @map("class_id")
  class      Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  enrolledAt DateTime @default(now()) @map("enrolled_at")

  @@unique([classId, userId])
  @@map("class_enrollments")
}

model Topic {
  id          String   @id @default(cuid())
  title       String
  description String?
  languageId  String   @map("language_id")
  language    Language @relation(fields: [languageId], references: [id])
  createdById String   @map("created_by_id")
  createdBy   User     @relation("TopicCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  vocabulary       Vocabulary[]
  topicAssignments TopicAssignment[]
  practiceTests    PracticeTest[]

  @@map("topics")
}

model Vocabulary {
  id        String   @id @default(cuid())
  word      String
  meaning   String
  example   String?
  topicId   String   @map("topic_id")
  topic     Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  flashcardProgress FlashcardProgress[]

  @@map("vocabularies")
}

model FlashcardProgress {
  id           String     @id @default(cuid())
  userId       String     @map("user_id")
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  vocabularyId String     @map("vocabulary_id")
  vocabulary   Vocabulary @relation(fields: [vocabularyId], references: [id], onDelete: Cascade)
  learned      Boolean    @default(false)
  learnedAt    DateTime?  @map("learned_at")

  @@unique([userId, vocabularyId])
  @@map("flashcard_progress")
}

model TopicAssignment {
  id         String   @id @default(cuid())
  classId    String   @map("class_id")
  class      Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  topicId    String   @map("topic_id")
  topic      Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  assignedAt DateTime @default(now()) @map("assigned_at")

  @@unique([classId, topicId])
  @@map("topic_assignments")
}

model PracticeTest {
  id          String   @id @default(cuid())
  title       String
  topicId     String   @map("topic_id")
  topic       Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  createdById String   @map("created_by_id")
  createdBy   User     @relation("TestCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  questions       Question[]
  practiceResults PracticeResult[]

  @@map("practice_tests")
}

model Question {
  id             String       @id @default(cuid())
  practiceTestId String       @map("practice_test_id")
  practiceTest   PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  questionNumber Int          @map("question_number")
  content        String
  questionType   QuestionType @map("question_type")
  answer1        String       @map("answer_1")
  answer2        String?      @map("answer_2")
  answer3        String?      @map("answer_3")
  answer4        String?      @map("answer_4")
  correctAnswer  String       @map("correct_answer")  // "answer_1", "answer_2", etc.
  timer          Int          @default(30)              // seconds per question
  createdAt      DateTime     @default(now()) @map("created_at")

  studentAnswers StudentAnswer[]

  @@unique([practiceTestId, questionNumber])
  @@map("questions")
}

model PracticeResult {
  id             String       @id @default(cuid())
  userId         String       @map("user_id")
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceTestId String       @map("practice_test_id")
  practiceTest   PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  totalQuestions Int          @map("total_questions")
  correctCount   Int          @map("correct_count")
  incorrectCount Int          @map("incorrect_count")
  score          Float                                 // percentage 0-100
  completedAt    DateTime     @default(now()) @map("completed_at")

  studentAnswers StudentAnswer[]
  comments       Comment[]

  @@map("practice_results")
}

model StudentAnswer {
  id               String         @id @default(cuid())
  practiceResultId String         @map("practice_result_id")
  practiceResult   PracticeResult @relation(fields: [practiceResultId], references: [id], onDelete: Cascade)
  questionId       String         @map("question_id")
  question         Question       @relation(fields: [questionId], references: [id], onDelete: Cascade)
  userId           String         @map("user_id")
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  selectedAnswer   String         @map("selected_answer")  // "answer_1" or free text for gap_fill
  isCorrect        Boolean        @map("is_correct")
  attemptNumber    Int            @default(1) @map("attempt_number")  // 1, 2, or 3
  answeredAt       DateTime       @default(now()) @map("answered_at")

  @@map("student_answers")
}

model Comment {
  id               String         @id @default(cuid())
  content          String
  userId           String         @map("user_id")
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  practiceResultId String         @map("practice_result_id")
  practiceResult   PracticeResult @relation(fields: [practiceResultId], references: [id], onDelete: Cascade)
  createdAt        DateTime       @default(now()) @map("created_at")

  @@map("comments")
}

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

### 2.2 Prisma Client Configuration

File: `src/lib/prisma.ts`
- Uses `@prisma/adapter-pg` with `PrismaPg` adapter
- Strips `sslmode` from connection string (pg v8+ treats `sslmode=require` as `verify-full`)
- Sets `ssl: { rejectUnauthorized: false }` for Supabase compatibility
- Singleton pattern via `globalThis` (avoids multiple clients in dev)

### 2.3 Seed Data

File: `prisma/seed.ts`

1. Create learn languages: `{ code: "en", name: "English" }`, `{ code: "zh", name: "Chinese" }`
2. Create default teacher: `teacher@vc-class.com` (role: TEACHER, status: ACTIVE)
3. Optionally create sample topics with vocabulary for development

---

## Phase 3: Authentication (NextAuth v5)

### 3.1 Auth Configuration

File: `src/lib/auth.ts`

- Credentials provider: email + password login
- Password verification with `bcryptjs`
- JWT strategy with `role`, `status`, `id` embedded in token
- Custom pages: `signIn: "/login"`
- Callbacks:
  - `jwt`: Adds `id`, `role`, `status` to token
  - `session`: Adds `id`, `role`, `status` to `session.user`

### 3.2 Route Handler

File: `src/app/api/auth/[...nextauth]/route.ts`
- Export `GET` and `POST` from `handlers`

### 3.3 Registration API

File: `src/app/api/auth/register/route.ts`

- POST endpoint
- Body: `{ email, name, password, learnLanguageId? }`
- Hash password with bcryptjs
- Create user: `role: STUDENT`, `status: INACTIVE`
- Response: `{ message, userId }`

### 3.4 Middleware

File: `src/proxy.ts` (used as Next.js middleware via `next.config.ts`)

- **Public routes**: `/login`, `/register`, `/api/auth/*`
- **Static assets**: `/_next/*`, favicon, files with extensions — allowed
- **Authenticated on auth pages**: Redirected to `/teacher` (teachers) or `/topics` (students)
- **Unauthenticated users**: Redirected to `/login?callbackUrl=<path>`
- **INACTIVE students**: Redirected to `/login?error=inactive`
- **Teachers**: Can only access `/teacher/*` and `/api/*` routes; others redirect to `/teacher`
- **Students**: Cannot access `/teacher/*`; redirected to `/topics`

### 3.5 Type Augmentation

File: `src/types/next-auth.d.ts`
- Extend `Session`, `JWT`, `User` types to include `role`, `status`, `id`

---

## Phase 4: Student Features

### 4.1 Topic List Page

File: `src/app/(student)/topics/page.tsx` — Server component

- Query topics assigned to classes the student is enrolled in
- Deduplicate topics across multiple class enrollments
- Calculate flashcard progress (learned words count per topic)
- Grid of cards: title, language badge, vocab count, learn progress indicator
- Empty state when no topics assigned

### 4.2 Topic Detail Page

File: `src/app/(student)/topics/[topicId]/page.tsx` — Server component

- Verify student is enrolled in a class that has this topic assigned
- Show title, description, language
- Progress card: percentage learned, word count
- Vocabulary grid: 4-column layout with learned checkmarks
- Practice tests section: shows test cards with best scores
- "Study Flashcards" button (always available)
- Practice tests: enabled only when all vocab marked as learned
- Breadcrumb navigation

### 4.3 Flashcards

File: `src/app/(student)/topics/[topicId]/flashcards/page.tsx` — Server (loads data)
File: `src/components/student/FlashcardDeck.tsx` — Client component

**Implementation:**
- Load all vocabulary + existing FlashcardProgress for current user
- Display one card at a time with CSS transform animations
- Custom pointer/touch event hook for swipe detection:
  - Swipe right = learned → `POST /api/flashcards` upserts `FlashcardProgress { learned: true }`
  - Swipe left = not learned → skip or set `learned: false`
- Progress counter: "3/8 learned"
- Keyboard support: arrow keys as alternative to swipe
- Completion state with "Start Practice" button when all words learned

**API:** `src/app/api/flashcards/route.ts`
- POST: `{ vocabularyId, learned }` — upsert FlashcardProgress, sets `learnedAt` timestamp if learned=true

### 4.4 Practice Session

File: `src/app/(student)/topics/[topicId]/practice/page.tsx` — Server (loads test data)
File: `src/components/student/PracticeSession.tsx` — Client component

**Flow:**
1. Load practice test for topic (specific via `?testId=` or first available)
2. Validate test has questions
3. Display one question at a time by type:
   - `YES_NO` → Two buttons (Yes/No)
   - `MULTIPLE_CHOICE` → Four radio options
   - `GAP_FILL` → Text input field
4. **Timer per question**: countdown timer (default 30s, configurable per question)
   - Visual countdown that changes color as time runs low
   - When timer expires, question auto-submitted as incorrect
5. Submit answer → show immediate feedback (correct/incorrect + correct answer)
6. "Next" button to proceed
7. After all questions: collect wrong answers
8. If wrong answers exist AND attempt < 3 → retry round with only wrong questions
9. After 3 attempts or all correct → submit result
10. Redirect to Result Overview

**Score calculation:**
- Score = (correctCount / totalQuestions) * 100

### 4.5 Practice Result Submission

**POST `/api/practice/[practiceId]/result`**
- Body: `{ totalQuestions, correctCount, incorrectCount, score, answers[] }`
- `answers` format: `[{ questionId, selectedAnswer, isCorrect, attempts }]`
- Creates PracticeResult + all StudentAnswer records
- Response: PracticeResult (201)

### 4.6 Student Layout

File: `src/app/(student)/layout.tsx` — Server component
- Auth check, redirects to login if not authenticated
- StudentNavbar component (top navigation, user menu, locale switcher)
- Main content in max-width container

---

## Phase 5: Teacher Features

### 5.1 Teacher Layout & Dashboard

File: `src/app/teacher/layout.tsx`
- Auth check: redirects non-teachers to `/topics`
- TeacherShell component with sidebar navigation

File: `src/app/teacher/page.tsx` (Dashboard)
- Stats cards: Total Students (from enrolled classes), Active Students, Total Topics
- Recent practice results table (10 latest): student name, test name, topic, language, score, date
- Score color coding: 90+ green, 70+ blue, <70 red

### 5.2 Class Management

File: `src/app/teacher/classes/page.tsx`
- Lists teacher's classes with stats (total, active count, total enrolled)
- Class grid (3 columns): name, language, level, schedule, weeks, enrollment count, topic count
- Status badges: SCHEDULING, ACTIVE, ENDED, CANCELLED
- "Create Class" button

File: `src/app/teacher/classes/create/page.tsx`
- Form: name, language, level, schedule (JSON), start/end dates, max students, special notes

File: `src/app/teacher/classes/[classId]/page.tsx`
- Class detail with edit capabilities (ClassDetailClient component)
- Enrolled students list with status
- Assigned topics list with language
- Enroll/unenroll students
- Assign/unassign topics

**API:** `src/app/api/teacher/classes/route.ts`
- GET: list teacher's classes with enrollment and topic counts
- POST: `{ name, languageId, level, schedule, startDate, endDate, maxStudents?, specialNotes? }` — create class

**API:** `src/app/api/teacher/classes/[classId]/route.ts`
- PATCH: partial update (name, language, level, schedule, dates, maxStudents, specialNotes, status)
- DELETE: delete class (cascades)

**API:** `src/app/api/teacher/classes/[classId]/enroll/route.ts`
- POST: `{ studentIds[] }` — enroll students (validates capacity, skipDuplicates)

**API:** `src/app/api/teacher/classes/[classId]/enroll/[userId]/route.ts`
- DELETE: unenroll student from class

### 5.3 Student Management

File: `src/app/teacher/students/page.tsx`
- Lists students enrolled in teacher's classes
- Groups by student, shows assigned topics and class info
- Displays: name, email, status, language, topic count
- StudentTable client component for interactions

**API:** `src/app/api/teacher/students/route.ts`
- PATCH: `{ studentId, status?, name?, email?, learnLanguageId? }` — update student
- Can activate/deactivate students, change profile fields

### 5.4 Topic Management

File: `src/app/teacher/topics/page.tsx`
- Lists teacher's topics with vocabulary count, assignment count
- Fetches available languages
- TopicList client component (create, edit, delete)

File: `src/app/teacher/topics/[topicId]/page.tsx`
- Topic detail with vocabulary management
- VocabularyManager client component (add/edit/delete words)

**API:** `src/app/api/teacher/topics/route.ts`
- POST: `{ title, description?, languageId }` — create topic
- PUT: `{ id, title, description? }` — update topic (ownership verified)
- DELETE: `{ id }` — delete topic (ownership verified)

**API:** `src/app/api/teacher/vocabulary/route.ts`
- POST: `{ topicId, word, meaning, example?, sortOrder? }` — add vocabulary (topic ownership verified)
- PUT: `{ id, word, meaning, example? }` — update vocabulary
- DELETE: `{ id }` — delete vocabulary

### 5.5 Topic Assignment

File: `src/app/teacher/assignments/page.tsx`
- AssignmentPanel client component
- Assign topics to classes (creates TopicAssignment records)

**API:** `src/app/api/teacher/assignments/route.ts`
- POST: `{ topicIds[], classIds[] }` — bulk create TopicAssignment (cartesian product, skipDuplicates)

**API:** `src/app/api/teacher/assignments/[assignmentId]/route.ts`
- DELETE: remove assignment (ownership verified via class.teacherId)

### 5.6 Practice Test CSV Import

File: `src/app/teacher/practice-tests/import/page.tsx`
File: `src/components/teacher/CsvImporter.tsx` — Client component

**UI Layout:**
1. **"Download CSV Template"** button — downloads a sample CSV file with example rows for each question type:
   ```csv
   question_number,question_content,question_type,answer_1,answer_2,answer_3,answer_4,correct_answers
   1,"What is this?","multiple_choice","tiger","lion","cat","dog","answer_1"
   2,"Is it green?","yes_no","Yes","No","","","answer_1"
   3,"What is drink?","gap_fill","juice","","","",""
   ```

2. **Topic selector** — dropdown to select which topic this test belongs to
3. **Test title** — text input for naming the practice test
4. **"Upload CSV"** button — file input accepting `.csv` only. On upload:
   - Client-side parsing with `papaparse`
   - Validation per row:
     - `multiple_choice`: requires answer_1-4, correct_answers = "answer_1"|"answer_2"|"answer_3"|"answer_4"
     - `yes_no`: requires answer_1 & answer_2, correct_answers = "answer_1"|"answer_2"
     - `gap_fill`: requires answer_1 (correct text), correct_answers ignored
   - Show preview table with validation status per row
5. **"Import"** button — enabled only when all rows pass validation

**API:** `src/app/api/practice-tests/import/route.ts`
- POST: `{ topicId, title, questions[] }` — create PracticeTest + Questions
- Response: PracticeTest with questions (201)

### 5.7 Practice Test Management

File: `src/app/teacher/practice-tests/page.tsx`
- Lists teacher's practice tests with stats (total tests, total questions, topics covered)
- Test grid (3 columns): test name, topic, question count

File: `src/app/teacher/practice-tests/[testId]/page.tsx`
- Test detail with question editor (QuestionEditor component)
- Edit test title, individual question content, answers, timer

**API:** `src/app/api/teacher/practice-tests/route.ts`
- PUT: `{ id, title }` — update test title

**API:** `src/app/api/teacher/questions/route.ts`
- PUT: `{ id, content, answer1-4, correctAnswer, timer }` — update question

### 5.8 Student Results

File: `src/app/teacher/student-results/page.tsx`
- StudentResultsTable client component with search/filter
- Filters: search by student name/test title/topic title, date range
- Paginated (10 per page)

File: `src/app/teacher/student-results/[resultId]/page.tsx`
- Detailed result view: all question/answer pairs, correct vs selected
- Comments section (ResultCommentSection component)

**API:** `src/app/api/teacher/student-results/route.ts`
- GET: `?page&search&dateFrom&dateTo` — paginated results for students in teacher's classes

**API:** `src/app/api/teacher/student-results/[resultId]/route.ts`
- GET: detailed result (verifies student is enrolled in teacher's class)

**API:** `src/app/api/teacher/student-results/[resultId]/comments/route.ts`
- POST: `{ content }` — add comment to practice result

### 5.9 Media Management

File: `src/app/teacher/media/page.tsx`
- MediaTable client component with search/filter by type
- Paginated (10 per page)

File: `src/components/teacher/MediaUploadModal.tsx` — Client component
- Upload files to Vercel Blob storage
- Allowed types: PNG, JPEG, MP3, MP4 (10MB max per file)

**API:** `src/app/api/teacher/media/route.ts`
- GET: `?page&search&type` — paginated media list
- POST: `{ files[{fileName, fileUrl, fileType, fileSize}] }` — save media metadata

**API:** `src/app/api/teacher/media/upload/route.ts`
- POST: generates Vercel Blob upload token with teacher's userId

---

## Phase 6: Public API Endpoints

### 6.1 Languages API

File: `src/app/api/languages/route.ts`
- GET: returns all languages ordered by name (no auth required)

### 6.2 Locale API

File: `src/app/api/locale/route.ts`
- POST: `{ locale: "en" | "vi" }` — sets locale cookie (1-year expiry)

---

## Phase 7: Polish & Quality

### 7.1 Responsive Design
- Mobile-first for student interface (students likely use phones/tablets)
- Desktop-focused for teacher interface (data management)

### 7.2 Loading & Error States
- `loading.tsx` per route segment (Suspense/streaming)
- `error.tsx` error boundaries
- `not-found.tsx` for 404 pages
- Toast notifications via `sonner`

### 7.3 Accessibility
- ARIA labels on interactive elements
- Keyboard navigation for flashcards (arrow keys)
- Focus management in practice flow

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (i18n, fonts, Material Symbols)
│   ├── page.tsx                            # Redirect to /login
│   ├── globals.css                         # Tailwind v4 theme
│   ├── error.tsx                           # Global error boundary
│   ├── not-found.tsx                       # 404 page
│   ├── (auth)/
│   │   ├── layout.tsx                      # Centered card layout
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (student)/
│   │   ├── layout.tsx                      # Student shell (navbar)
│   │   └── topics/
│   │       ├── page.tsx                    # Topic List
│   │       ├── loading.tsx                 # Loading state
│   │       └── [topicId]/
│   │           ├── page.tsx                # Topic Detail
│   │           ├── flashcards/page.tsx
│   │           └── practice/page.tsx       # Practice Session
│   ├── teacher/
│   │   ├── layout.tsx                      # Teacher shell (sidebar)
│   │   ├── page.tsx                        # Dashboard
│   │   ├── classes/
│   │   │   ├── page.tsx                    # Class list
│   │   │   ├── create/page.tsx             # Create class form
│   │   │   └── [classId]/page.tsx          # Class detail
│   │   ├── students/page.tsx               # Student management
│   │   ├── topics/
│   │   │   ├── page.tsx                    # Topic list
│   │   │   └── [topicId]/page.tsx          # Topic detail + vocabulary
│   │   ├── assignments/page.tsx            # Topic-class assignments
│   │   ├── practice-tests/
│   │   │   ├── page.tsx                    # Test list
│   │   │   ├── import/page.tsx             # CSV import
│   │   │   └── [testId]/page.tsx           # Test detail + question editor
│   │   ├── student-results/
│   │   │   ├── page.tsx                    # Results list with filters
│   │   │   └── [resultId]/page.tsx         # Result detail + comments
│   │   └── media/page.tsx                  # Media management
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── register/route.ts
│       ├── flashcards/route.ts
│       ├── languages/route.ts
│       ├── locale/route.ts
│       ├── practice/
│       │   └── [practiceId]/result/route.ts
│       ├── practice-tests/
│       │   └── import/route.ts
│       └── teacher/
│           ├── classes/
│           │   ├── route.ts
│           │   └── [classId]/
│           │       ├── route.ts
│           │       └── enroll/
│           │           ├── route.ts
│           │           └── [userId]/route.ts
│           ├── topics/route.ts
│           ├── vocabulary/route.ts
│           ├── practice-tests/route.ts
│           ├── questions/route.ts
│           ├── students/route.ts
│           ├── assignments/
│           │   ├── route.ts
│           │   └── [assignmentId]/route.ts
│           ├── student-results/
│           │   ├── route.ts
│           │   └── [resultId]/
│           │       ├── route.ts
│           │       └── comments/route.ts
│           └── media/
│               ├── route.ts
│               └── upload/route.ts
├── components/
│   ├── student/
│   │   ├── Navbar.tsx
│   │   ├── TopicGrid.tsx
│   │   ├── TopicCard.tsx
│   │   ├── FlashcardDeck.tsx
│   │   └── PracticeSession.tsx
│   ├── teacher/
│   │   ├── TeacherShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ClassDetailClient.tsx
│   │   ├── StudentTable.tsx
│   │   ├── StudentResultsTable.tsx
│   │   ├── TopicList.tsx
│   │   ├── VocabularyManager.tsx
│   │   ├── QuestionEditor.tsx
│   │   ├── CsvImporter.tsx
│   │   ├── MediaUploadModal.tsx
│   │   ├── MediaTable.tsx
│   │   ├── ResultCommentSection.tsx
│   │   └── AssignmentPanel.tsx
│   ├── ui/                                 # Shared UI components
│   └── LocaleSwitcher.tsx
├── lib/
│   ├── prisma.ts                           # Singleton Prisma client (with PrismaPg adapter)
│   ├── auth.ts                             # NextAuth v5 config
│   └── i18n/
│       └── request.ts                      # i18n server config
├── types/
│   └── next-auth.d.ts                      # Auth type extensions
└── proxy.ts                                # Middleware (auth + role routing)
```

---

## Security & Validation

### API Security
- All protected endpoints verify session via `auth()`
- Teacher endpoints verify `role === "TEACHER"`
- Resource ownership verified (createdById, teacherId, class enrollment)
- Inactive students blocked from all protected routes

### Input Validation
- Required fields checked at API level
- bcryptjs password hashing
- File uploads: type whitelist (PNG, JPEG, MP3, MP4), 10MB size limit
- Trimmed inputs to prevent whitespace issues

### Data Integrity
- Unique constraints: email, language code, (classId+userId), (classId+topicId), (userId+vocabularyId), (testId+questionNumber)
- Cascade deletes on foreign keys
- Atomic operations for batch creates (skipDuplicates)

### API Response Codes
- 200: Success (GET, PUT, PATCH)
- 201: Created (POST)
- 400: Bad request (invalid input)
- 401: Unauthorized (no session)
- 403: Forbidden (wrong role)
- 404: Not found (resource doesn't exist or not owned)
- 409: Conflict (email exists)
- 500: Server error

---

## Build & Deployment

### Build Script
```json
"build": "prisma generate && next build"
```
- `prisma generate` runs before Next.js build to ensure client types are available on Vercel

### Vercel Configuration
- Image remote patterns: `*.public.blob.vercel-storage.com` (Vercel Blob)
- next-intl plugin integrated via `next.config.ts`

---

## Implementation Order

| Step | Task | Depends On |
|------|------|------------|
| 1 | Project init, Docker, env, Tailwind v4, Material Symbols | — |
| 2 | Prisma schema, migration, seed (languages + teacher) | Step 1 |
| 3 | NextAuth v5, middleware, type augmentation | Step 2 |
| 4 | Register + Login pages + API | Step 3 |
| 5 | i18n setup (next-intl) | Step 1 |
| 6 | Student layout + Topic List page | Steps 4, 5 |
| 7 | Topic Detail page | Step 6 |
| 8 | Flashcard component + API | Step 7 |
| 9 | Practice session + question components + APIs | Step 8 |
| 10 | Teacher layout + dashboard | Steps 4, 5 |
| 11 | Class management (CRUD + enrollment) | Step 10 |
| 12 | Student management (list, activate/deactivate) | Step 11 |
| 13 | Topic management (CRUD + vocabulary) | Step 10 |
| 14 | Topic assignment to classes | Steps 11, 13 |
| 15 | CSV import for practice tests | Step 13 |
| 16 | Practice test management + question editing | Step 15 |
| 17 | Student results viewing + comments | Step 9 |
| 18 | Media management (upload, browse) | Step 10 |
| 19 | Polish: loading states, errors, responsive, toasts | All |

---

## Verification Checklist

1. `docker compose up -d` → PostgreSQL running on port 5433
2. `npx prisma migrate dev` → migrations applied successfully
3. `npx prisma db seed` → languages + teacher account seeded
4. `npm run dev` → app running at http://localhost:18888
5. Register student → account created as INACTIVE
6. Login as teacher (`teacher@vc-class.com`) → dashboard loads
7. Teacher creates class with language, level, schedule
8. Teacher creates topic with vocabulary
9. Teacher assigns topic to class
10. Teacher enrolls student into class
11. Teacher activates student account
12. Teacher imports practice test via CSV
13. Login as student → see assigned topics → study flashcards → take practice → view results
14. Teacher views student results → adds comment
15. Teacher uploads media files
