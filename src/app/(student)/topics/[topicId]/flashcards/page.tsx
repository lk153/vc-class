import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import FlashcardDeck from "@/components/student/FlashcardDeck";

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { topicId } = await params;

  const hasAccess = await prisma.classEnrollment.findFirst({
    where: {
      userId: session.user.id,
      class: { topicAssignments: { some: { topicId } } },
    },
  });
  if (!hasAccess) notFound();

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      vocabulary: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!topic) notFound();

  const progress = await prisma.flashcardProgress.findMany({
    where: {
      userId: session.user.id,
      vocabularyId: { in: topic.vocabulary.map((v) => v.id) },
    },
  });

  const progressMap = Object.fromEntries(
    progress.map((p) => [p.vocabularyId, p.learned])
  );

  return (
    <FlashcardDeck
      topicId={topicId}
      topicTitle={topic.title}
      vocabulary={topic.vocabulary.map((v) => ({
        id: v.id,
        word: v.word,
        meaning: v.meaning,
        example: v.example,
        learned: progressMap[v.id] || false,
      }))}
    />
  );
}
