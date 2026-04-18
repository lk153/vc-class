import { type APIRequestContext } from "@playwright/test";

/**
 * API helper — creates/deletes test data through the app's REST endpoints.
 * Faster than UI interactions for test setup/teardown.
 */
export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  // ── Auth ──

  async register(data: {
    name: string;
    email: string;
    password: string;
    learnLanguageId?: string;
  }) {
    return this.request.post("/api/auth/register", { data });
  }

  // ── Teacher: Topics ──

  async createTopic(data: { title: string; languageId: string; description?: string }) {
    return this.request.post("/api/teacher/topics", { data });
  }

  // ── Teacher: Classes ──

  async createClass(data: {
    name: string;
    languageId: string;
    level: string;
    schedule: string;
    startDate: string;
    endDate: string;
  }) {
    return this.request.post("/api/teacher/classes", { data });
  }

  // ── Teacher: Practice Tests ──

  async createPracticeTest(data: { title: string; topicId: string }) {
    return this.request.post("/api/teacher/practice-tests", { data });
  }

  async updatePracticeTest(data: Record<string, unknown>) {
    return this.request.put("/api/teacher/practice-tests", { data });
  }

  async deletePracticeTest(id: string) {
    return this.request.delete("/api/teacher/practice-tests", {
      data: { id },
    });
  }

  async importTest(data: FormData | Record<string, unknown>) {
    return this.request.post("/api/teacher/practice-tests/import", { data });
  }

  // ── Teacher: Questions ──

  async updateQuestion(data: Record<string, unknown>) {
    return this.request.put("/api/teacher/questions", { data });
  }

  async bulkCreateQuestions(data: { practiceTestId: string; questions: Record<string, unknown>[] }) {
    return this.request.post("/api/teacher/questions/bulk", { data });
  }

  // ── Teacher: Students ──

  async updateStudent(userId: string, data: Record<string, unknown>) {
    return this.request.patch(`/api/teacher/students`, { data: { userId, ...data } });
  }

  // ── Teacher: Media ──

  async deleteMedia(id: string) {
    return this.request.delete(`/api/teacher/media/${id}`);
  }

  // ── Teacher: Assignments ──

  async assignTopics(data: { topicIds: string[]; classIds: string[] }) {
    return this.request.post("/api/teacher/assignments", { data });
  }

  async unassignTopic(assignmentId: string) {
    return this.request.delete(`/api/teacher/assignments/${assignmentId}`);
  }

  // ── Teacher: Enrollment ──

  async enrollStudent(classId: string, userId: string) {
    return this.request.post(`/api/teacher/classes/${classId}/enroll`, {
      data: { userId },
    });
  }

  async unenrollStudent(classId: string, userId: string) {
    return this.request.delete(`/api/teacher/classes/${classId}/enroll/${userId}`);
  }

  // ── Exam Session ──

  async createExamSession(data: { practiceTestId: string }) {
    return this.request.post("/api/exam-session", { data });
  }

  async saveExamSession(sessionId: string, data: Record<string, unknown>) {
    return this.request.patch(`/api/exam-session/${sessionId}/save`, { data });
  }

  async submitExam(sessionId: string) {
    return this.request.post(`/api/exam-session/${sessionId}/submit`);
  }

  // ── Student: Results ──

  async getStudentResults() {
    return this.request.get("/api/student/results");
  }

  async getResultDetail(resultId: string) {
    return this.request.get(`/api/student/results/${resultId}`);
  }

  // ── Notifications ──

  async getNotifications() {
    return this.request.get("/api/notifications");
  }

  async markNotificationsRead() {
    return this.request.patch("/api/notifications", { data: { readAll: true } });
  }
}
