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

**Seed the E2E workspace (one-time)**:

The Playwright suite authenticates as two dedicated E2E users that own every row the tests create. Real users never see that data because the app already filters every query by owner. Seed those users + the baseline fixture graph:

```bash
E2E_ALLOW=yes make e2e-seed
```

This upserts `e2e-teacher@e2e.test` and `e2e-student@e2e.test` (both with `isTest=true`), one class with the student enrolled, two topics, and two practice tests — all with fixed IDs declared in [`workspace/fixtures.ts`](workspace/fixtures.ts) so tests target them deterministically.

**Verify setup is complete:**
1. Open http://localhost:18888/login
2. Login with `e2e-teacher@e2e.test` / (password from `workspace/identity.ts`) → redirects to `/teacher`
3. Login with `e2e-student@e2e.test` → redirects to `/topics`

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

## 7. Data Safety: Ownership-Isolated Test Workspace

**Guarantee: no real-user row is ever read, modified, or deleted by the suite.**

### Primary isolation: ownership, not naming

Every Prisma query the app already runs for teachers filters by `createdById = session.user.id`. The suite exploits that: it authenticates as two dedicated users (`e2e-teacher@e2e.test`, `e2e-student@e2e.test`, both `isTest=true`), and every row a test creates is automatically owned by one of them. Real users never see it because their queries filter by *their* ID. No shared namespace means no risk of a test touching a real row.

### Three defensive layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Ownership filter (primary)                     │
│ createdById / teacherId / userId = E2E user id          │
│ → invisible to real users via existing Prisma filters   │
│                                                         │
│ Layer 2: Pre-flight guard                               │
│ Before any spec runs, /api/e2e/me confirms the session  │
│ is isTest=true. Misconfigured env → entire suite aborts │
│ before mutating a row.                                  │
│                                                         │
│ Layer 3: Workspace reset (teardown)                     │
│ /api/e2e/workspace/reset deletes every row whose owner  │
│ chain reaches an isTest=true User (leaf → root, inside  │
│ a single transaction), then re-upserts the baseline     │
│ fixture graph. Runs even if tests crashed.              │
└─────────────────────────────────────────────────────────┘
```

### Test execution order

```
1. Global Setup     → Login as e2e-teacher + e2e-student
                    → preflight: GET /api/e2e/me → abort if !isTest
2. Test Specs       → Run all spec files
                      ALL created rows owned by E2E users
3. Global Teardown  → POST /api/e2e/workspace/reset
                      (ordered delete + reseed in one transaction)
4. Result           → DB is exactly as it was before step 1
```

### The "E2E " prefix is still used — but only as a readable tag

`uniqueName()` in [`helpers/seed.helper.ts`](helpers/seed.helper.ts) prepends `E2E ` to every generated name. That is purely a human-readable sentinel (handy when eyeballing the DB). It is **not** the cleanup mechanism — ownership is.

### Manual reset (if something goes wrong)

If a run crashed and you want to force a clean slate:

```bash
# Full reset: deletes every row owned by isTest=true users, then reseeds
curl -X POST http://localhost:18888/api/e2e/workspace/reset \
  -H "x-e2e-secret: e2e-cleanup-key"
```

`/api/e2e/workspace/reset` refuses to run unless `E2E_ALLOW=yes` is set in the server process's environment. Production never sets it.

---

## 8. Folder Structure Explained

```
playwright/
│
├── playwright.config.ts    ← Main config: browsers, timeouts, server
├── global-setup.ts         ← Runs FIRST: logs in as E2E users + preflight
├── global-teardown.ts      ← Runs LAST: POST /api/e2e/workspace/reset
├── tsconfig.json           ← TypeScript config for test files
├── .gitignore              ← Ignores results, reports, auth files
│
├── workspace/              ← E2E isolation contract (LOAD-BEARING)
│   ├── identity.ts         ← E2E_TEACHER / E2E_STUDENT (fixed IDs + creds)
│   ├── fixtures.ts         ← E2E_CLASS_ID / E2E_TOPIC_IDS / E2E_TEST_IDS
│   ├── reset.ts            ← client for /api/e2e/workspace/reset
│   └── preflight.ts        ← aborts suite if session is not isTest=true
│
├── fixtures/               ← Playwright test.extend scaffolding
│   ├── auth.fixture.ts     ← Pre-authenticated E2E page fixtures
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
    ├── e2e-teacher.json
    └── e2e-student.json
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

Cleanup is no longer your concern for most tests — the workspace reset endpoint reclaims every row owned by the E2E users after each run. That said:

| Test Type | What to Do |
|---|---|
| **READ-only** (browse, filter, click) | Nothing — use fixed fixture IDs from `workspace/fixtures.ts` instead of `.first()` |
| **CREATE** (new topic, user, test) | Use `uniqueName()` / `uniqueEmail()` — the row is owned by the E2E user automatically via `teacherApi` / `studentApi`, so teardown reclaims it |
| **UPDATE** (edit existing) | Only touch E2E-owned rows. Never mutate baseline fixtures defined in `workspace/fixtures.ts` — other tests depend on them |
| **DELETE** (remove something) | Only delete E2E-created rows. Baseline fixtures are re-upserted on teardown, so deleting one will cause a compensating insert on the next run (subtle churn; avoid) |
| **Target a specific row** | Reference `E2E_CLASS_ID`, `E2E_TOPIC_IDS.primary`, etc. — never `topicCards.first()` |

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

1. Check that the dev server is running at http://localhost:18888.
2. Confirm the E2E workspace is seeded:
   ```bash
   E2E_ALLOW=yes make e2e-seed
   ```
   Missing E2E users → login step fails with "Invalid credentials".
3. Credentials live in [`workspace/identity.ts`](workspace/identity.ts) and must match what `prisma/seed.e2e.ts` upserts. They are intentionally not overridable via env var — a misconfigured env pointing at a real user is exactly the failure mode the design prevents.

### "Pre-flight aborted: authenticated as a non-test user"

The `preflight` step detected that the session's User row has `isTest=false`, or the email doesn't end in `@e2e.test`. Causes:

- Stale `.auth/*.json` from an earlier run with different credentials — run `make e2e` again; teardown wipes them.
- `prisma/seed.e2e.ts` wrote a User without `isTest=true` — inspect the seed file.
- Someone manually flipped `isTest` on the E2E user to `false` in the DB — restore it.

### "/api/e2e/me returned 404"

The E2E endpoints aren't deployed on this environment. They live in `src/app/api/e2e/` and must be present for the suite to run. They're dev-only and gated on `E2E_ALLOW=yes`.

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
