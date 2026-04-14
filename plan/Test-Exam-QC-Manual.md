# Test Exam Redesign — Manual QC Testing Plan

## Prerequisites

### Environment Setup
1. Run database migration: `npx prisma migrate dev`
2. Run backfill script: `npx tsx prisma/backfill-exam-sessions.ts`
3. Seed database: `npx prisma db seed`
4. Start dev server: `npm run dev`
5. Open browser DevTools → Network tab (keep open throughout testing)

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Teacher | `nga@teacher.com` | (check seed) |
| Student 1 | `hang@stu.com` | (check seed) |
| Student 2 | `son@stu.com` | (check seed) |

### Browser Setup
- Use Chrome with DevTools open
- Have a second browser or incognito window ready (for teacher/student simultaneous testing)
- Clear localStorage before starting: DevTools → Application → Local Storage → Clear All

---

## PART A: Teacher — Test Configuration

### A1: Test Status Management

**Goal:** Verify DRAFT / ACTIVE / INACTIVE status cycle works correctly.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| A1.1 | Login as teacher (`nga@teacher.com`) | Teacher dashboard loads | |
| A1.2 | Navigate to Practice Tests page | Test list displays with existing tests | |
| A1.3 | Click on any test to open detail panel | Detail panel opens with settings | |
| A1.4 | Find the status toggle button (shows "Draft" or "Active") | Status button visible with correct current state | |
| A1.5 | Click status button once | Status cycles: DRAFT → ACTIVE (green badge, "Active" label) | |
| A1.6 | Click status button again | Status cycles: ACTIVE → INACTIVE (gray badge, "Inactive" label) | |
| A1.7 | Click status button again | Status cycles: INACTIVE → DRAFT (amber badge, "Draft" label) | |
| A1.8 | Set status to ACTIVE and verify it saves (no page refresh needed) | API call succeeds, badge stays "Active" after reload | |

### A2: New Test Settings

**Goal:** Verify totalTime, maxAttempts, shuffleQuestions settings work.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| A2.1 | In the test detail panel, locate "Time Limit" input | Shows current time in minutes (default: 45) | |
| A2.2 | Change time limit to 10 minutes | Input updates, API call fires (check Network tab) | |
| A2.3 | Locate "Max Attempts" input | Shows current value (default: 1) | |
| A2.4 | Change max attempts to 3 | Input updates, API call fires | |
| A2.5 | Change max attempts to 0 | Input updates — 0 means unlimited | |
| A2.6 | Locate "Shuffle Questions" toggle | Toggle visible, default OFF | |
| A2.7 | Enable Shuffle Questions toggle | Toggle turns purple, API call fires | |
| A2.8 | Refresh the page | All settings persist with the values you set | |

### A3: Test Activation Notification

**Goal:** Verify students get notified when a test is activated.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| A3.1 | As teacher, set a test status from DRAFT to ACTIVE | Status changes to Active | |
| A3.2 | In a second browser, login as student (`hang@stu.com`) | Student dashboard loads | |
| A3.3 | Check the notification bell icon in the student navbar | Bell shows unread count badge (at least 1) | |
| A3.4 | Click the bell | Dropdown shows "New test available" notification | |

---

## PART B: Student — Topic Detail & Test Cards

### B1: Test Card Status Badges

**Goal:** Verify test cards show correct status and behavior.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| B1.1 | Login as student (`hang@stu.com`) | Student topics page loads | |
| B1.2 | Navigate to a topic that has practice tests | Topic detail page with test cards section | |
| B1.3 | Verify an ACTIVE test shows green "Available" badge | Badge visible with play_circle icon | |
| B1.4 | Click on the ACTIVE test card | Navigates to `/topics/[topicId]/practice?testId=[testId]` | |
| B1.5 | Go back. As teacher (other browser), set a test to INACTIVE | Status changes to Inactive | |
| B1.6 | Refresh student page | Test card shows gray "Unavailable" badge with reduced opacity | |
| B1.7 | Click on the INACTIVE test card | Nothing happens — card is not clickable (cursor: not-allowed) | |

