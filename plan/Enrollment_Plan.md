# Plan: Teacher Classes & Student Enrollment

## 1. Data Model Changes

### New `ClassStatus` Enum

| Status       | Meaning                                |
|--------------|----------------------------------------|
| `SCHEDULING` | Class is being planned, not yet active |
| `ACTIVE`     | Class is currently running             |
| `ENDED`      | Class has finished its duration        |
| `CANCELLED`   | Class is cancelled                     |

### New `Class` Model

| Field        | Type              | Description                                      |
|--------------|-------------------|--------------------------------------------------|
| id           | cuid              | Primary key                                      |
| name         | String            | e.g., "Intermediate English Conversation"        |
| languageId   | FK → Language     | Class language                                   |
| level        | String            | e.g., "B1", "HSK 3" (flexible, depends on lang)  |
| schedule     | String            | e.g., "Mon & Wed, 7:00–8:30 PM"                 |
| startDate    | DateTime          | Start of class duration                          |
| endDate      | DateTime          | End of class duration                            |
| teacherId    | FK → User (TEACHER) | The teacher who owns this class                |
| maxStudents  | Int (default 10)  | Maximum enrollment capacity                      |
| specialNotes | String? (text)    | e.g., "First class free trial \| All sessions recorded" |
| status       | ClassStatus       | SCHEDULING / ACTIVE / ENDED / CANCELLED           |
| createdAt    | DateTime          | Auto-generated                                   |
| updatedAt    | DateTime          | Auto-updated                                     |

### New `ClassEnrollment` Model (Many-to-Many: Student ↔ Class)

| Field      | Type          | Description                     |
|------------|---------------|---------------------------------|
| id         | cuid          | Primary key                     |
| classId    | FK → Class    | The class                       |
| userId     | FK → User     | The student                     |
| enrolledAt | DateTime      | When the student was enrolled   |
|            |               | @@unique([classId, userId])     |

A student can be enrolled in multiple classes. Enrollment count must not exceed `Class.maxStudents`.

### Modified `TopicAssignment` Model (Class ↔ Topic, replaces Student ↔ Topic)

**Current:** TopicAssignment = Student ↔ Topic (per-student)
**New:** TopicAssignment = Class ↔ Topic (per-class)

| Field      | Type          | Description                     |
|------------|---------------|---------------------------------|
| id         | cuid          | Primary key                     |
| classId    | FK → Class    | Replaces `userId`               |
| topicId    | FK → Topic    | The assigned topic              |
| assignedAt | DateTime      | When the topic was assigned     |
|            |               | @@unique([classId, topicId])    |

**How students see topics:**
Student → ClassEnrollment → Class → TopicAssignment → Topic

### Removed from `User` Model

- `teacherId` / `teacher_id` column — **removed**
- `teacher` relation — **removed**
- `students` relation — **removed**

Teacher-student relationship is now derived via: **Teacher → Class → ClassEnrollment → Student**

---

## 2. CEFR / Level System

Since levels depend on language, stored as a free-text string with **suggested presets** in the UI:

| Language | Levels                                    |
|----------|-------------------------------------------|
| English  | A1, A2, B1, B2, C1, C2 (CEFR)            |
| Chinese  | HSK 1, HSK 2, HSK 3, HSK 4, HSK 5, HSK 6 |
| Other    | Free text input                           |

---

## 3. Teacher Data Scoping

Once classes exist, **all teacher pages are scoped by the logged-in teacher**:

| Page            | Scoping Rule                                              |
|-----------------|-----------------------------------------------------------|
| Students        | Only students enrolled in the teacher's classes            |
| Assignments     | Assign topics to the teacher's classes (not individual students) |
| Student Results | Only results from the teacher's class students             |
| Dashboard       | Stats for the teacher's own classes/students               |
| Topics          | Topics created by the teacher (already has `createdById`)  |
| Practice Tests  | Tests created by the teacher (already has `createdById`)   |

---

## 4. New Pages & UI

### New Pages

| Page          | Route                         | Description                                        |
|---------------|-------------------------------|----------------------------------------------------|
| Classes list  | `/teacher/classes`            | Grid/list of teacher's classes with stats           |
| Create class  | `/teacher/classes/create`     | Form to create new class                           |
| Class detail  | `/teacher/classes/[classId]`  | Class info, enrolled students, manage enrollment   |

### Sidebar Update

Add **"Classes"** nav item between Dashboard and Students.

### Class Detail Page Features

- Editable class info (name, schedule, level, etc.)
- Enrolled students list with add/remove
- Quick stats (enrolled count / max, topics assigned, avg score)

