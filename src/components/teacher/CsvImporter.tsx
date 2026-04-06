"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { tLang } from "@/lib/i18n/tLang";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";
import { detectMediaType } from "@/lib/mediaType";

type Topic = { id: string; title: string; languageName: string };

type ParsedQuestion = {
  question_number: string;
  content: string;
  question_type: string;
  content_media_url?: string;
  content_media_type?: string;
  answer_1: string;
  answer_1_media_url?: string;
  answer_1_media_type?: string;
  answer_2: string;
  answer_2_media_url?: string;
  answer_2_media_type?: string;
  answer_3: string;
  answer_3_media_url?: string;
  answer_3_media_type?: string;
  answer_4: string;
  answer_4_media_url?: string;
  answer_4_media_type?: string;
  correct_answer: string;
  timer: string;
  difficulty?: string;
  explanation?: string;
};

type ValidatedRow = ParsedQuestion & {
  errors: string[];
  _contentMediaType: string | null;
  _a1MediaType: string | null;
  _a2MediaType: string | null;
  _a3MediaType: string | null;
  _a4MediaType: string | null;
};

type Props = { topics: Topic[] };

function resolveMediaType(url?: string, explicitType?: string): string | null {
  if (!url) return null;
  if (explicitType && ["image", "audio", "video"].includes(explicitType)) return explicitType;
  return detectMediaType(url);
}

function mediaIcon(type: string | null): string {
  if (type === "image") return "image";
  if (type === "audio") return "audio_file";
  if (type === "video") return "video_file";
  return "";
}

function mediaColor(type: string | null): string {
  if (type === "image") return "text-[#2a14b4]";
  if (type === "audio") return "text-[#1b6b51]";
  if (type === "video") return "text-[#7b0020]";
  return "text-[#777586]";
}