---

## PART C: Student — Exam Entry Gate

### C1: Instructions Screen (New Exam)

**Goal:** Verify the pre-exam lobby shows correct info for a fresh exam.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| C1.1 | As student, click on an ACTIVE test (no prior attempts) | Entry Gate loads with "Available" badge | |
| C1.2 | Verify exam info cards | Shows: question count, time limit (matches teacher setting), parts count, max attempts | |
| C1.3 | Verify exam rules section | Shows 4 rules: auto-save, flag/navigate, review screen, auto-submit warning | |
| C1.4 | Verify "Start Exam" button | Purple gradient CTA button visible at bottom | |
| C1.5 | Open DevTools → Network tab | Ready to observe API calls | |
| C1.6 | Click "Start Exam" | ExamShell loads. Network shows POST to `/api/exam-session` returning 201 | |

### C2: INACTIVE Test

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| C2.1 | Navigate directly to an INACTIVE test via URL | Entry Gate shows "Exam Not Available" with gray icon | |
| C2.2 | Verify no start button exists | No CTA, only informational text | |

---

## PART D: Student — Exam Taking (Core Flow)

### D1: Phased Navigation

**Goal:** Verify exam displays questions in phases with correct navigation.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D1.1 | Start a test that has sections (PART > GROUP > EXERCISE) | ExamShell loads. First phase title shown. Header has breadcrumb (Part > Group > Exercise) | |
| D1.2 | Verify questions display | Questions for the first exercise phase shown with question numbers | |
| D1.3 | Verify the footer shows "PREVIOUS" (disabled) and "NEXT" buttons | Previous is grayed out (first phase), Next is purple gradient | |
| D1.4 | Verify the footer shows question range | Format: "Q 1–5 of 40" (actual numbers vary) | |
| D1.5 | Click "NEXT" button | Scrolls to top, shows next phase questions, breadcrumb updates | |
| D1.6 | Click "PREVIOUS" button | Returns to first phase | |
| D1.7 | Press Right Arrow key on keyboard | Navigates to next phase | |
| D1.8 | Press Left Arrow key on keyboard | Navigates to previous phase | |

### D2: Question Palette

**Goal:** Verify the question palette allows random-access navigation.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D2.1 | Click the grid icon (top-left of header, next to breadcrumb) | Question palette panel slides open below header | |
| D2.2 | Verify all question numbers shown in a grid | Grid shows numbers 1 through N, all in light gray (unanswered) | |
| D2.3 | Answer a question (e.g., Q1) | Q1 in palette turns purple (answered) | |
| D2.4 | Flag a question (click bookmark icon on Q2) | Q2 in palette turns amber with ring (flagged) | |
| D2.5 | Click Q10 in the palette | Palette closes, navigates to the phase containing Q10 | |
| D2.6 | Verify legend at bottom of palette | Shows: purple = Answered, amber = Flagged, gray = Unanswered | |

### D3: Answering Questions

**Goal:** Verify each question type renders and accepts answers.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D3.1 | Find a Multiple Choice question | 4 options (A/B/C/D) with circular labels, clickable | |
| D3.2 | Click an option | Option highlights purple with checkmark, others remain default | |
| D3.3 | Click a different option | New option selected, previous deselected | |
| D3.4 | Find a GAP_FILL question (if available) | Text input field with "Type your answer..." placeholder | |
| D3.5 | Type an answer | Text appears in input | |
| D3.6 | Find a CUE_WRITING question (if available) | CueWriting component renders with cue cards | |
| D3.7 | Find a MATCHING question (if available) | MatchingPairs component renders with two columns | |

### D4: Question Flagging

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D4.1 | Locate the bookmark icon on any question (top-right) | Outline bookmark icon visible | |
| D4.2 | Click the bookmark icon | Icon turns amber/filled | |
| D4.3 | Click it again | Icon returns to outline (unflagged) | |

