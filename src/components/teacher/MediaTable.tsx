"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import MediaUploadModal from "@/components/teacher/MediaUploadModal";
import AudioPlayer from "@/components/student/AudioPlayer";
import ModalOverlay from "@/components/ModalOverlay";

type MediaItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  ownerEmail: string;
  createdAt: string;
  usageCount: number;
};

type Stats = {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
};

type ApiResponse = {
  results: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: Stats;
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
  const ct = useTranslations("common");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Preview
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

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
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [debouncedSearch, typeFilter]);

  // Clear selection when page changes
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  async function handleDelete(id: string, force = false) {
    setDeletingId(id);
    try {
      const url = force ? `/api/teacher/media/${id}?force=true` : `/api/teacher/media/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("mediaDeleted"));
        fetchMedia();
      } else {
        const body = await res.json().catch(() => ({}));
        if (body.error === "media_in_use" && !force) {
          // Show warning and ask for confirmation
          const confirmed = window.confirm(
            t("mediaUsedWarning", { count: body.usageCount })
          );
          if (confirmed) {
            await handleDelete(id, true);
            return;
          }
        } else {
          toast.error(t("mediaDeleteFailed"));
        }
      }
    } catch {
      toast.error(t("mediaDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/teacher/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const { deleted } = await res.json();
        toast.success(t("bulkDeleteSuccess", { count: deleted }));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        fetchMedia();
      } else {
        toast.error(t("bulkDeleteFailed"));
      }
    } catch {
      toast.error(t("bulkDeleteFailed"));
    } finally {
      setBulkDeleting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((m) => m.id)));
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
  const stats = data?.stats;
  const allSelected = results.length > 0 && selectedIds.size === results.length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">perm_media</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#121c2a] leading-none">{stats?.totalFiles ?? "—"}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("totalFiles")}</p>
            </div>
          </div>
          {loading && <><div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[1]" /><div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden z-[2]"><div className="absolute h-full bg-[#2a14b4] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" /></div></>}
        </div>
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">cloud</span>
            </div>
            <div>
              <p className="font-body font-bold text-2xl text-[#2a14b4] leading-none">{stats ? formatSize(stats.totalSize) : "—"}</p>
              <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("storageUsed")}</p>
            </div>
          </div>
          {loading && <><div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[1]" /><div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden z-[2]"><div className="absolute h-full bg-[#2a14b4] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" /></div></>}
        </div>
        <div className="relative bg-white rounded-xl ambient-shadow p-5 overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">image</span>
              </div>
              <div>
                <p className="font-body font-bold text-lg text-[#2a14b4] leading-none">{stats?.imageCount ?? "—"}</p>
                <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("images")}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#c7c4d7]/20" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#1b6b51]">audio_file</span>
              </div>
              <div>
                <p className="font-body font-bold text-lg text-[#1b6b51] leading-none">{stats?.audioCount ?? "—"}</p>
                <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("audio")}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-[#c7c4d7]/20" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#ffdada]/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#7b0020]">video_file</span>
              </div>
              <div>
                <p className="font-body font-bold text-lg text-[#7b0020] leading-none">{stats?.videoCount ?? "—"}</p>
                <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("videos")}</p>
              </div>
            </div>
          </div>
          {loading && <><div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-[1]" /><div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden z-[2]"><div className="absolute h-full bg-[#2a14b4] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" /></div></>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-8">
        <div className="relative w-full sm:w-1/4 sm:min-w-[200px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#777586]/50 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder={t("searchByFileName")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#d9e3f6]/50 border-none rounded-full text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 placeholder:text-[#464554]/50 outline-none"
          />
        </div>
        <TypeFilterDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: t("allTypes"), icon: "perm_media" },
            { value: "image/", label: t("images"), icon: "image" },
            { value: "audio/", label: t("audio"), icon: "audio_file" },
            { value: "video/", label: t("videos"), icon: "video_file" },
          ]}
        />

        {/* Bulk delete button */}
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 bg-[#7b0020] text-white px-5 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#7b0020]/15 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {t("bulkDeleteMedia")} ({selectedIds.size})
          </button>
        )}

        <div className="sm:ml-auto">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-[#2a14b4] text-white px-6 py-2.5 rounded-full font-body font-bold text-sm shadow-lg shadow-[#2a14b4]/20 transition-all"
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
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20 shrink-0"
                  />
                  {/* Thumbnail */}
                  <button
                    onClick={() => setPreviewItem(m)}
                    className="shrink-0 no-ripple"
                  >
                    {m.fileType.startsWith("image/") ? (
                      <img src={m.fileUrl} alt={m.fileName} className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center cursor-pointer hover:bg-[#e3dfff] transition-colors">
                        <span className={`material-symbols-outlined ${getTypeColor(m.fileType)}`}>{getTypeIcon(m.fileType)}</span>
                      </div>
                    )}
                  </button>
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
                    {t("copyUrl")}
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${deletingId === m.id ? "animate-spin" : ""}`}>{deletingId === m.id ? "progress_activity" : "delete"}</span>
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
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                />
              </th>
              <th className="px-4 py-4 w-14"></th>
              <th className="px-6 py-4">{t("fileName")}</th>
              <th className="px-6 py-4">{t("publishedUrl")}</th>
              <th className="px-6 py-4">{t("fileSize")}</th>
              <th className="px-6 py-4">{t("submittedDate")}</th>
              <th className="px-6 py-4 text-center">Used</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c7c4d7]/10">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">progress_activity</span>
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-[#777586]/40">perm_media</span>
                    <p className="text-sm text-[#777586]">{t("noMedia")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              results.map((m) => (
                <tr
                  key={m.id}
                  className={`transition-colors ${
                    selectedIds.has(m.id) ? "bg-[#e3dfff]/20" : "hover:bg-[#eff4ff]/50"
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="w-4 h-4 rounded border-[#c7c4d7] text-[#2a14b4] focus:ring-[#2a14b4]/20"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setPreviewItem(m)}
                      className="no-ripple"
                    >
                      {m.fileType.startsWith("image/") ? (
                        <img src={m.fileUrl} alt={m.fileName} className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center cursor-pointer hover:bg-[#e3dfff] transition-colors">
                          <span className={`material-symbols-outlined ${getTypeColor(m.fileType)}`}>{getTypeIcon(m.fileType)}</span>
                        </div>
                      )}
                    </button>
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
                        title={t("copyUrl")}
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
                  <td className="px-6 py-4 text-center">
                    {m.usageCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-body font-bold px-2.5 py-0.5 rounded-full bg-[#e3dfff] text-[#2a14b4]">
                        {m.usageCount}
                      </span>
                    ) : (
                      <span className="text-xs text-[#c7c4d7]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-body font-medium text-[#7b0020] hover:bg-[#ffdada]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${deletingId === m.id ? "animate-spin" : ""}`}>{deletingId === m.id ? "progress_activity" : "delete"}</span>
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
              {t("showingResults", { start: startItem, end: endItem, total })}
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

      {/* Bulk Delete Confirmation Modal */}
      <ModalOverlay
        open={showDeleteConfirm}
        onClose={() => !bulkDeleting && setShowDeleteConfirm(false)}
        panelClass="max-w-md"
      >
        <div className="p-6 md:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#ffdada]/40 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px] text-[#7b0020]">delete_forever</span>
          </div>
          <h3 className="font-body font-bold text-xl text-[#121c2a] mb-2">
            {t("confirmDeleteTitle")}
          </h3>
          <p className="text-sm font-body text-[#464554] mb-8 leading-relaxed">
            {t("confirmDeleteMessage", { count: selectedIds.size })}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={bulkDeleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-medium text-[#464554] bg-[#f0eef6] hover:bg-[#e3dfff] hover:text-[#121c2a] transition-colors disabled:opacity-40"
            >
              {ct("cancel")}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-6 py-2.5 rounded-full text-sm font-body font-bold text-white bg-[#7b0020] hover:bg-[#5c0017] shadow-lg shadow-[#7b0020]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkDeleting && (
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              )}
              {ct("confirm")}
            </button>
          </div>
        </div>
      </ModalOverlay>

      {/* Preview Modal */}
      <ModalOverlay
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
        panelClass="max-w-3xl"
      >
        {previewItem && (
          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#c7c4d7]/15">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[18px] ${getTypeColor(previewItem.fileType)}`}>
                    {getTypeIcon(previewItem.fileType)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-body font-bold text-[#121c2a] truncate">{previewItem.fileName}</p>
                  <p className="text-xs font-body text-[#777586]">{formatSize(previewItem.fileSize)}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="w-9 h-9 rounded-full bg-[#f0eef6] hover:bg-[#e3dfff] flex items-center justify-center text-[#777586] hover:text-[#121c2a] transition-all shrink-0 ml-4"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="bg-[#121c2a] flex items-center justify-center min-h-[300px] max-h-[70vh]">
              {previewItem.fileType.startsWith("image/") && (
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              {previewItem.fileType.startsWith("video/") && (
                <video
                  src={previewItem.fileUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh]"
                />
              )}
              {previewItem.fileType.startsWith("audio/") && (
                <div className="flex flex-col items-center gap-8 p-10 w-full">
                  <div className="w-24 h-24 rounded-full bg-[#2a14b4]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[48px] text-[#2a14b4]">audio_file</span>
                  </div>
                  <div className="w-full max-w-lg">
                    <AudioPlayer src={previewItem.fileUrl} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalOverlay>
    </div>
  );
}