### Assignments Page Changes

- Select a **class** instead of selecting individual students
- Teacher assigns topics to a class as a learning path
- All students enrolled in that class can see the assigned topics

### Student Detail Modal Changes

- Topics shown are derived from the student's enrolled classes (grouped by class)

---

## 5. Migration Strategy

### Phase 1 — Schema + Classes CRUD

- Add `ClassStatus` enum, `Class` model, `ClassEnrollment` model to schema
- Modify `TopicAssignment`: replace `userId` with `classId`
- Remove `teacherId`, `teacher`, `students` from `User` model
- Create database migration
- Build Classes list page + create form
- Build Class detail page with student enrollment
- Add "Classes" to sidebar
- Add i18n keys to `en.json` / `vi.json`

### Phase 2 — Scoping Existing Pages

- Update Students page to filter by teacher's classes
- Update Assignments page to assign topics to classes
- Update Student Results to filter by teacher's class students
- Update Dashboard stats to teacher's scope

### Phase 3 — Cleanup

- Remove any orphaned student-topic assignment references
- Add class selector/filter to relevant pages where needed

---

## 6. API Endpoints

### Classes

| Method | Route                                          | Purpose                     |
|--------|------------------------------------------------|-----------------------------|
| GET    | `/api/teacher/classes`                         | List teacher's classes      |
| POST   | `/api/teacher/classes`                         | Create class                |
| PATCH  | `/api/teacher/classes/[classId]`               | Update class info           |
| DELETE | `/api/teacher/classes/[classId]`               | Archive/delete class        |

### Enrollment

| Method | Route                                                  | Purpose                      |
|--------|--------------------------------------------------------|------------------------------|
| POST   | `/api/teacher/classes/[classId]/enroll`                | Add students to class        |
| DELETE | `/api/teacher/classes/[classId]/enroll/[userId]`       | Remove student from class    |

### Existing Endpoints (Modified)

| Method | Route                            | Change                                      |
|--------|----------------------------------|---------------------------------------------|
| POST   | `/api/teacher/assignments`       | Accept `classId` + `topicIds` instead of `studentIds` + `topicIds` |
| GET    | `/api/teacher/student-results`   | Filter by teacher's class students           |

---

## 7. Files to Create / Modify

### New Files

| File                                                        | Purpose                          |
|-------------------------------------------------------------|----------------------------------|
| `src/app/teacher/classes/page.tsx`                          | Classes list page                |
| `src/app/teacher/classes/create/page.tsx`                   | Create class form                |
| `src/app/teacher/classes/[classId]/page.tsx`                | Class detail page                |
| `src/app/api/teacher/classes/route.ts`                      | GET (list) / POST (create)       |
| `src/app/api/teacher/classes/[classId]/route.ts`            | PATCH (update) / DELETE          |
| `src/app/api/teacher/classes/[classId]/enroll/route.ts`     | POST (enroll students)           |
| `src/app/api/teacher/classes/[classId]/enroll/[userId]/route.ts` | DELETE (remove student)     |
| `src/components/teacher/ClassCard.tsx`                      | Class card component             |

### UI Design

All new pages and components must follow the **Aura Lexicon** UI design system defined in the `design/` folder — for both student and teacher sites. This includes:
- Color palette, typography (Newsreader / Manrope), spacing
- Component patterns (cards, tables, modals, buttons, form inputs)
- Material Symbols Outlined icons
- Glassmorphic / ambient-shadow card styles
- Responsive mobile-first layout patterns

### Modified Files

| File                                              | Change                                           |
|---------------------------------------------------|--------------------------------------------------|
| `prisma/schema.prisma`                            | Add Class, ClassEnrollment, ClassStatus; modify TopicAssignment; remove User.teacherId |
| `src/components/teacher/Sidebar.tsx`              | Add "Classes" nav item                           |
| `src/app/teacher/students/page.tsx`               | Scope students by teacher's classes              |
| `src/app/teacher/assignments/page.tsx`            | Assign topics to classes, not students            |
| `src/components/teacher/AssignmentPanel.tsx`      | Select class instead of individual students       |
| `src/app/api/teacher/assignments/route.ts`        | Accept classId instead of studentIds              |
| `src/app/api/teacher/student-results/route.ts`    | Filter by teacher's class students               |
| `src/app/teacher/page.tsx`                        | Scope dashboard stats to teacher                 |
| `src/components/teacher/StudentDetailModal.tsx`   | Show topics grouped by class                     |
| `messages/en.json`                                | Add class-related i18n keys                      |
| `messages/vi.json`                                | Add class-related i18n keys                      |