### D5: Timer & Progress Bar

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D5.1 | Verify timer in header (top-right) | Shows countdown in MM:SS format, purple badge | |
| D5.2 | Wait and verify timer decrements | Timer counts down by 1 every second | |
| D5.3 | Verify progress bar below header | Slim gradient bar shows progress (answered / total) | |
| D5.4 | Answer a question | Progress bar width increases slightly | |
| D5.5 | If testing with short timer (set to 1 min via teacher): wait for timer < 60s | Timer badge turns red with pulse animation | |

### D6: Save Status

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| D6.1 | Answer a question | Save indicator appears: "Saving..." then "Saved" (near timer in header) | |
| D6.2 | Check Network tab | PATCH to `/api/exam-session/[id]/save` fires within 3 seconds | |
| D6.3 | Wait 5 seconds without changes | Status shows "Saved 5s ago" or similar timestamp | |
| D6.4 | Check DevTools → Application → Local Storage | Key `exam-session-[testId]` exists with answers data | |

---

## PART E: Student — Session Persistence & Resume

### E1: Page Reload Resume

**Goal:** Verify exam state survives page reload.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| E1.1 | During an active exam, answer several questions and flag one | Answers visible, flag visible | |
| E1.2 | Note: current phase, timer value, which questions answered | Write down for comparison | |
| E1.3 | Press F5 (hard refresh) | Page reloads | |
| E1.4 | Verify Entry Gate shows "Resume Your Exam" screen | Shows time remaining, answered count, last saved timestamp | |
| E1.5 | Click "Continue Exam" | ExamShell loads with correct phase, answers restored, flags restored | |
| E1.6 | Verify timer is approximately where it was (within a few seconds) | Timer matches (accounting for reload time) | |
| E1.7 | Verify answered questions still show your selections | All answers preserved | |
| E1.8 | Verify flagged questions still have amber bookmark | Flags preserved | |

### E2: Tab Close & Reopen

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| E2.1 | During an active exam, close the browser tab | "Leave site?" browser warning appears | |
| E2.2 | Confirm leave | Tab closes | |
| E2.3 | Open a new tab, navigate back to the same test | Entry Gate shows "Resume Your Exam" with progress | |
| E2.4 | Click "Continue Exam" | All progress restored | |

---

## PART F: Student — Review Phase & Submit

### F1: Review Phase

**Goal:** Verify the final review screen shows correct summaries.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| F1.1 | Navigate to the last content phase | Footer shows "REVIEW" instead of "NEXT" | |
| F1.2 | Click "REVIEW" | Review phase loads with "Ready for Submission?" heading | |
| F1.3 | Verify per-part summary cards | Each part shows: answered/total count, progress bar, flagged count (amber), unanswered count | |
| F1.4 | If you have unanswered questions | "Attention Required" warning banner appears with counts | |
| F1.5 | Click "Review Part 1" link on a summary card | Navigates back to that part's first phase | |
| F1.6 | Navigate back to Review phase | Review shows updated counts | |
| F1.7 | Verify confirmation checkbox | Unchecked checkbox with text: "I have reviewed all my answers..." | |
| F1.8 | Verify "Submit Exam" button is DISABLED | Button is grayed out, not clickable | |
| F1.9 | Check the confirmation checkbox | Checkbox checked | |
| F1.10 | Verify "Submit Exam" button is now ENABLED | Button turns purple gradient, clickable | |

### F2: Submission

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| F2.1 | Click "Submit Exam" | Button shows "Submitting..." with spinner | |
| F2.2 | Check Network tab | POST to `/api/exam-session/[id]/submit` fires | |
| F2.3 | Wait for submission to complete | "Exam Submitted" screen appears | |
| F2.4 | **If test has only auto-gradable questions (MCQ, etc.):** | Score displayed (e.g., "75%") with correct/total count. Status: GRADED | |
| F2.5 | **If test has CUE_WRITING questions:** | Message: "Your exam is being reviewed by your teacher." Status: GRADING | |
| F2.6 | Verify "Back to Topic" button | Click navigates to topic detail page | |
| F2.7 | Check localStorage | Key `exam-session-[testId]` is cleared | |

