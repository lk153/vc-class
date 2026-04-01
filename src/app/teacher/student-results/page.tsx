import { getTranslations } from "next-intl/server";
import StudentResultsTable from "@/components/teacher/StudentResultsTable";

export default async function StudentResultsPage() {
  const t = await getTranslations("teacher");

  return (
    <div>
      {/* Editorial Header */}
      <div className="mb-10">
        <h1 className="font-body font-bold text-3xl text-[#121c2a] mb-2">
          {t("studentResults")}
        </h1>
        <p className="text-lg font-body text-[#464554] opacity-80">
          {t("studentResultsDescription")}
        </p>
      </div>

      <StudentResultsTable />
    </div>
  );
}
