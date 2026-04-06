import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import VocabCsvImporter from "@/components/teacher/VocabCsvImporter";

export default async function ImportVocabPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { topicId } = await params;
  const t = await getTranslations("teacher");

  const topic = await prisma.topic.findUnique({
    where: { id: topicId, createdById: session.user.id },
    include: { language: true },
  });

  if (!topic) notFound();

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <Link
          href={`/teacher/topics/${topicId}`}
          className="inline-flex items-center gap-1 text-sm font-body text-[#777586] hover:text-[#2a14b4] transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {t("backToTopic")}
        </Link>
        <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
          {t("importVocab")}
        </h1>
        <p className="text-lg font-body text-[#464554] opacity-80">
          {t("importVocabSubtitle")} — <span className="font-medium text-[#121c2a]">{topic.title}</span>
        </p>
      </div>

      <VocabCsvImporter topicId={topicId} />
    </div>
  );
}
