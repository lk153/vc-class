# Playwright E2E Test Suite — User Guide

A step-by-step guide for running the VC Class automated end-to-end tests. No prior Playwright experience needed.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-Time Setup](#2-first-time-setup)
3. [Running Tests](#3-running-tests)
4. [Understanding the Results](#4-understanding-the-results)
5. [Running Specific Tests](#5-running-specific-tests)
6. [Debugging Failed Tests](#6-debugging-failed-tests)
7. [Data Safety: How Tests Keep Your DB Clean](#7-data-safety-how-tests-keep-your-db-clean)
8. [Folder Structure Explained](#8-folder-structure-explained)
9. [Writing New Tests](#9-writing-new-tests)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before running the tests, make sure you have:

| Requirement | How to Check | Install If Missing |
|---|---|---|
| Node.js 18+ | `node --version` | [nodejs.org](https://nodejs.org) |
| Docker | `docker --version` | [docker.com](https://docker.com) |
| PostgreSQL running | `docker compose ps` | `make db` |
| Database seeded | Check if login works at localhost:18888 | `make db-migrate && make db-seed` |
| Dev server running | Visit http://localhost:18888 | `make dev` |

---

## 2. First-Time Setup

Run these commands once after cloning the repo:

```bash
# Step 1: Install all dependencies (includes Playwright)
npm install

# Step 2: Install Playwright browsers (Chromium for testing)
npx playwright install chromium

# Step 3: Start the database (if not already running)
make db

# Step 4: Run database migrations and seed test data
make db-migrate
make db-seed

# Step 5: Start the dev server (in a separate terminal)
make dev
```

**Verify setup is complete:**
1. Open http://localhost:18888/login in your browser
2. Login with `nga@teacher.com` / `123123` → should redirect to `/teacher`
3. Login with `sang@stu.com` / `123123` → should redirect to `/topics`

If both logins work, you're ready to run tests.

---

## 3. Running Tests

### Quick Commands (via Makefile)

| Command | What It Does | When to Use |
|---|---|---|
| `make e2e` | Run all tests (headless, Chromium) | Standard full test run |
| `make e2e-ui` | Open Playwright UI (interactive) | Exploring/debugging tests |
| `make e2e-headed` | Run with visible browser | See what the browser is doing |
| `make e2e-report` | Open last test report (HTML) | After a test run to review |

### Step-by-Step: Your First Test Run

```bash
# 1. Make sure your dev server is running in another terminal
make dev

# 2. Run all tests
make e2e
```

You'll see output like this:
```
Running 172 tests using 1 worker

  ✓ [setup] authenticate teacher (2s)
  ✓ [setup] authenticate student (2s)
  ✓ [chromium] tests/auth/login.spec.ts:13 should display login form (1s)
  ✓ [chromium] tests/auth/login.spec.ts:20 should login as teacher (3s)
  ...
  ✓ [teardown] cleanup e2e test data from database (0.5s)
  ✓ [teardown] remove auth state files (0.1s)

  172 passed (3m 45s)
```

### Run with Interactive UI (Recommended for First Time)

```bash
make e2e-ui
```

This opens Playwright's visual interface where you can:
- See all test files in a sidebar
- Click any test to run it individually
- Watch the browser in real-time
- Step through test actions one by one
- View screenshots and traces of failures

---

## 4. Understanding the Results

### Terminal Output

- ✓ Green = test passed
- ✗ Red = test failed (shows error message and location)
- ○ Gray = test skipped

### HTML Report

After any test run, view the detailed report:

```bash
make e2e-report
```

The report opens in your browser showing:
- Pass/fail summary per test file
- Failure screenshots (auto-captured)
- Execution time per test
- Trace files for retried tests (click to view step-by-step)

### Trace Viewer (for failed tests)

When a test fails and retries, Playwright captures a **trace** — a recording of every action, network request, and screenshot. To view:

1. Open the HTML report (`make e2e-report`)
2. Click on a failed test
3. Click the **Trace** link
4. Browse the timeline: see exactly what happened at each step

---

## 5. Running Specific Tests

### By folder (domain)

```bash
# Only auth tests
npx playwright test --config playwright/playwright.config.ts --project chromium tests/auth/

# Only student tests
npx playwright test --config playwright/playwright.config.ts --project chromium tests/student/

# Only teacher tests
npx playwright test --config playwright/playwright.config.ts --project chromium tests/teacher/
```

### By file

```bash
# Only login tests
npx playwright test --config playwright/playwright.config.ts --project chromium tests/auth/login.spec.ts

# Only practice tests page
npx playwright test --config playwright/playwright.config.ts --project chromium tests/teacher/practice-tests.spec.ts
```

### By test name (grep)

```bash
# Run only tests with "pagination" in the name
npx playwright test --config playwright/playwright.config.ts --project chromium --grep "pagination"

# Run only tests with "login" in the name
npx playwright test --config playwright/playwright.config.ts --project chromium --grep "login"
```

### On different browsers

```bash
# Run on Firefox
npx playwright test --config playwright/playwright.config.ts --project firefox

# Run on mobile Chrome (Pixel 5 viewport)
npx playwright test --config playwright/playwright.config.ts --project mobile-chrome

# Run on mobile Safari (iPhone 12 viewport)
npx playwright test --config playwright/playwright.config.ts --project mobile-safari

# Run on ALL browsers
npx playwright test --config playwright/playwright.config.ts
```

---

## 6. Debugging Failed Tests

### Method 1: Headed Mode (watch the browser)

```bash
make e2e-headed
```

### Method 2: UI Mode (step through interactively)

```bash
make e2e-ui
```

### Method 3: Debug a Single Test

```bash
npx playwright test --config playwright/playwright.config.ts --project chromium --debug tests/auth/login.spec.ts
```

This opens the Playwright Inspector where you can:
- Step through each action with a button click
- See the selector being used
- Inspect the page live in the browser
- Edit and re-run actions

### Method 4: Check Failure Artifacts

After a failed run, check these auto-generated files:
- `playwright/test-results/` — screenshots and videos of failures
- `playwright/report/` — HTML report with trace links

---

## 7. Data Safety: How Tests Keep Your DB Clean

**Guarantee: your database is identical before and after running tests.**

### How It Works (3 Layers)

```
┌─────────────────────────────────────────────────┐
│  Layer 1: READ-ONLY tests (majority)            │
│  Most tests only READ existing seed data.       │
│  They browse pages, click filters, verify UI.   │
│  No data is created or modified.                │
│                                                 │
│  Layer 2: CREATE tests use E2E prefix           │
│  Tests that create data use special naming:     │
│  • Emails: *@e2e.test                           │
│  • Names/Titles: "E2E ..." prefix               │
│  This marks them for automatic cleanup.         │
│                                                 │
│  Layer 3: Global Teardown (safety net)          │
│  After ALL tests complete, teardown runs:       │
│  DELETE FROM users WHERE email LIKE '%@e2e.test'│
│  DELETE FROM topics WHERE title LIKE 'E2E %'    │
│  DELETE FROM classes WHERE name LIKE 'E2E %'    │
│  DELETE FROM practice_tests WHERE title LIKE... │
│  This catches everything, even from crashed     │
│  tests that couldn't clean up after themselves. │
└─────────────────────────────────────────────────┘
```

### Test Execution Order

```
1. Global Setup     → Login as teacher + student, save auth cookies
2. Test Specs       → Run all 23 spec files
   ├── READ tests   → Browse seed data (no changes)
   ├── CREATE tests → Create "E2E ..." data → verify → mark for cleanup
   └── VALIDATE     → Submit invalid data (rejected, no DB change)
3. Global Teardown  → Delete all "E2E" data → remove auth files
4. Result           → DB is exactly as it was before step 1
```

### Manual Cleanup (if something goes wrong)

If tests crash mid-run and teardown didn't execute:

```bash
# Option 1: Call the cleanup API manually
curl -X DELETE http://localhost:18888/api/e2e/cleanup \
  -H "Content-Type: application/json" \
  -d '{"secret": "e2e-cleanup-key"}'

# Option 2: Reset the entire database to seed state
make db-reset
```

---

## 8. Folder Structure Explained

```
playwright/
│
├── playwright.config.ts    ← Main config: browsers, timeouts, server
├── global-setup.ts         ← Runs FIRST: logs in, saves auth cookies
├── global-teardown.ts      ← Runs LAST: cleans up test data from DB
├── tsconfig.json           ← TypeScript config for test files
├── .gitignore              ← Ignores results, reports, auth files
│
├── fixtures/               ← Test setup shared across all specs
│   ├── auth.fixture.ts     ← Pre-authenticated page fixtures
│   └── base.ts             ← Single import: `import { test, expect } from "./base"`
│
├── pages/                  ← Page Object Models (POM) — one per page
│   ├── student/            ← 9 POMs for student pages
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── TopicsPage.ts
│   │   ├── TopicDetailPage.ts
│   │   ├── FlashcardsPage.ts
│   │   ├── ExamPage.ts
│   │   ├── PracticeSessionPage.ts
│   │   ├── ResultsPage.ts
│   │   └── ResultDetailPage.ts
│   └── teacher/            ← 13 POMs for teacher pages
│       ├── DashboardPage.ts
│       ├── ClassesPage.ts
│       ├── ClassDetailPage.ts
│       ├── PracticeTestsPage.ts
│       ├── PracticeTestDetailPage.ts
│       ├── ImportTestPage.ts
│       ├── StudentsPage.ts
│       ├── StudentResultsPage.ts
│       ├── ResultDetailPage.ts
│       ├── TopicsPage.ts
│       ├── TopicDetailPage.ts
│       ├── ImportVocabPage.ts
│       └── MediaPage.ts
│
├── helpers/                ← Shared utilities
│   ├── api.helper.ts       ← REST API shortcuts (create, delete data)
│   ├── assertions.ts       ← Custom expect helpers (toast, score color)
│   └── seed.helper.ts      ← Test data factory (unique names, CSVs)
│
├── tests/                  ← Test specs organized by domain
│   ├── auth/               ← 2 specs: login, register
│   ├── student/            ← 8 specs: topics, flashcards, exam, results...
│   └── teacher/            ← 13 specs: dashboard, classes, tests, media...
│
├── test-data/              ← Static fixtures for import tests
│   ├── sample-test.csv
│   └── sample-vocab.csv
│
└── .auth/                  ← Auto-generated auth cookies (gitignored)
    ├── teacher.json
    └── student.json
```

### What is a Page Object Model (POM)?

A POM is a class that wraps all selectors and actions for one page. Instead of writing selectors in tests:

```typescript
// ❌ Bad: selectors scattered in tests (breaks when UI changes)
await page.locator(".rounded-2xl button.bg-purple").click();
```

We use POMs:

```typescript
// ✅ Good: POM encapsulates selectors (update one file when UI changes)
const topicsPage = new TeacherTopicsPage(page);
await topicsPage.createButton.click();
```

---

## 9. Writing New Tests

### Step 1: Pick the Right Folder

- New student page? → `tests/student/`
- New teacher page? → `tests/teacher/`

### Step 2: Create a POM (if new page)

```typescript
// playwright/pages/teacher/NewFeaturePage.ts
import { type Page, type Locator } from "@playwright/test";

export class NewFeaturePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.saveButton = page.getByRole("button", { name: /save/i });
  }

  async goto() {
    await this.page.goto("/teacher/new-feature");
  }
}
```

### Step 3: Write the Spec

```typescript
// playwright/tests/teacher/new-feature.spec.ts
import { test, expect } from "../../fixtures/base";
import { NewFeaturePage } from "../../pages/teacher/NewFeaturePage";
import { uniqueName } from "../../helpers/seed.helper";

test.describe("Teacher New Feature", () => {
  let featurePage: NewFeaturePage;

  test.beforeEach(async ({ teacherPage }) => {
    featurePage = new NewFeaturePage(teacherPage);
    await featurePage.goto();
  });

  // READ-only test: no cleanup needed
  test("page loads with heading", async ({ teacherPage }) => {
    await expect(featurePage.heading).toBeVisible();
  });

  // CREATE test: uses E2E prefix for automatic cleanup
  test("create item, verify, cleanup handled by teardown", async ({ teacherPage }) => {
    const name = uniqueName("Item");  // "E2E lq3k4..." → auto-deleted
    // ... create and verify ...
  });
});
```

### Step 4: Data Cleanup Rules

| Test Type | What to Do |
|---|---|
| **READ-only** (browse, filter, click) | Nothing — no data created |
| **CREATE** (new topic, user, test) | Use `uniqueName()` / `uniqueEmail()` — auto-cleaned by teardown |
| **UPDATE** (edit existing) | Only edit seed data back to original, or use E2E-created data |
| **DELETE** (remove something) | Only delete E2E-created data, never seed data |

### Step 5: Run Your Test

```bash
npx playwright test --config playwright/playwright.config.ts --project chromium tests/teacher/new-feature.spec.ts --headed
```

---

## 10. Troubleshooting

### "Cannot find module" errors

```bash
# Reinstall dependencies
npm install
npx playwright install chromium
```

### "Target page, context or browser has been closed"

This means the browser closed before the test finished. Check:
- Is your dev server running? (`make dev`)
- Is the timeout too short? Increase in `playwright.config.ts`

### "Login failed" in global setup

1. Check that the dev server is running at http://localhost:18888
2. Verify credentials match your seed data:
   - Teacher: `nga@teacher.com` / `123123`
   - Student: `sang@stu.com` / `123123`
3. If passwords changed, update `playwright/global-setup.ts` or set env vars:
   ```bash
   E2E_TEACHER_EMAIL=new@email.com E2E_TEACHER_PASS=newpass make e2e
   ```

### Tests pass locally but fail in CI

- CI uses `retries: 2` — if a test fails once but passes on retry, it's **flaky**
- Check the trace in the HTML report for timing issues
- Increase specific timeouts for slow operations

### "Test data left in database"

```bash
# Manual cleanup
curl -X DELETE http://localhost:18888/api/e2e/cleanup \
  -H "Content-Type: application/json" \
  -d '{"secret": "e2e-cleanup-key"}'

# Nuclear option: full DB reset
make db-reset
```

### Port 18888 already in use

```bash
# Find and kill the process
lsof -ti:18888 | xargs kill -9
# Then restart
make dev
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│  make e2e           → Run all tests (headless)   │
│  make e2e-ui        → Interactive UI mode         │
│  make e2e-headed    → Watch browser live          │
│  make e2e-report    → View HTML report            │
│                                                   │
│  Tests: playwright/tests/{auth,student,teacher}/  │
│  POMs:  playwright/pages/{student,teacher}/       │
│  Config: playwright/playwright.config.ts          │
│                                                   │
│  DB Safety: E2E data auto-cleaned after each run  │
│  Manual cleanup: curl DELETE /api/e2e/cleanup     │
└──────────────────────────────────────────────────┘
```
