import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MediaTable from "@/components/teacher/MediaTable";

export default async function MediaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
          {t("media")}
        </h1>
        <p className="text-lg font-body text-[#464554] opacity-80">
          {t("mediaDescription")}
        </p>
      </div>

      <MediaTable />
    </div>
  );
}
