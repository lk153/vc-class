"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";

type ParsedWord = {
  number?: string;
  word: string;
  type?: string;
  pronunciation?: string;
  meaning: string;
  example?: string;
};

type ValidatedRow = ParsedWord & { errors: string[] };

type Props = { topicId: string };

export default function VocabCsvImporter({ topicId }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);

  function validateRow(row: ParsedWord): ValidatedRow {
    const errors: string[] = [];
    if (!row.word?.trim()) errors.push(t("vocabWordRequired"));
    if (!row.meaning?.trim()) errors.push(t("vocabMeaningRequired"));
    return { ...row, errors };
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<ParsedWord>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const validated = results.data.map((row) => validateRow(row));
        setRows(validated);
        setFileSelected(true);
      },
      error() {
        toast.error(t("csvParseFailed"));
      },
    });
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/templates/vocab_template.csv";
    a.download = "vocab_template.csv";
    a.click();
  }

  async function handleImport() {
    if (rows.length === 0) return;
    if (rows.some((r) => r.errors.length > 0)) {
      toast.error(t("csvFixErrors"));
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/teacher/vocabulary/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          words: rows.map((r, i) => ({
            word: r.word.trim(),
            type: r.type?.trim() || null,
            pronunciation: r.pronunciation?.trim() || null,
            meaning: r.meaning.trim(),
            example: r.example?.trim() || null,
            sortOrder: r.number ? parseInt(r.number) : i,
          })),
        }),
      });

      if (!res.ok) {
        toast.error(t("vocabImportFailed"));
        return;
      }

      toast.success(t("vocabImportSuccess"));
      router.push(`/teacher/topics/${topicId}`);
    } catch {
      toast.error(t("vocabImportFailed"));
    } finally {
      setImporting(false);
    }
  }

  const hasErrors = rows.some((r) => r.errors.length > 0);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl ambient-shadow p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5">
            {t("uploadCsv")}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-[#c7c4d7]/30 rounded-xl px-5 py-4 flex items-center gap-3 cursor-pointer hover:border-[#2a14b4]/30 hover:bg-[#d9e3f6]/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]/40">upload_file</span>
              <span className="text-sm font-body text-[#777586]">
                {fileSelected ? fileInputRef.current?.files?.[0]?.name : t("chooseCsvFile")}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#f0eef6] text-[#2a14b4] font-body font-bold text-xs hover:bg-[#e3dfff] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              {t("downloadTemplate")}
            </button>
          </div>
        </div>
      </div>

      {/* Preview table */}
      {fileSelected && rows.length > 0 && (
        <div className="bg-white rounded-xl ambient-shadow p-6 md:p-8">
          <h2 className="font-body font-bold text-lg text-[#121c2a] mb-4">
            {t("csvPreview", { count: rows.length })}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#c7c4d7]/15">
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">#</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">{t("word")}</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Type</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">Pronunciation</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">{t("meaning")}</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">{t("example")}</th>
                  <th className="text-left py-2 px-3 text-[10px] font-body font-bold uppercase tracking-widest text-[#777586]">{t("csvStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#c7c4d7]/10 last:border-0 ${
                      row.errors.length > 0 ? "bg-[#ffdada]/10" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-[#777586]">{row.number || i + 1}</td>
                    <td className="py-2.5 px-3 font-body font-medium text-[#121c2a]">{row.word}</td>
                    <td className="py-2.5 px-3 font-body text-[#777586] text-xs">{row.type || "—"}</td>
                    <td className="py-2.5 px-3 font-body text-[#777586] text-xs italic">{row.pronunciation || "—"}</td>
                    <td className="py-2.5 px-3 font-body text-[#464554]">{row.meaning}</td>
                    <td className="py-2.5 px-3 font-body text-[#777586] text-xs italic">{row.example || "—"}</td>
                    <td className="py-2.5 px-3">
                      {row.errors.length > 0 ? (
                        <span className="text-[#7b0020] text-xs">{row.errors.join(", ")}</span>
                      ) : (
                        <span className="text-[#1b6b51] text-xs">{t("csvValid")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {fileSelected && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing || hasErrors || rows.length === 0}
            className="inline-flex items-center gap-2 bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[18px] ${importing ? "animate-spin" : ""}`}>
              {importing ? "progress_activity" : "upload"}
            </span>
            {t("import")}
          </button>
        </div>
      )}
    </div>
  );
}