### F3: Double-Submit Prevention

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| F3.1 | On the review phase, quickly double-click "Submit Exam" | Only one submission fires. Second click is ignored or returns same result. | |
| F3.2 | Check Network tab | Only one POST to submit endpoint (or second returns existing result) | |

---

## PART G: Student — Security Verification

### G1: correctAnswer Not Exposed

**Goal:** Verify correct answers are NOT in the client bundle during exam.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| G1.1 | Start a new exam | ExamShell loads | |
| G1.2 | Open DevTools → Network tab | Find the page load or API calls | |
| G1.3 | Search all network responses for "correctAnswer" | NOT found in any response during exam taking | |
| G1.4 | Open DevTools → Sources → search for "correctAnswer" in JS bundles | NOT found in client-side code (only in server components) | |

### G2: Copy/Paste Prevention

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| G2.1 | During exam, try to right-click on question text | Context menu is prevented | |
| G2.2 | Try to select question text with mouse | Text selection is prevented (user-select: none) | |
| G2.3 | Try Ctrl+C on question text | Copy is prevented | |
| G2.4 | Navigate to a GAP_FILL question with text input | Input field visible | |
| G2.5 | Try to paste text into the input (Ctrl+V) | Paste WORKS in input fields (not blocked) | |
| G2.6 | Try to type in the input | Typing works normally | |

### G3: Tab Switch Detection

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| G3.1 | During an active exam, switch to another browser tab | Tab switch detected (check by later viewing teacher grading view) | |
| G3.2 | Switch back to exam tab | Exam continues normally | |
| G3.3 | Switch tabs 3 more times | Count increments each time | |

---

## PART H: Student — Timer Expiry

### H1: Auto-Submit on Time Expiry

**Goal:** Verify exam auto-submits when timer reaches zero.

**Setup:** As teacher, set a test's time limit to 1 minute (1 min), then activate it.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| H1.1 | As student, start the 1-minute test | Timer starts at 1:00 | |
| H1.2 | Answer at least 2 questions | Answers saved | |
| H1.3 | Watch timer count down to 0:05 | Timer badge turns red with pulse animation | |
| H1.4 | Wait for timer to reach 0:00 | Exam auto-submits. "Exam Submitted" screen appears | |
| H1.5 | Verify your answered questions were saved | Score reflects the 2 questions you answered | |

---

## PART I: Teacher — Grading Workflow

### I1: Results Table Status Filter

**Goal:** Verify teacher can filter and see submission status.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| I1.1 | Login as teacher | Teacher dashboard | |
| I1.2 | Navigate to Student Results page | Results table loads | |
| I1.3 | Verify "Status" column exists in the table | Column shows badges: "Grading" (blue) or "Graded" (green) | |
| I1.4 | Click "Needs Grading" filter button | Table filters to only show GRADING submissions | |
| I1.5 | Click "Graded" filter button | Table filters to only show GRADED submissions | |
| I1.6 | Click "All" filter button | All submissions shown | |
| I1.7 | If a student had tab switches, verify warning icon | Amber warning icon next to status badge with tooltip | |

### I2: Per-Question Grading

**Goal:** Verify teacher can grade individual questions.

**Prerequisite:** A student must have submitted a test with CUE_WRITING questions (status: GRADING).

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| I2.1 | Click on a GRADING result row to open detail modal | ResultDetailModal opens with student info, stats, answer table | |
| I2.2 | Verify tab switch warning | If student had tab switches, amber warning banner shows count | |
| I2.3 | Verify "Needs review" filter checkbox | Checkbox visible in header bar | |
| I2.4 | Check the "Needs review" checkbox | Table filters to show only CUE_WRITING and unreviewed answers | |
| I2.5 | Click on a CUE_WRITING answer row | Row expands to show grading controls | |
| I2.6 | Verify grading controls | "Correct" button (green), "Incorrect" button (red), score slider (0-100%), comment input, Save button | |
| I2.7 | Click "Correct" button | Button turns solid green | |
| I2.8 | Add a comment: "Good sentence structure" | Text appears in input | |
| I2.9 | Click "Save" | Toast: "Grade saved". Row collapses. | |
| I2.10 | Check Network tab | PATCH to `/api/exam-session/[id]/grade` fires | |
| I2.11 | Verify the answer now shows a green checkmark | Override applied | |
| I2.12 | Click "Mark as Graded" button | Toast: "Marked as graded". Session transitions to GRADED. | |
| I2.13 | Verify the student receives a notification | In student browser, notification bell shows new count | |

