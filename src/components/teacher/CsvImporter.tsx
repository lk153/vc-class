"use client";

import { useState, useRef, useEffect } from "react";
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
  advanced_data?: string;
  // Exam mode section columns
  part?: string;
  group?: string;
  exercise?: string;
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

function TopicDropdown({
  topics,
  value,
  onChange,
  placeholder,
  label,
  t,
}: {
  topics: Topic[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  t: { (key: string): string; has: (key: string) => boolean };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = topics.find((tp) => tp.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div>
      <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-body font-semibold transition-colors ${
            open
              ? "border-[#2a14b4] ring-2 ring-[#2a14b4]/20 bg-white"
              : "border-[#c7c4d7]/30 bg-[#d9e3f6]/30 hover:border-[#c7c4d7]/60"
          } ${value ? "text-[#121c2a]" : "text-[#777586]"}`}
        >
          <span className="truncate">
            {selected ? `${selected.title} (${tLang(t, selected.languageName)})` : placeholder}
          </span>
          <span
            className="material-symbols-outlined text-[16px] text-[#777586] transition-transform shrink-0"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            expand_more
          </span>
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)] border border-[#c7c4d7]/15 py-1.5 z-50 max-h-[240px] overflow-y-auto">
            {/* Select topic placeholder */}
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-body transition-colors ${
                !value ? "bg-[#f5f3ff] text-[#2a14b4] font-medium" : "text-[#777586] hover:bg-[#f8f9ff]"
              }`}
            >
              <span>{placeholder}</span>
              {!value && <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">check</span>}
            </button>
            {topics.map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => { onChange(tp.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-body transition-colors ${
                  value === tp.id
                    ? "bg-[#f5f3ff] text-[#2a14b4] font-medium"
                    : "text-[#464554] hover:bg-[#f8f9ff]"
                }`}
              >
                <span className="truncate">{tp.title} ({tLang(t, tp.languageName)})</span>
                {value === tp.id && <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CsvImporter({ topics }: Props) {
  const t = useTranslations("teacher");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [testType, setTestType] = useState<"classic" | "exam">("classic");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ step: string; current: number; total: number } | null>(null);
  const [fileSelected, setFileSelected] = useState(false);

  function validateRow(row: ParsedQuestion, index: number): ValidatedRow {
    const errors: string[] = [];
    const type = row.question_type?.toUpperCase();

    const VALID_TYPES = ["MULTIPLE_CHOICE", "GAP_FILL", "REORDER_WORDS", "CUE_WRITING", "PRONUNCIATION", "STRESS", "CLOZE_PASSAGE", "TRUE_FALSE", "MATCHING", "WORD_BANK"];

    if (!row.content) errors.push(t("csvContentRequired"));
    if (!VALID_TYPES.includes(type)) {
      errors.push(t("csvInvalidType"));
    }

    // Answer validation depends on type
    const needsAnswers = ["MULTIPLE_CHOICE", "PRONUNCIATION", "STRESS", "TRUE_FALSE"];
    if (needsAnswers.includes(type)) {
      if (!row.answer_1) errors.push(t("csvAnswer1Required"));
      if (["MULTIPLE_CHOICE", "PRONUNCIATION", "STRESS"].includes(type)) {
        if (!row.answer_2 || !row.answer_3 || !row.answer_4) {
          errors.push(t("csvAllAnswersRequired"));
        }
      }
    }

    // correct_answer validation (not required for MATCHING which uses advanced_data)
    const needsCorrectAnswer = !["MATCHING", "WORD_BANK"].includes(type);
    if (needsCorrectAnswer && !row.correct_answer) {
      errors.push(t("csvCorrectRequired"));
    } else if (row.correct_answer && needsAnswers.includes(type)) {
      const answers = [row.answer_1, row.answer_2, row.answer_3, row.answer_4].filter(Boolean);
      if (answers.length > 0 && !answers.includes(row.correct_answer)) {
        errors.push("correct_answer must match an answer option");
      }
    }

    // advanced_data JSON validation
    if (row.advanced_data) {
      try { JSON.parse(row.advanced_data); } catch { errors.push("advanced_data is not valid JSON"); }
    }
    const needsAdvanced = ["REORDER_WORDS", "CUE_WRITING", "PRONUNCIATION", "STRESS", "MATCHING", "WORD_BANK"];
    if (needsAdvanced.includes(type) && !row.advanced_data) {
      errors.push("advanced_data required for " + type);
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
    const file = testType === "exam" ? "exam_test_template.csv" : "practice_test_template.csv";
    a.href = `/templates/${file}`;
    a.download = file;
    a.click();
  }

  function buildQuestionPayload(r: ValidatedRow) {
    return {
      questionNumber: parseInt(r.question_number),
      content: r.content,
      questionType: r.question_type.toUpperCase(),
      answer1: r.answer_1,
      answer2: r.answer_2 || null,
      answer3: r.answer_3 || null,
      answer4: r.answer_4 || null,
      correctAnswer: r.correct_answer || "",
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
      advancedData: r.advanced_data || null,
    };
  }

  async function handleImport() {
    if (!topicId || !title || rows.length === 0) return;
    if (rows.some((r) => r.errors.length > 0)) {
      toast.error(t("csvFixErrors"));
      return;
    }

    setImporting(true);
    setImportProgress({ step: "Creating test...", current: 0, total: rows.length });
    try {
      // Step 1: Create the practice test + questions
      setImportProgress({ step: "Importing questions...", current: 0, total: rows.length });
      const res = await fetch("/api/practice-tests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title,
          status: "draft",
          questions: rows.map((r) => buildQuestionPayload(r)),
        }),
      });

      if (!res.ok) {
        toast.error(t("csvImportFailed"));
        return;
      }

      const createdTest = await res.json();
      setImportProgress({ step: "Questions imported", current: rows.length, total: rows.length });

      // Step 2: For exam mode, create sections and assign questions
      if (testType === "exam") {
        const sectionMap = new Map<string, string>();
        const sectionRows = rows.filter((r) => r.part);
        let assigned = 0;

        setImportProgress({ step: "Building test structure...", current: 0, total: sectionRows.length });

        for (const row of sectionRows) {
          const partKey = row.part!;
          if (!sectionMap.has(partKey)) {
            const partRes = await fetch("/api/teacher/test-sections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ testId: createdTest.id, parentId: null, level: "PART", title: row.part, sortOrder: sectionMap.size }),
            });
            if (partRes.ok) sectionMap.set(partKey, (await partRes.json()).id);
          }

          if (row.group) {
            const groupKey = `${row.part}|${row.group}`;
            if (!sectionMap.has(groupKey)) {
              const groupRes = await fetch("/api/teacher/test-sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testId: createdTest.id, parentId: sectionMap.get(partKey), level: "GROUP", title: row.group, sortOrder: sectionMap.size }),
              });
              if (groupRes.ok) sectionMap.set(groupKey, (await groupRes.json()).id);
            }

            if (row.exercise) {
              const exerciseKey = `${row.part}|${row.group}|${row.exercise}`;
              if (!sectionMap.has(exerciseKey)) {
                const exRes = await fetch("/api/teacher/test-sections", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ testId: createdTest.id, parentId: sectionMap.get(`${row.part}|${row.group}`), level: "EXERCISE", title: row.exercise, description: row.exercise, sortOrder: sectionMap.size }),
                });
                if (exRes.ok) sectionMap.set(exerciseKey, (await exRes.json()).id);
              }

              const sectionId = sectionMap.get(exerciseKey);
              const questionNumber = parseInt(row.question_number);
              const question = createdTest.questions?.find((q: { questionNumber: number }) => q.questionNumber === questionNumber);
              if (question && sectionId) {
                await fetch("/api/teacher/questions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: question.id, content: question.content, answer1: question.answer1, correctAnswer: question.correctAnswer, sectionId }),
                });
              }
            }
          }

          assigned++;
          setImportProgress({ step: "Assigning sections...", current: assigned, total: sectionRows.length });
        }
      }

      setImportProgress({ step: "Complete!", current: rows.length, total: rows.length });
      toast.success(t("csvImportSuccess"));
      setTimeout(() => router.push("/teacher/practice-tests"), 800);
    } catch {
      toast.error(t("csvImportFailed"));
    } finally {
      setImporting(false);
      setImportProgress(null);
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
        {/* Test Type Selector */}
        <div>
          <label className="block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-2">{t("testTypeLabel")}</label>
          <div className="flex rounded-full bg-[#f0eef6] p-1 w-fit">
            <button
              type="button"
              onClick={() => { setTestType("classic"); setRows([]); setFileSelected(false); }}
              className={`px-5 py-2 rounded-full text-sm font-body font-bold transition-colors flex items-center gap-2 ${
                testType === "classic" ? "bg-[#2a14b4] text-white shadow-sm" : "text-[#777586] hover:text-[#2a14b4] hover:bg-white/50"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">quiz</span>
              {t("practiceTestType")}
            </button>
            <button
              type="button"
              onClick={() => { setTestType("exam"); setRows([]); setFileSelected(false); }}
              className={`px-5 py-2 rounded-full text-sm font-body font-bold transition-colors flex items-center gap-2 ${
                testType === "exam" ? "bg-[#2a14b4] text-white shadow-sm" : "text-[#777586] hover:text-[#2a14b4] hover:bg-white/50"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              {t("testExamType")}
            </button>
          </div>
          <p className="text-xs font-body text-[#777586] mt-2">
            {testType === "classic" ? t("practiceTestDesc") : t("testExamDesc")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TopicDropdown
            topics={topics}
            value={topicId}
            onChange={setTopicId}
            placeholder={t("csvSelectTopic")}
            label={t("csvTopic")}
            t={t}
          />
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
                  {testType === "exam" && (
                    <>
                      <th className="text-left py-2 px-2 text-muted font-medium">Part</th>
                      <th className="text-left py-2 px-2 text-muted font-medium">Group</th>
                      <th className="text-left py-2 px-2 text-muted font-medium">Exercise</th>
                    </>
                  )}
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
                      {testType === "exam" && (
                        <>
                          <td className="py-2 px-2">
                            {row.part ? (
                              <span className="text-[10px] font-body font-bold text-[#2a14b4] truncate max-w-[100px] block" title={row.part}>
                                {row.part.replace(/^Part\s+\w+:\s*/, "").slice(0, 15) || row.part.slice(0, 15)}
                              </span>
                            ) : <span className="text-[#c7c4d7] text-xs">—</span>}
                          </td>
                          <td className="py-2 px-2">
                            {row.group ? (
                              <span className="text-[10px] font-body font-medium text-[#1b6b51] truncate max-w-[100px] block" title={row.group}>
                                {row.group.slice(0, 15)}
                              </span>
                            ) : <span className="text-[#c7c4d7] text-xs">—</span>}
                          </td>
                          <td className="py-2 px-2">
                            {row.exercise ? (
                              <span className="text-[9px] font-body text-[#777586] truncate max-w-[120px] block" title={row.exercise}>
                                {row.exercise.replace(/^Exercise\s+\d+:\s*/, "").slice(0, 20)}
                              </span>
                            ) : <span className="text-[#c7c4d7] text-xs">—</span>}
                          </td>
                        </>
                      )}
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

      {/* Import button + progress */}
      {fileSelected && (
        <div className="space-y-4">
          {/* Progress bar */}
          {importProgress && importing && (
            <div className="bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                    <span className={`material-symbols-outlined text-[18px] text-[#2a14b4] ${importProgress.current < importProgress.total ? "animate-spin" : ""}`}>
                      {importProgress.current >= importProgress.total ? "check_circle" : "progress_activity"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-body font-bold text-[#121c2a]">{importProgress.step}</p>
                    <p className="text-xs font-body text-[#777586]">
                      {importProgress.current} / {importProgress.total}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-body font-bold text-[#2a14b4]">
                  {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#f0eef6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2a14b4] to-[#4338ca] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Button */}
          {!importing && (
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={!topicId || !title || hasErrors || rows.length === 0}
                className="inline-flex items-center gap-2 bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                {t("import")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
