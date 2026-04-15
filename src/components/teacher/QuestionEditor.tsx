"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import MediaPicker from "@/components/teacher/MediaPicker";

type MediaVal = { url: string; type: string } | null;

type Question = {
  id: string;
  questionNumber: number;
  content: string;
  questionType: string;
  answer1: string;
  answer2: string | null;
  answer3: string | null;
  answer4: string | null;
  correctAnswer: string;
  timer: number;
  contentMediaUrl?: string | null;
  contentMediaType?: string | null;
  answer1MediaUrl?: string | null;
  answer1MediaType?: string | null;
  answer2MediaUrl?: string | null;
  answer2MediaType?: string | null;
  answer3MediaUrl?: string | null;
  answer3MediaType?: string | null;
  answer4MediaUrl?: string | null;
  answer4MediaType?: string | null;
  difficulty?: number;
  explanation?: string | null;
  explanationMediaUrl?: string | null;
  explanationMediaType?: string | null;
  audioPlayLimit?: number | null;
  advancedData?: string | null;
  sectionId?: string | null;
  parentQuestionId?: string | null;
};

function toMediaVal(url?: string | null, type?: string | null): MediaVal {
  return url && type ? { url, type } : null;
}

export default function QuestionEditor({ question, onSave }: { question: Question; onSave?: (updated: Question) => void }) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Media state
  const [contentMedia, setContentMedia] = useState<MediaVal>(toMediaVal(question.contentMediaUrl, question.contentMediaType));
  const [a1Media, setA1Media] = useState<MediaVal>(toMediaVal(question.answer1MediaUrl, question.answer1MediaType));
  const [a2Media, setA2Media] = useState<MediaVal>(toMediaVal(question.answer2MediaUrl, question.answer2MediaType));
  const [a3Media, setA3Media] = useState<MediaVal>(toMediaVal(question.answer3MediaUrl, question.answer3MediaType));
  const [a4Media, setA4Media] = useState<MediaVal>(toMediaVal(question.answer4MediaUrl, question.answer4MediaType));
  const [explMedia, setExplMedia] = useState<MediaVal>(toMediaVal(question.explanationMediaUrl, question.explanationMediaType));
  const [difficulty, setDifficulty] = useState(question.difficulty ?? 1);
  const [audioPlayLimit, setAudioPlayLimit] = useState<string>(question.audioPlayLimit != null ? String(question.audioPlayLimit) : "");
  const [advancedData, setAdvancedData] = useState<string>(question.advancedData || "");

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-[#d9e3f6]/30 border-0 focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 font-body text-[#121c2a] placeholder:text-[#777586] text-sm";
  const labelClass =
    "block text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] mb-1.5";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teacher/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          content: fd.get("content"),
          answer1: fd.get("answer1"),
          answer2: fd.get("answer2") || null,
          answer3: fd.get("answer3") || null,
          answer4: fd.get("answer4") || null,
          correctAnswer: fd.get("correctAnswer"),
          timer: parseInt(fd.get("timer") as string) || 30,
          contentMediaUrl: contentMedia?.url ?? null,
          contentMediaType: contentMedia?.type ?? null,
          answer1MediaUrl: a1Media?.url ?? null,
          answer1MediaType: a1Media?.type ?? null,
          answer2MediaUrl: a2Media?.url ?? null,
          answer2MediaType: a2Media?.type ?? null,
          answer3MediaUrl: a3Media?.url ?? null,
          answer3MediaType: a3Media?.type ?? null,
          answer4MediaUrl: a4Media?.url ?? null,
          answer4MediaType: a4Media?.type ?? null,
          difficulty,
          explanation: fd.get("explanation") || null,
          explanationMediaUrl: explMedia?.url ?? null,
          explanationMediaType: explMedia?.type ?? null,
          audioPlayLimit: audioPlayLimit ? parseInt(audioPlayLimit) : null,
          advancedData: advancedData || null,
        }),
      });

      if (!res.ok) {
        toast.error(t("questionSaveFailed"));
        return;
      }

      toast.success(t("questionSaved"));
      setEditing(false);
      // Pass updated data to parent — no API refetch needed
      onSave?.({
        ...question,
        content: fd.get("content") as string,
        answer1: fd.get("answer1") as string,
        answer2: (fd.get("answer2") as string) || null,
        answer3: (fd.get("answer3") as string) || null,
        answer4: (fd.get("answer4") as string) || null,
        correctAnswer: fd.get("correctAnswer") as string,
        timer: parseInt(fd.get("timer") as string) || 30,
        contentMediaUrl: contentMedia?.url ?? null,
        contentMediaType: contentMedia?.type ?? null,
        answer1MediaUrl: a1Media?.url ?? null,
        answer1MediaType: a1Media?.type ?? null,
        answer2MediaUrl: a2Media?.url ?? null,
        answer2MediaType: a2Media?.type ?? null,
        answer3MediaUrl: a3Media?.url ?? null,
        answer3MediaType: a3Media?.type ?? null,
        answer4MediaUrl: a4Media?.url ?? null,
        answer4MediaType: a4Media?.type ?? null,
        difficulty,
        explanation: (fd.get("explanation") as string) || null,
        explanationMediaUrl: explMedia?.url ?? null,
        explanationMediaType: explMedia?.type ?? null,
        audioPlayLimit: audioPlayLimit ? parseInt(audioPlayLimit) : null,
        advancedData: advancedData || null,
      });
    } catch {
      toast.error(t("questionSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // ── Edit Form ──
  if (editing) {
    const answerMediaSetters = [setA1Media, setA2Media, setA3Media, setA4Media];
    const answerMediaVals = [a1Media, a2Media, a3Media, a4Media];
    const answerKeys = ["answer1", "answer2", "answer3", "answer4"] as const;
    const answerLabels = [t("answer1"), t("answer2"), t("answer3"), t("answer4")];
    const answerDefaults = [question.answer1, question.answer2, question.answer3, question.answer4];

    return (
      <form onSubmit={handleSave} className="bg-[#f8f9ff] rounded-2xl border border-[#2a14b4]/10 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
            {question.questionNumber}
          </span>
          <span className="text-xs font-body font-bold px-3 py-1 rounded-full bg-[#e3dfff] text-[#2a14b4]">
            {question.questionType}
          </span>
        </div>

        {/* Question content */}
        <div>
          <label className={labelClass}>{t("questionContent")}</label>
          <input name="content" defaultValue={question.content} required className={inputClass} />
        </div>

        {/* Content media */}
        <div>
          <label className={labelClass}>{t("contentMedia")}</label>
          <MediaPicker value={contentMedia} onChange={setContentMedia} />
        </div>

        {/* Difficulty */}
        <div>
          <label className={labelClass}>{t("difficultyLabel")}</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className="no-ripple"
              >
                <span
                  className={`material-symbols-outlined text-[22px] transition-colors ${
                    level <= difficulty ? "text-[#f59e0b]" : "text-[#c7c4d7]"
                  }`}
                  style={{ fontVariationSettings: level <= difficulty ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              </button>
            ))}
            <span className="text-[10px] font-body text-[#777586] ml-2">
              {difficulty === 1 ? t("difficultyEasy") : difficulty === 2 ? t("difficultyMedium") : t("difficultyHard")}
            </span>
          </div>
        </div>

        {/* Answers with media */}
        <div className="space-y-3">
          <label className={labelClass}>{t("answersLabel")}</label>
          {answerKeys.map((key, i) => {
            const isRequired = i === 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-body font-bold text-[#c7c4d7] w-5 text-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  name={key}
                  defaultValue={answerDefaults[i] || ""}
                  required={isRequired}
                  placeholder={answerLabels[i]}
                  className={`${inputClass} flex-1`}
                />
                <MediaPicker
                  value={answerMediaVals[i]}
                  onChange={answerMediaSetters[i]}
                  acceptTypes={["image", "audio"]}
                  compact
                />
              </div>
            );
          })}
        </div>

        {/* Correct answer + Timer */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>{t("correctAnswerLabel")}</label>
            <input name="correctAnswer" defaultValue={question.correctAnswer} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("timerLabel")}</label>
            <input name="timer" type="number" defaultValue={question.timer} min={5} max={300} className={`${inputClass} w-full`} />
          </div>
          <div>
            <label className={labelClass}>{t("audioPlayLimitLabel")}</label>
            <select
              value={audioPlayLimit}
              onChange={(e) => setAudioPlayLimit(e.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">{t("audioUnlimited")}</option>
              <option value="1">{t("audioPlays", { count: 1 })}</option>
              <option value="2">{t("audioPlays", { count: 2 })}</option>
              <option value="3">{t("audioPlays", { count: 3 })}</option>
            </select>
          </div>
        </div>

        {/* Advanced Data (type-specific) */}
        {["REORDER_WORDS", "CUE_WRITING", "PRONUNCIATION", "STRESS", "CLOZE_PASSAGE", "TRUE_FALSE", "MATCHING", "WORD_BANK"].includes(question.questionType) && (
          <div>
            <label className={labelClass}>
              Advanced Data (JSON)
              <span className="font-normal ml-2 normal-case tracking-normal text-[#777586]">
                {question.questionType === "REORDER_WORDS" && '{"fragments":["word1","word2"],"correctOrder":[0,1]}'}
                {question.questionType === "CUE_WRITING" && '{"cues":["word1","word2"],"hint":"..."}'}
                {question.questionType === "PRONUNCIATION" && '{"underlinedParts":["a","u","a","a"]}'}
                {question.questionType === "STRESS" && '{"stressPositions":[2,1,3,2]}'}
                {question.questionType === "CLOZE_PASSAGE" && '{"passage":"Text with {1} blanks"}'}
                {question.questionType === "TRUE_FALSE" && 'Use answer1="True", answer2="False"'}
                {question.questionType === "MATCHING" && '{"columnA":[...],"columnB":[...],"correctPairs":[[0,1]]}'}
                {question.questionType === "WORD_BANK" && '{"wordBank":["word1","word2"],"sentences":[{"text":"Fill ___","answer":"word1"}]}'}
              </span>
            </label>
            <textarea
              value={advancedData}
              onChange={(e) => setAdvancedData(e.target.value)}
              rows={4}
              placeholder='{"fragments": [...], "correctOrder": [...]}'
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </div>
        )}

        {/* Explanation */}
        <div>
          <label className={labelClass}>{t("explanationLabel")}</label>
          <textarea
            name="explanation"
            defaultValue={question.explanation || ""}
            rows={2}
            placeholder={t("explanationPlaceholder")}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className={labelClass}>{t("explanationMedia")}</label>
          <MediaPicker value={explMedia} onChange={setExplMedia} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-5 py-2 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
          >
            {ct("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2 rounded-full font-body font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[#2a14b4]/20 inline-flex items-center gap-2"
          >
            <span className={`material-symbols-outlined text-[16px] ${saving ? "animate-spin" : ""}`}>{saving ? "progress_activity" : "save"}</span>
            {ct("save")}
          </button>
        </div>
      </form>
    );
  }

  // ── Preview (collapsed) ──
  const mediaBadges: { icon: string; color: string }[] = [];
  if (question.contentMediaType) {
    mediaBadges.push({
      icon: question.contentMediaType === "image" ? "image" : question.contentMediaType === "audio" ? "headphones" : "play_circle",
      color: question.contentMediaType === "image" ? "text-[#2a14b4]" : question.contentMediaType === "audio" ? "text-[#1b6b51]" : "text-[#7b0020]",
    });
  }
  const hasAnswerMedia = [question.answer1MediaType, question.answer2MediaType, question.answer3MediaType, question.answer4MediaType].some(Boolean);
  if (hasAnswerMedia) {
    mediaBadges.push({ icon: "grid_view", color: "text-[#2a14b4]" });
  }

  const diffStars = question.difficulty ?? 1;

  return (
    <div
      className="group flex items-start justify-between py-3 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="w-7 h-7 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-body font-bold text-[#2a14b4]">
            {question.questionNumber}
          </span>
          <span className="text-[10px] font-body font-bold px-2.5 py-0.5 rounded-full bg-[#e3dfff] text-[#2a14b4]">
            {question.questionType}
          </span>
          {/* Difficulty stars */}
          <span className="flex items-center gap-px ml-1">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`material-symbols-outlined text-[12px] ${s <= diffStars ? "text-[#f59e0b]" : "text-[#d9e3f6]"}`}
                style={{ fontVariationSettings: s <= diffStars ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            ))}
          </span>
          {/* Media badges */}
          {mediaBadges.map((b, i) => (
            <span key={i} className={`material-symbols-outlined text-[14px] ${b.color}`}>{b.icon}</span>
          ))}
          <span className="text-xs text-[#777586] font-body">{question.timer}s</span>
        </div>
        <p className="text-sm font-body font-medium text-[#121c2a] mb-1">{question.content}</p>
        <p className="text-xs text-[#777586] font-body">
          {[question.answer1, question.answer2, question.answer3, question.answer4]
            .filter(Boolean)
            .join(" | ")}{" "}
          <span className="text-[#777586]">&rarr;</span>{" "}
          <span className="text-[#1b6b51] font-medium">{question.correctAnswer}</span>
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#c7c4d7] hover:text-[#2a14b4] hover:bg-[#e3dfff] transition-colors shrink-0 ml-3"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    </div>
  );
}
