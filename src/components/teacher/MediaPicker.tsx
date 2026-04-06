"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import ModalOverlay from "@/components/ModalOverlay";
import MediaUploadModal from "@/components/teacher/MediaUploadModal";

type MediaValue = { url: string; type: string } | null;

type MediaItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

type Props = {
  value: MediaValue;
  onChange: (media: MediaValue) => void;
  acceptTypes?: ("image" | "audio" | "video")[];
  /** Compact mode for answer rows — shows small inline button */
  compact?: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaIcon(type: string): string {
  if (type.startsWith("image")) return "image";
  if (type.startsWith("audio")) return "audio_file";
  if (type.startsWith("video")) return "video_file";
  return "attach_file";
}

function mimeToType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "image";
}

export default function MediaPicker({ value, onChange, acceptTypes, compact }: Props) {
  const t = useTranslations("teacher");
  const [open, setOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Library state
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    // Apply type filter from acceptTypes or manual filter
    const filterType = typeFilter || (acceptTypes?.length === 1 ? `${acceptTypes[0]}/` : "");
    if (filterType) params.set("type", filterType);

    try {
      const res = await fetch(`/api/teacher/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.results);
        setTotalPages(data.totalPages);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, acceptTypes]);

  useEffect(() => {
    if (open) fetchMedia();
  }, [open, fetchMedia]);

  useEffect(() => { setPage(1); }, [search, typeFilter]);

  function handleSelect(item: MediaItem) {
    onChange({ url: item.fileUrl, type: mimeToType(item.fileType) });
    setOpen(false);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  function handleUploadComplete() {
    setShowUpload(false);
    fetchMedia();
  }

  // Filter options based on acceptTypes
  const typeOptions = [
    { value: "", label: t("allTypes"), icon: "perm_media" },
    ...(!acceptTypes || acceptTypes.includes("image") ? [{ value: "image/", label: t("images"), icon: "image" }] : []),
    ...(!acceptTypes || acceptTypes.includes("audio") ? [{ value: "audio/", label: t("audio"), icon: "audio_file" }] : []),
    ...(!acceptTypes || acceptTypes.includes("video") ? [{ value: "video/", label: t("videos"), icon: "video_file" }] : []),
  ];

  // ── Compact mode (for answer rows) ──
  if (compact) {
    return (
      <>
        {value ? (
          <div className="flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-[16px] ${
              value.type === "image" ? "text-[#2a14b4]" : value.type === "audio" ? "text-[#1b6b51]" : "text-[#7b0020]"
            }`}>
              {mediaIcon(value.type)}
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[10px] font-body text-[#2a14b4] hover:underline"
            >
              {value.type}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-[#777586] hover:text-[#7b0020] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-8 h-8 rounded-lg border border-dashed border-[#c7c4d7]/40 flex items-center justify-center text-[#c7c4d7] hover:border-[#2a14b4]/40 hover:text-[#2a14b4] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          </button>
        )}
        {renderModal()}
      </>
    );
  }

  // ── Full mode (for question content) ──
  function renderModal() {
    return (
      <>
        <ModalOverlay open={open} onClose={() => setOpen(false)} panelClass="max-w-3xl">
          <div className="rounded-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#c7c4d7]/15 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">perm_media</span>
                </div>
                <h2 className="font-body font-bold text-lg text-[#121c2a]">{t("mediaLibrary")}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-[#f0eef6] hover:bg-[#e3dfff] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search + Filter + Upload */}
            <div className="flex flex-wrap items-center gap-3 p-5 border-b border-[#c7c4d7]/10 shrink-0">
              <div className="relative flex-1 min-w-[180px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777586]/50 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder={t("searchByFileName")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#f8f9ff] border border-[#c7c4d7]/20 rounded-full text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 focus:border-[#2a14b4] outline-none"
                />
              </div>
              {typeOptions.length > 2 && (
                <div className="flex gap-1">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTypeFilter(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                        typeFilter === opt.value
                          ? "bg-[#2a14b4] text-white"
                          : "bg-[#f0eef6] text-[#464554] hover:bg-[#e3dfff]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2a14b4] text-white rounded-full text-xs font-body font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                {t("uploadMedia")}
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex justify-center py-16">
                  <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">progress_activity</span>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-3xl text-[#777586]/30 mb-2">perm_media</span>
                  <p className="text-sm text-[#777586] font-body">{t("noMedia")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((item) => {
                    const isSelected = value?.url === item.fileUrl;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`group relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                          isSelected
                            ? "border-[#2a14b4] ring-2 ring-[#2a14b4]/20"
                            : "border-transparent hover:border-[#c7c4d7]/40"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-[#f0eef6] flex items-center justify-center overflow-hidden">
                          {item.fileType.startsWith("image/") ? (
                            <img src={item.fileUrl} alt={item.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`material-symbols-outlined text-[36px] ${
                              item.fileType.startsWith("audio/") ? "text-[#1b6b51]" : "text-[#7b0020]"
                            }`}>
                              {item.fileType.startsWith("audio/") ? "audio_file" : "video_file"}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-body font-medium text-[#121c2a] truncate">{item.fileName}</p>
                          <p className="text-[10px] font-body text-[#777586]">{formatSize(item.fileSize)}</p>
                        </div>
                        {/* Selected check */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#2a14b4] flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[14px]">check</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-[#c7c4d7]/10 shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-xs font-body text-[#464554]">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </ModalOverlay>

        {/* Upload sub-modal */}
        {showUpload && (
          <MediaUploadModal
            onClose={() => setShowUpload(false)}
            onComplete={handleUploadComplete}
          />
        )}
      </>
    );
  }

  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[#c7c4d7]/20 bg-[#f8f9ff]">
          {/* Preview */}
          {value.type === "image" ? (
            <img src={value.url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
              value.type === "audio" ? "bg-[#a6f2d1]/30" : "bg-[#ffdada]/30"
            }`}>
              <span className={`material-symbols-outlined text-[24px] ${
                value.type === "audio" ? "text-[#1b6b51]" : "text-[#7b0020]"
              }`}>
                {mediaIcon(value.type)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-body text-[#777586] truncate">{value.url.split("/").pop()}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#2a14b4] font-bold">{value.type}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-8 h-8 rounded-full bg-[#f0eef6] hover:bg-[#e3dfff] flex items-center justify-center text-[#777586] hover:text-[#2a14b4] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-[#f0eef6] hover:bg-[#ffdada]/50 flex items-center justify-center text-[#777586] hover:text-[#7b0020] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#c7c4d7]/30 text-[#777586] hover:border-[#2a14b4]/30 hover:text-[#2a14b4] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          <span className="text-xs font-body font-medium">
            {t("addMedia")}
          </span>
        </button>
      )}
      {renderModal()}
    </>
  );
}
