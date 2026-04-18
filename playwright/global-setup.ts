import { test as setup, expect } from "@playwright/test";
import path from "path";

const TEACHER_AUTH = path.join(__dirname, ".auth", "teacher.json");
const STUDENT_AUTH = path.join(__dirname, ".auth", "student.json");

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || "nga@teacher.com";
const TEACHER_PASS = process.env.E2E_TEACHER_PASS || "123123";
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || "sang@stu.com";
const STUDENT_PASS = process.env.E2E_STUDENT_PASS || "123123";

/* Seed IDs for exam test prerequisites */
const CITY_TOPIC_ID = "cmnfot7wi00037w5cnvn9n8no";
const ENG_CLASS_ID = "cmn5vbocb00007w5cgd0uqtav";

setup("authenticate teacher", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEACHER_EMAIL);
  await page.getByLabel(/password/i).fill(TEACHER_PASS);
  await page.getByRole("button", { name: /login|sign in/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15_000 });
  await page.context().storageState({ path: TEACHER_AUTH });
});

setup("authenticate student", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(STUDENT_EMAIL);
  await page.getByLabel(/password/i).fill(STUDENT_PASS);
  await page.getByRole("button", { name: /login|sign in/i }).click();
  await page.waitForURL(/\/topics/, { timeout: 15_000 });
  await page.context().storageState({ path: STUDENT_AUTH });
});

setup("ensure student can access exam data", async ({ browser }) => {
  /*
   * The test student (sang@stu.com) may not be enrolled in the seed class
   * or the City topic may not be assigned. Fix both:
   * 1. Get student's user ID from their NextAuth session
   * 2. Enroll them in the English class
   * 3. Assign City topic to the class
   */

  // Step 1: Get student user ID from their session
  const studentCtx = await browser.newContext({ storageState: STUDENT_AUTH });
  const sessionRes = await studentCtx.request.get("/api/auth/session");
  const session = await sessionRes.json();
  const studentUserId = session?.user?.id;
  await studentCtx.close();

  if (!studentUserId) {
    console.log("⚠ Could not get student user ID from session — exam tests may fail");
    return;
  }
  console.log(`✓ Student user ID: ${studentUserId}`);

  // Step 2 & 3: Use teacher context for enrollment + assignment
  const teacherCtx = await browser.newContext({ storageState: TEACHER_AUTH });
  const req = teacherCtx.request;

  // Enroll student in the English class
  const enrollRes = await req.post(`/api/teacher/classes/${ENG_CLASS_ID}/enroll`, {
    data: { studentIds: [studentUserId] },
    failOnStatusCode: false,
  });
  console.log(`✓ Student enrollment: ${enrollRes.status()}`);

  // Assign City topic to class
  const assignRes = await req.post("/api/teacher/assignments", {
    data: { topicIds: [CITY_TOPIC_ID], classIds: [ENG_CLASS_ID] },
    failOnStatusCode: false,
  });
  console.log(`✓ Topic assignment: ${assignRes.status()}`);

  await teacherCtx.close();
});
