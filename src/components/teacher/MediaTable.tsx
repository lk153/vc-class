"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import MediaUploadModal from "@/components/teacher/MediaUploadModal";

type MediaItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  ownerEmail: string;
  createdAt: string;
};

type ApiResponse = {
  results: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(type: string): string {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio_file";
  if (type.startsWith("video/")) return "video_file";
  return "description";
}

function getTypeColor(type: string): string {
  if (type.startsWith("image/")) return "text-[#2a14b4]";
  if (type.startsWith("audio/")) return "text-[#1b6b51]";
  if (type.startsWith("video/")) return "text-[#7b0020]";
  return "text-[#777586]";
}

function TypeFilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#d9e3f6]/50 rounded-full text-sm font-body text-[#464554] hover:bg-[#d9e3f6]/80 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px] text-[#777586]">{selected.icon}</span>
        <span>{selected.label}</span>
        <span
          className="material-symbols-outlined text-[16px] text-[#777586] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.12)] border border-[#c7c4d7]/15 py-1.5 z-20">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body transition-colors ${
                value === option.value
                  ? "text-[#2a14b4] bg-[#e3dfff]/40 font-medium"
                  : "text-[#464554] hover:bg-[#eff4ff]"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${
                value === option.value ? "text-[#2a14b4]" : "text-[#777586]"
              }`}>
                {option.icon}
              </span>
              {option.label}
              {value === option.value && (
                <span className="material-symbols-outlined text-[16px] text-[#2a14b4] ml-auto">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MediaTable() {
  const t = useTranslations("teacher");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);

    try {
      const res = await fetch(`/api/teacher/media?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teacher/media/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Media deleted");
        fetchMedia();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast.success(t("urlCopied"));
  }

  const results = data?.results || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const startItem = total === 0 ? 0 : (page - 1) * 10 + 1;
  const endItem = Math.min(page * 10, total);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-8">
        <div className="relative w-full sm:w-1/4 sm:min-w-[200px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#777586]/50 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#d9e3f6]/50 border-none rounded-full text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 placeholder:text-[#464554]/50 outline-none"
          />
        </div>
        <TypeFilterDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: "All Types", icon: "perm_media" },
            { value: "image/", label: t("images"), icon: "image" },
            { value: "audio/", label: t("audio"), icon: "audio_file" },
            { value: "video/", label: t("videos"), icon: "video_file" },
          ]}
        />
        <div className="sm:ml-auto">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {t("uploadMedia")}
          </button>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">progress_activity</span>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] px-6 py-12 text-center">
            <span className="material-symbols-outlined text-3xl text-[#777586]/40 mb-2">perm_media</span>
            <p className="text-sm text-[#777586]">{t("noMedia")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  {m.fileType.startsWith("image/") ? (
                    <img src={m.fileUrl} alt={m.fileName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined ${getTypeColor(m.fileType)}`}>{getTypeIcon(m.fileType)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-[#121c2a] truncate">{m.fileName}</p>
                    <p className="text-xs text-[#777586] font-body">{formatSize(m.fileSize)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyUrl(m.fileUrl)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-body font-medium text-[#2a14b4] hover:bg-[#e3dfff]/50 transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    {t("deleteMedia")}
                  </button>
                  <span className="ml-auto text-xs text-[#777586] font-body">
                    {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(18,28,42,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#eff4ff] text-xs font-body font-extrabold uppercase tracking-[0.08em] text-[#121c2a]">
              <th className="px-6 py-4 w-12"></th>
              <th className="px-6 py-4">{t("fileName")}</th>
              <th className="px-6 py-4">{t("publishedUrl")}</th>
              <th className="px-6 py-4">{t("fileSize")}</th>
              <th className="px-6 py-4">{t("submittedDate")}</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c7c4d7]/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">progress_activity</span>
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-[#777586]/40">perm_media</span>
                    <p className="text-sm text-[#777586]">{t("noMedia")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              results.map((m) => (
                <tr key={m.id} className="hover:bg-[#eff4ff]/50 transition-colors">
                  <td className="px-6 py-4">
                    {m.fileType.startsWith("image/") ? (
                      <img src={m.fileUrl} alt={m.fileName} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center">
                        <span className={`material-symbols-outlined ${getTypeColor(m.fileType)}`}>{getTypeIcon(m.fileType)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-body font-medium text-[#121c2a]">{m.fileName}</p>
                    <p className="text-xs text-[#777586] font-body">{m.ownerEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-body text-[#464554] truncate max-w-[200px]">{m.fileUrl}</p>
                      <button
                        onClick={() => copyUrl(m.fileUrl)}
                        className="text-[#2a14b4] hover:text-[#4338ca] transition-colors shrink-0"
                        title="Copy URL"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-body text-[#464554]">
                    {formatSize(m.fileSize)}
                  </td>
                  <td className="px-6 py-4 text-sm font-body text-[#464554]">
                    {new Date(m.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      {t("deleteMedia")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-6 py-4 bg-[#dee9fc]/30 flex items-center justify-end gap-4">
            <p className="text-xs font-body text-[#464554]/60">
              Showing {startItem}-{endItem} of {total} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      page === pageNum
                        ? "bg-[#2a14b4] text-white"
                        : "border border-[#c7c4d7]/30 text-[#464554] hover:bg-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      <div className="md:hidden">
        {total > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-body text-[#464554]/60">{startItem}-{endItem} of {total}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="flex items-center text-xs font-body text-[#464554]">{page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 rounded-full border border-[#c7c4d7]/30 flex items-center justify-center text-[#464554] hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <MediaUploadModal
          onClose={() => setShowUpload(false)}
          onComplete={fetchMedia}
        />
      )}
    </div>
  );
}
