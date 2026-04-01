import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import QuestionEditor from "@/components/teacher/QuestionEditor";
import EditableTitle from "@/components/teacher/EditableTitle";

export default async function PracticeTestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { testId } = await params;

  const test = await prisma.practiceTest.findUnique({
    where: { id: testId, createdById: session.user.id },
    include: {
      topic: { include: { language: true } },
      questions: { orderBy: { questionNumber: "asc" } },
    },
  });

  if (!test) notFound();

  const t = await getTranslations("teacher");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <EditableTitle testId={testId} title={test.title} />
        <p className="text-[#777586] font-body mt-1">
          {test.topic.title} • {test.topic.language.name}
        </p>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-6">
        <h2 className="font-body font-bold text-xl text-[#121c2a] mb-4">
          {t("questionsLabel")} ({test.questions.length})
        </h2>
        <div className="space-y-4">
          {test.questions.map((q: { id: string; questionNumber: number; content: string; questionType: string; answer1: string; answer2: string | null; answer3: string | null; answer4: string | null; correctAnswer: string; timer: number }) => (
            <QuestionEditor
              key={q.id}
              question={{
                id: q.id,
                questionNumber: q.questionNumber,
                content: q.content,
                questionType: q.questionType,
                answer1: q.answer1,
                answer2: q.answer2,
                answer3: q.answer3,
                answer4: q.answer4,
                correctAnswer: q.correctAnswer,
                timer: q.timer,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
