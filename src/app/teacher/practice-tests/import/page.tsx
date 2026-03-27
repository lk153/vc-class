import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CsvImporter from "@/components/teacher/CsvImporter";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const topics = await prisma.topic.findMany({
    where: { createdById: session.user.id },
    include: { language: true },
    orderBy: { title: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Import Practice Test</h1>
      <CsvImporter
        topics={topics.map((t) => ({
          id: t.id,
          title: t.title,
          languageName: t.language.name,
        }))}
      />
    </div>
  );
}
