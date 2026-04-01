"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";

type UploadedFile = {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

type FileEntry = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: UploadedFile;
};

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

const ALLOWED_TYPES = ["image/png", "image/jpeg", "audio/mpeg", "video/mp4"];
const MAX_FILES = 5;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio_file";
  if (type.startsWith("video/")) return "video_file";
  return "description";
}

export default function MediaUploadModal({ onClose, onComplete }: Props) {
  const t = useTranslations("teacher");
  const ct = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, uploading]);

  const totalSize = entries.reduce((sum, e) => sum + e.file.size, 0);
  const hasInvalidType = entries.some((e) => !ALLOWED_TYPES.includes(e.file.type));
  const hasOversizedFile = entries.some((e) => e.file.size > MAX_FILE_SIZE);
  const tooManyFiles = entries.length > MAX_FILES;
  const totalTooLarge = totalSize > MAX_TOTAL_SIZE;
  const hasValidation = hasInvalidType || hasOversizedFile || tooManyFiles || totalTooLarge;
  const canUpload = entries.length > 0 && !hasValidation && !uploading;

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files).map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  async function handleUpload() {
    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!ALLOWED_TYPES.includes(entry.file.type)) continue;

      setEntries((prev) =>
        prev.map((e, idx) => idx === i ? { ...e, status: "uploading" } : e)
      );

      try {
        const blob = await upload(entry.file.name, entry.file, {
          access: "public",
          handleUploadUrl: "/api/teacher/media/upload",
          onUploadProgress: ({ percentage }) => {
            setEntries((prev) =>
              prev.map((e, idx) => idx === i ? { ...e, progress: percentage } : e)
            );
          },
        });

        const result: UploadedFile = {
          fileName: entry.file.name,
          fileUrl: blob.url,
          fileType: entry.file.type,
          fileSize: entry.file.size,
        };

        uploaded.push(result);
        setEntries((prev) =>
          prev.map((e, idx) => idx === i ? { ...e, status: "done", progress: 100, result } : e)
        );
      } catch (err) {
        const errMsg = (err as Error).message || "Upload failed";
        const isConfigError = errMsg.includes("client token") || errMsg.includes("not configured");
        const displayError = isConfigError
          ? t("storageNotConfigured")
          : errMsg;

        setEntries((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", error: displayError } : e
          )
        );

        if (isConfigError) {
          toast.error(t("storageNotConfigured"));
          break;
        }
      }
    }

    if (uploaded.length > 0) {
      try {
        await fetch("/api/teacher/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uploaded }),
        });
        toast.success(t("uploadComplete"));
      } catch {
        toast.error(t("uploadComplete"));
      }
    }

    setUploading(false);

    const hasErrors = entries.some((e) => e.status === "error");
    if (!hasErrors && uploaded.length > 0) {
      setTimeout(() => {
        onComplete();
        onClose();
      }, 800);
    }
  }

  const doneCount = entries.filter((e) => e.status === "done").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[10vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div className="bg-[#f8f9ff] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
        {/* Close button - sticky top right */}
        {!uploading && (
          <div className="sticky top-0 z-10 flex justify-end p-4 pb-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        <div className="px-6 md:px-8 pb-6 md:pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#e3dfff] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-[#2a14b4]">cloud_upload</span>
            </div>
            <h2 className="font-body font-bold text-xl text-[#121c2a]">
              {t("uploadMedia")}
            </h2>
          </div>

          {/* Drop zone */}
          {!uploading && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-5 ${
                dragOver
                  ? "border-[#2a14b4] bg-[#e3dfff]/30"
                  : "border-[#c7c4d7]/40 bg-[#d9e3f6]/15 hover:border-[#2a14b4]/40 hover:bg-[#d9e3f6]/30"
              }`}
            >
              <span className="material-symbols-outlined text-4xl text-[#2a14b4]/40 mb-3 block">
                cloud_upload
              </span>
              <p className="text-sm font-body font-medium text-[#121c2a]">
                {t("dropFiles")}
              </p>
              <p className="text-xs font-body text-[#777586] mt-1">
                {t("dropFilesHint")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.mp3,.mp4"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Validation errors */}
          {hasValidation && !uploading && (
            <div className="text-xs font-body text-[#7b0020] space-y-1 mb-4 bg-[#ffdada]/20 rounded-lg p-3">
              {tooManyFiles && <p>Maximum {MAX_FILES} files allowed.</p>}
              {totalTooLarge && <p>Total size exceeds {formatSize(MAX_TOTAL_SIZE)}.</p>}
              {hasOversizedFile && <p>Individual files must be under {formatSize(MAX_FILE_SIZE)}.</p>}
              {hasInvalidType && <p>Only PNG, JPG, MP3, and MP4 files are allowed.</p>}
            </div>
          )}

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-2 mb-5">
              {uploading && (
                <p className="text-xs font-body text-[#777586] mb-1">
                  {t("uploading")} {doneCount} / {entries.length}...
                </p>
              )}
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-[#c7c4d7]/15"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    entry.status === "done" ? "bg-[#a6f2d1]/40" :
                    entry.status === "error" ? "bg-[#ffdada]/40" :
                    "bg-[#e3dfff]"
                  }`}>
                    <span className={`material-symbols-outlined text-[18px] ${
                      entry.status === "done" ? "text-[#1b6b51]" :
                      entry.status === "error" ? "text-[#7b0020]" :
                      "text-[#2a14b4]"
                    }`}>
                      {entry.status === "done" ? "check_circle" :
                       entry.status === "error" ? "error" :
                       getFileIcon(entry.file.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-[#121c2a] truncate">{entry.file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body text-[#777586]">{formatSize(entry.file.size)}</span>
                      {entry.status === "error" && (
                        <span className="text-xs font-body text-[#7b0020]">{entry.error}</span>
                      )}
                      {!ALLOWED_TYPES.includes(entry.file.type) && entry.status === "pending" && (
                        <span className="text-xs font-body text-[#7b0020]">Unsupported type</span>
                      )}
                      {entry.file.size > MAX_FILE_SIZE && entry.status === "pending" && (
                        <span className="text-xs font-body text-[#7b0020]">Too large</span>
                      )}
                    </div>
                    {entry.status === "uploading" && (
                      <div className="h-1.5 w-full bg-[#d9e3f6] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-[#2a14b4] rounded-full transition-all duration-300"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {entry.status === "pending" && !uploading && (
                    <button
                      onClick={() => removeEntry(index)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#777586] hover:text-[#7b0020] hover:bg-[#ffdada]/30 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                  {entry.status === "uploading" && (
                    <span className="text-xs font-body font-bold text-[#2a14b4] shrink-0 w-10 text-right">
                      {Math.round(entry.progress)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer actions */}
          {entries.length > 0 && !uploading && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs font-body text-[#777586]">
                {entries.length} file(s) &middot; {formatSize(totalSize)}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors"
                >
                  {ct("cancel")}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="bg-[#2a14b4] hover:bg-[#4338ca] text-white px-6 py-2.5 rounded-full text-sm font-body font-bold shadow-lg shadow-[#2a14b4]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  {t("uploadMedia")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