export default function CsvImporter({ topics }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);

  function validateRow(row: ParsedQuestion, index: number): ValidatedRow {
    const errors: string[] = [];
    const type = row.question_type?.toUpperCase();

    if (!row.content) errors.push(t("csvContentRequired"));
    if (!["YES_NO", "MULTIPLE_CHOICE", "GAP_FILL"].includes(type)) {
      errors.push(t("csvInvalidType"));
    }
    if (!row.answer_1) errors.push(t("csvAnswer1Required"));
    if (type === "YES_NO" && !row.answer_2) errors.push(t("csvAnswer2Required"));
    if (type === "MULTIPLE_CHOICE") {
      if (!row.answer_2 || !row.answer_3 || !row.answer_4) {
        errors.push(t("csvAllAnswersRequired"));
      }
    }
    if (!row.correct_answer) {
      errors.push(t("csvCorrectRequired"));
    } else {
      // Validate correct_answer matches one of the answer options
      const answers = [row.answer_1, row.answer_2, row.answer_3, row.answer_4].filter(Boolean);
      if (answers.length > 0 && !answers.includes(row.correct_answer)) {
        errors.push("correct_answer must match an answer option");
      }
    }

    // Auto-detect media types
    const _contentMediaType = resolveMediaType(row.content_media_url, row.content_media_type);
    const _a1MediaType = resolveMediaType(row.answer_1_media_url, row.answer_1_media_type);
    const _a2MediaType = resolveMediaType(row.answer_2_media_url, row.answer_2_media_type);
    const _a3MediaType = resolveMediaType(row.answer_3_media_url, row.answer_3_media_type);
    const _a4MediaType = resolveMediaType(row.answer_4_media_url, row.answer_4_media_type);

    // Warn if URL provided but type can't be detected
    if (row.content_media_url && !_contentMediaType) errors.push("Cannot detect content media type from URL");
    if (row.answer_1_media_url && !_a1MediaType) errors.push("Cannot detect answer 1 media type");
    if (row.answer_2_media_url && !_a2MediaType) errors.push("Cannot detect answer 2 media type");
    if (row.answer_3_media_url && !_a3MediaType) errors.push("Cannot detect answer 3 media type");
    if (row.answer_4_media_url && !_a4MediaType) errors.push("Cannot detect answer 4 media type");

    return {
      ...row,
      question_number: row.question_number || String(index + 1),
      errors,
      _contentMediaType,
      _a1MediaType,
      _a2MediaType,
      _a3MediaType,
      _a4MediaType,
    };
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<ParsedQuestion>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const validated = results.data.map((row, i) => validateRow(row, i));
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
    a.href = "/templates/practice_test_template.csv";
    a.download = "practice_test_template.csv";
    a.click();
  }

  async function handleImport() {
    if (!topicId || !title || rows.length === 0) return;
    if (rows.some((r) => r.errors.length > 0)) {
      toast.error(t("csvFixErrors"));
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/practice-tests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title,
          questions: rows.map((r) => ({
            questionNumber: parseInt(r.question_number),
            content: r.content,
            questionType: r.question_type.toUpperCase(),
            answer1: r.answer_1,
            answer2: r.answer_2 || null,
            answer3: r.answer_3 || null,
            answer4: r.answer_4 || null,
            correctAnswer: r.correct_answer,
            timer: parseInt(r.timer) || 30,
            contentMediaUrl: r.content_media_url || null,
            contentMediaType: r._contentMediaType,
            answer1MediaUrl: r.answer_1_media_url || null,
            answer1MediaType: r._a1MediaType,
            answer2MediaUrl: r.answer_2_media_url || null,
            answer2MediaType: r._a2MediaType,
            answer3MediaUrl: r.answer_3_media_url || null,
            answer3MediaType: r._a3MediaType,
            answer4MediaUrl: r.answer_4_media_url || null,
            answer4MediaType: r._a4MediaType,
            difficulty: parseInt(r.difficulty || "1") || 1,
            explanation: r.explanation || null,
          })),
        }),
      });

      if (!res.ok) {
        toast.error(t("csvImportFailed"));
        return;
      }

      toast.success(t("csvImportSuccess"));
      router.push("/teacher/practice-tests");
    } catch {
      toast.error(t("csvImportFailed"));
    } finally {
      setImporting(false);
    }
  }

  const hasErrors = rows.some((r) => r.errors.length > 0);

  // Count media in rows
  const mediaCount = rows.filter(
    (r) => r.content_media_url || r.answer_1_media_url || r.answer_2_media_url || r.answer_3_media_url || r.answer_4_media_url
  ).length;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl ambient-shadow p-6 md:p-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5">{t("csvTopic")}</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] text-sm"
            >
              <option value="">{t("csvSelectTopic")}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} ({tLang(t, topic.languageName)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5">{t("csvTestTitle")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586] text-sm"
              placeholder={t("csvTestTitlePlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5">{t("uploadCsv")}</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-[#c7c4d7]/30 rounded-xl px-5 py-4 flex items-center gap-3 cursor-pointer hover:border-[#2a14b4]/30 hover:bg-[#d9e3f6]/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]/40">upload_file</span>
              <span className="text-sm font-body text-[#777586]">
                {fileSelected ? fileInputRef.current?.files?.[0]?.name : "Choose CSV file..."}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body font-bold text-lg text-[#121c2a]">
              {t("csvPreview", { count: rows.length })}
            </h2>
            {mediaCount > 0 && (
              <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#e3dfff] text-[#2a14b4]">
                {mediaCount} {t("withMedia")}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted font-medium">#</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvContent")}</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvType")}</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Media</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvAnswers")}</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvCorrect")}</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvTimer")}</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Diff</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">{t("csvStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  // Collect media indicators
                  const mediaBadges: { type: string; label: string }[] = [];
                  if (row._contentMediaType) mediaBadges.push({ type: row._contentMediaType, label: "Q" });
                  if (row._a1MediaType) mediaBadges.push({ type: row._a1MediaType, label: "A" });
                  if (row._a2MediaType) mediaBadges.push({ type: row._a2MediaType, label: "A" });
                  if (row._a3MediaType) mediaBadges.push({ type: row._a3MediaType, label: "A" });
                  if (row._a4MediaType) mediaBadges.push({ type: row._a4MediaType, label: "A" });

                  const diff = parseInt(row.difficulty || "1") || 1;

                  return (
                    <tr
                      key={i}
                      className={`border-b border-border last:border-0 ${
                        row.errors.length > 0 ? "bg-error-light" : ""
                      }`}
                    >
                      <td className="py-2 px-2">{row.question_number}</td>
                      <td className="py-2 px-2 max-w-48 truncate">{row.content}</td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] font-body font-bold px-2 py-0.5 rounded-full bg-[#e3dfff] text-[#2a14b4]">
                          {row.question_type}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {mediaBadges.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {mediaBadges.map((b, j) => (
                              <span key={j} className={`material-symbols-outlined text-[14px] ${mediaColor(b.type)}`} title={`${b.label}: ${b.type}`}>
                                {mediaIcon(b.type)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#c7c4d7] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs max-w-40 truncate">
                        {[row.answer_1, row.answer_2, row.answer_3, row.answer_4]
                          .filter(Boolean)
                          .join(" | ")}
                      </td>
                      <td className="py-2 px-2 font-medium text-[#1b6b51]">{row.correct_answer}</td>
                      <td className="py-2 px-2">{row.timer || 30}s</td>
                      <td className="py-2 px-2">
                        <span className="flex items-center gap-px">
                          {[1, 2, 3].map((s) => (
                            <span
                              key={s}
                              className={`material-symbols-outlined text-[10px] ${s <= diff ? "text-[#f59e0b]" : "text-[#d9e3f6]"}`}
                              style={{ fontVariationSettings: s <= diff ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              star
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {row.errors.length > 0 ? (
                          <span className="text-error text-xs">{row.errors.join(", ")}</span>
                        ) : (
                          <span className="text-success text-xs">{t("csvValid")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
            disabled={importing || !topicId || !title || hasErrors || rows.length === 0}
            className="inline-flex items-center gap-2 bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[18px] ${importing ? "animate-spin" : ""}`}>{importing ? "progress_activity" : "upload"}</span>
            {t("import")}
          </button>
        </div>
      )}
    </div>
  );
}
