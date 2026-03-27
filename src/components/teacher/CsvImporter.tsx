"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";

type Topic = { id: string; title: string; languageName: string };

type ParsedQuestion = {
  question_number: string;
  content: string;
  question_type: string;
  answer_1: string;
  answer_2: string;
  answer_3: string;
  answer_4: string;
  correct_answer: string;
  timer: string;
};

type ValidatedRow = ParsedQuestion & { errors: string[] };

type Props = { topics: Topic[] };

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

    if (!row.content) errors.push("Content is required");
    if (!["YES_NO", "MULTIPLE_CHOICE", "GAP_FILL"].includes(type)) {
      errors.push("Invalid question_type");
    }
    if (!row.answer_1) errors.push("answer_1 is required");
    if (type === "YES_NO" && !row.answer_2) errors.push("answer_2 required for YES_NO");
    if (type === "MULTIPLE_CHOICE") {
      if (!row.answer_2 || !row.answer_3 || !row.answer_4) {
        errors.push("All 4 answers required for MULTIPLE_CHOICE");
      }
    }
    if (!row.correct_answer) errors.push("correct_answer is required");

    return { ...row, question_number: row.question_number || String(index + 1), errors };
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
        toast.error("Failed to parse CSV file");
      },
    });
  }

  function downloadTemplate() {
    const template = `question_number,content,question_type,answer_1,answer_2,answer_3,answer_4,correct_answer,timer
1,Is the sky blue?,YES_NO,Yes,No,,,Yes,30
2,What color is grass?,MULTIPLE_CHOICE,Red,Blue,Green,Yellow,Green,30
3,The sun rises in the ___,GAP_FILL,east,,,,east,30`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "practice_test_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!topicId || !title || rows.length === 0) return;
    if (rows.some((r) => r.errors.length > 0)) {
      toast.error("Fix validation errors before importing");
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
          })),
        }),
      });

      if (!res.ok) {
        toast.error("Failed to import test");
        return;
      }

      toast.success("Practice test imported successfully!");
      router.push("/teacher/practice-tests");
    } catch {
      toast.error("Failed to import test");
    } finally {
      setImporting(false);
    }
  }

  const hasErrors = rows.some((r) => r.errors.length > 0);

  return (
    <div className="space-y-6">
      {/* Download template */}
      <div className="bg-card rounded-xl border border-border p-6">
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          {t("downloadTemplate")}
        </button>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select topic...</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} ({topic.languageName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Test Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Park Vocabulary Test 1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("uploadCsv")}</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-light file:text-primary file:font-medium file:cursor-pointer"
          />
        </div>
      </div>

      {/* Preview table */}
      {fileSelected && rows.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">
            Preview ({rows.length} questions)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted font-medium">#</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Content</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Type</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Answers</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Correct</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Timer</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-0 ${
                      row.errors.length > 0 ? "bg-error-light" : ""
                    }`}
                  >
                    <td className="py-2 px-2">{row.question_number}</td>
                    <td className="py-2 px-2 max-w-48 truncate">{row.content}</td>
                    <td className="py-2 px-2">{row.question_type}</td>
                    <td className="py-2 px-2 text-xs">
                      {[row.answer_1, row.answer_2, row.answer_3, row.answer_4]
                        .filter(Boolean)
                        .join(" | ")}
                    </td>
                    <td className="py-2 px-2 font-medium">{row.correct_answer}</td>
                    <td className="py-2 px-2">{row.timer || 30}s</td>
                    <td className="py-2 px-2">
                      {row.errors.length > 0 ? (
                        <span className="text-error text-xs">{row.errors.join(", ")}</span>
                      ) : (
                        <span className="text-success text-xs">Valid</span>
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
            disabled={importing || !topicId || !title || hasErrors || rows.length === 0}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {t("import")}
          </button>
        </div>
      )}
    </div>
  );
}