### I3: Test-Level Comments

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| I3.1 | In the ResultDetailModal, scroll to "Teacher Feedback" section | Comment section visible with textarea | |
| I3.2 | Type a comment: "Good overall performance, review Part 2" | Text appears | |
| I3.3 | Click "Add Feedback" button | Toast: "Comment posted". Comment appears in the list with teacher name and timestamp. | |

### I4: Grade-by-Question View

**Goal:** Verify the grade-by-question workflow.

**Note:** The GradeByQuestion component needs to be wired into the teacher UI. If it's accessible, test it. If not, this is a noted gap — the component exists but may not have a trigger button yet.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| I4.1 | Open the GradeByQuestion view for a test | Modal opens showing Q1 with all student submissions | |
| I4.2 | Verify question content and correct answer shown | Question text at top, correct answer on the right | |
| I4.3 | Verify all student submissions listed | Each submission: student name, avatar, their answer, grading controls | |
| I4.4 | Grade a student's answer as "Correct" | Button turns green | |
| I4.5 | Add comment and click Save | Toast: "Grade saved" | |
| I4.6 | Click Right Arrow or "Q2" button to go to next question | Question changes, new submissions load | |
| I4.7 | Press keyboard Right Arrow key | Navigates to next question | |
| I4.8 | Press keyboard Left Arrow key | Navigates to previous question | |

---

## PART J: Student — View Results

### J1: My Results Page

**Goal:** Verify students can see all their past results.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| J1.1 | As student, click "My Results" link in navbar | Results list page loads | |
| J1.2 | Verify results listed | Each result shows: test name, topic, score (colored), date, status badge | |
| J1.3 | Verify a GRADING result shows blue "Awaiting Grade" badge | Badge visible | |
| J1.4 | Verify a GRADED result shows purple "View Results" badge | Badge visible | |
| J1.5 | Click on a GRADED result | Result detail page loads | |

### J2: Result Detail Page

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| J2.1 | Verify score hero section | Test name, topic, score percentage (large, colored), correct/total count | |
| J2.2 | Verify "By Difficulty" analytics | If multiple difficulty levels: shows Easy/Medium/Hard breakdown with percentages | |
| J2.3 | Verify "By Question Type" analytics | If multiple question types: shows type name with correct/total and percentage | |
| J2.4 | Verify "Attempt History" section | If multiple attempts: shows all attempts with scores, dates, "Current" badge on this attempt | |
| J2.5 | Scroll to "Answer Review" section | All questions listed with question number, your answer, correct answer (green), teacher comment if any | |
| J2.6 | Verify correct answers are shown | Each question shows the correct answer (only visible because GRADED) | |
| J2.7 | Verify teacher per-question comment | If teacher left a comment on a question: purple chat box with comment text | |
| J2.8 | Verify question explanations | If a question has an explanation: lightbulb icon with explanation text | |
| J2.9 | Verify "Teacher Comments" section (test-level) | If teacher left test-level comments: shown with teacher name and date | |
| J2.10 | Click "Back to Topic" button | Navigates to topic detail page | |

### J3: View Results from Entry Gate

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| J3.1 | Navigate to a test you've already completed (GRADED) | Entry Gate shows: verified icon, score, "View Full Results" button | |
| J3.2 | Click "View Full Results" | Navigates to result detail page | |

---

## PART K: Student — Retake Flow

### K1: Retake Exam

**Goal:** Verify retake mechanism works with attempt tracking.

