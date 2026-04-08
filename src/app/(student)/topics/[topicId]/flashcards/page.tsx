import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import FlashcardDeck from "@/components/student/FlashcardDeck";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
  const { topicId } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true },
  });
  return {
    title: topic ? `Flashcards — ${topic.title}` : "Flashcards",
    description: `Study vocabulary flashcards${topic ? ` for ${topic.title}` : ""}. Flip cards to memorize words and track your progress.`,
  };
}

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
      vocabularyId: { in: topic.vocabulary.map((v: { id: string }) => v.id) },
    },
  });

  const progressMap = Object.fromEntries(
    progress.map((p: { vocabularyId: string; learned: boolean }) => [p.vocabularyId, p.learned])
  );

  return (
    <FlashcardDeck
      topicId={topicId}
      topicTitle={topic.title}
      vocabulary={topic.vocabulary.map((v: { id: string; word: string; type: string | null; pronunciation: string | null; meaning: string; example: string | null }) => ({
        id: v.id,
        word: v.word,
        type: v.type,
        pronunciation: v.pronunciation,
        meaning: v.meaning,
        example: v.example,
        learned: progressMap[v.id] || false,
      }))}
    />
  );
}