**Setup:** Teacher must set maxAttempts >= 2 (or 0 for unlimited) on the test.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| K1.1 | As student, navigate to a GRADED test with retakes allowed | Entry Gate shows "View Full Results" and "Retake Exam" buttons | |
| K1.2 | Verify attempt info | Shows "Attempt 1 of 3" (or your current attempt number) | |
| K1.3 | Click "Retake Exam" | Button shows "Starting..." then ExamShell loads | |
| K1.4 | Check Network tab | PUT to `/api/exam-session` creates new session with incremented attemptNumber | |
| K1.5 | Verify this is a fresh exam | Timer reset to full time, no pre-filled answers, no flags | |
| K1.6 | Complete and submit the retake | Score shown for attempt 2 | |
| K1.7 | View result detail page | "Attempt History" section shows both attempts with scores | |

### K2: Max Attempts Reached

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| K2.1 | Complete all allowed attempts (e.g., 3 of 3) | After final submit: GRADED | |
| K2.2 | Navigate to the test entry gate | Shows "View Full Results" button ONLY — no "Retake Exam" button | |

---

## PART L: Notifications

### L1: Notification Bell

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| L1.1 | Verify notification bell in student navbar | Bell icon visible next to locale switcher | |
| L1.2 | If unread notifications exist | Red badge with count shown on bell | |
| L1.3 | Click the bell | Dropdown opens with notification list | |
| L1.4 | Verify notification types | "Exam graded" (verified icon), "New test available" (play icon) | |
| L1.5 | Each notification shows timestamp | "2m ago", "1h ago", or date format | |
| L1.6 | Unread notifications have blue left indicator | Dot visible on unread items | |
| L1.7 | Click "Mark all read" | All notifications lose unread styling, badge count resets to 0 | |
| L1.8 | Click outside the dropdown | Dropdown closes | |

### L2: Notification Triggers

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| L2.1 | Student submits an exam | **Teacher** receives "Exam submitted" notification | |
| L2.2 | Teacher grades and marks as graded | **Student** receives "Exam graded" notification | |
| L2.3 | Teacher changes test status DRAFT → ACTIVE | **All enrolled students** receive "New test available" notification | |

---

## PART M: Edge Cases

### M1: Non-Sectioned Test

**Goal:** Verify tests without sections still work as a single phase.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| M1.1 | Start a test that has NO sections (questions without sectionId) | ExamShell loads with single "Questions" phase + Review phase | |
| M1.2 | All questions display in one phase | No phase navigation needed (just one content phase) | |
| M1.3 | Click "REVIEW" in footer | Review phase shows single summary card | |
| M1.4 | Submit | Works normally | |

### M2: Practice Mode Unchanged

**Goal:** Verify practice mode (non-test mode) still works as before.

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| M2.1 | Find a test with `mode: "practice"` | Navigate to it | |
| M2.2 | Verify PracticeSession loads (not ExamShell) | One-question-at-a-time UI with timer per question | |
| M2.3 | Answer a question | Immediate feedback shown (correct/incorrect) | |
| M2.4 | Verify `correctAnswer` is accessible | Feedback shows the correct answer (practice mode needs it) | |

### M3: Duplicate Test Preserves Settings

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| M3.1 | As teacher, set a test to: 20 min, 3 attempts, shuffle questions ON | Settings saved | |
| M3.2 | Click the duplicate button | New test created as "(Copy)" | |
| M3.3 | Open the duplicated test settings | Verify: time limit = 20 min, max attempts = 3, shuffle questions = ON, status = DRAFT | |

---

## PART N: Responsive & Styling

### N1: Mobile Layout

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| N1.1 | Open DevTools → Toggle device toolbar → iPhone 14 (390px) | Mobile viewport | |
| N1.2 | Start an exam | ExamShell renders full-width | |
| N1.3 | Verify header shows only current phase title (not full breadcrumb) | Single title text, not multi-level breadcrumb | |
| N1.4 | Verify footer sticks to bottom with safe-area padding | Footer visible at bottom, not overlapping content | |
| N1.5 | Verify questions are full-width | No sidebar, questions fill the screen | |
| N1.6 | Open question palette | Palette panel renders correctly on mobile | |
| N1.7 | Navigate to Review phase | Single-column part summaries | |

### N2: Design System

| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| N2.1 | Verify exam background color | Light purple-white (#fdf8fe), not plain white | |
| N2.2 | Verify progress bar | Slim gradient bar (purple) at top of header | |
| N2.3 | Verify footer glassmorphism | Footer has translucent background with blur effect | |
| N2.4 | Verify "Next" button | Purple gradient (not flat color) | |
| N2.5 | Verify no hard borders between questions | Spacing/tone shifts instead of 1px borders | |

---

## PART O: Full End-to-End Lifecycle

### O1: Complete Lifecycle Test

**Goal:** Walk through the entire lifecycle in one pass.

| Step | Action | Actor | Expected Result | Pass? |
|------|--------|-------|-----------------|-------|
| O1.1 | Create or select a test with MCQ + CUE_WRITING questions | Teacher | Test exists with mixed question types | |
| O1.2 | Set: time limit 5 min, max attempts 2, status ACTIVE | Teacher | Settings saved, students notified | |
| O1.3 | Check notification bell | Student | "New test available" notification appears | |
| O1.4 | Navigate to test, see instructions | Student | Entry Gate shows test info | |
| O1.5 | Start exam | Student | ExamShell loads, timer starts at 5:00 | |
| O1.6 | Answer all MCQ questions, write something for CUE_WRITING | Student | Answers saved (auto-save indicator shows "Saved") | |
| O1.7 | Flag 2 questions for review | Student | Amber bookmarks visible | |
| O1.8 | Navigate to Review phase | Student | Per-part summaries show correct counts, 2 flagged | |
| O1.9 | Check confirmation checkbox and submit | Student | "Exam Submitted — awaiting teacher review" (because CUE_WRITING) | |
| O1.10 | Check notification bell | Teacher | "Exam submitted" notification appears | |
| O1.11 | Open Student Results, filter "Needs Grading" | Teacher | Submission appears at top | |
| O1.12 | Open the result, check "Needs review" filter | Teacher | Only CUE_WRITING questions shown | |
| O1.13 | Grade the CUE_WRITING: mark correct, add comment | Teacher | Grade saved | |
| O1.14 | Click "Mark as Graded" | Teacher | Status transitions to GRADED | |
| O1.15 | Check notification bell | Student | "Exam graded" notification appears | |
| O1.16 | Navigate to "My Results" | Student | Result shows with score and "View Results" badge | |
| O1.17 | Open result detail | Student | Score, analytics, per-question review with teacher comment visible | |
| O1.18 | Go back to test entry gate | Student | Shows score, "View Full Results", and "Retake Exam" buttons | |
| O1.19 | Click "Retake Exam" | Student | New exam starts (attempt 2), fresh timer, empty answers | |
| O1.20 | Complete and submit attempt 2 | Student | Second score shown | |
| O1.21 | View result detail | Student | Attempt History shows both attempts with scores | |
| O1.22 | Go to entry gate again | Student | No "Retake Exam" button (max 2 attempts reached) | |

---

## Test Summary Checklist

| Area | Tests | Status |
|------|-------|--------|
| **A: Teacher — Test Config** | A1-A3 (11 steps) | |
| **B: Student — Test Cards** | B1 (7 steps) | |
| **C: Student — Entry Gate** | C1-C2 (8 steps) | |
| **D: Student — Exam Taking** | D1-D6 (26 steps) | |
| **E: Student — Persistence** | E1-E2 (12 steps) | |
| **F: Student — Review & Submit** | F1-F3 (15 steps) | |
| **G: Student — Security** | G1-G3 (11 steps) | |
| **H: Student — Timer Expiry** | H1 (5 steps) | |
| **I: Teacher — Grading** | I1-I4 (21 steps) | |
| **J: Student — View Results** | J1-J3 (14 steps) | |
| **K: Student — Retakes** | K1-K2 (9 steps) | |
| **L: Notifications** | L1-L2 (11 steps) | |
| **M: Edge Cases** | M1-M3 (10 steps) | |
| **N: Responsive & Styling** | N1-N2 (12 steps) | |
| **O: Full E2E Lifecycle** | O1 (22 steps) | |
| **TOTAL** | **194 test steps** | |
