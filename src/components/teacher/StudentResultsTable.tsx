"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import ResultDetailModal from "@/components/teacher/ResultDetailModal";

type Result = {
  id: string;
  studentName: string;
  testName: string;
  topicName: string;
  language: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
};

type ApiResponse = {
  results: Result[];
  total: number;
  page: number;
  totalPages: number;
};

export default function StudentResultsTable() {
  const t = useTranslations("teacher");
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const res = await fetch(`/api/teacher/student-results?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

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
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#d9e3f6]/50 border-none rounded-full text-sm font-body focus:ring-2 focus:ring-[#2a14b4]/20 placeholder:text-[#464554]/50 outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#c7c4d7]/40 rounded-lg px-3 py-1.5 focus-within:border-[#2a14b4] focus-within:ring-1 focus-within:ring-[#2a14b4]/20 transition-all">
            <label className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] shrink-0">{t("dateFrom")}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="date-input bg-transparent border-none text-sm font-body text-[#121c2a] outline-none focus:ring-0 w-[130px]"
            />
          </div>
          <span className="text-[#c7c4d7] text-sm">—</span>
          <div className="flex items-center gap-2 bg-white border border-[#c7c4d7]/40 rounded-lg px-3 py-1.5 focus-within:border-[#2a14b4] focus-within:ring-1 focus-within:ring-[#2a14b4]/20 transition-all">
            <label className="text-[10px] font-body font-bold uppercase tracking-widest text-[#777586] shrink-0">{t("dateTo")}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="date-input bg-transparent border-none text-sm font-body text-[#121c2a] outline-none focus:ring-0 w-[130px]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="w-7 h-7 rounded-full bg-[#f0eef6] flex items-center justify-center text-[#777586] hover:bg-[#ffdada]/60 hover:text-[#7b0020] transition-all"
              title={t("clearDates")}
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">
              progress_activity
            </span>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-[#777586]/40">
                assignment
              </span>
              <p className="text-sm text-[#777586]">{t("noResults")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResultId(r.id)}
                className="w-full text-left bg-white rounded-xl shadow-[0px_20px_40px_rgba(18,28,42,0.04)] p-4 hover:bg-[#e3dfff]/50 hover:shadow-[0px_4px_16px_rgba(18,28,42,0.08)] transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-bold text-[#2a14b4] shrink-0">
                    {r.studentName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm text-[#121c2a] truncate">{r.studentName}</p>
                    <p className="text-xs text-[#464554] font-body truncate">{r.testName}</p>
                  </div>
                  <span
                    className={`font-body font-bold text-xl shrink-0 ${
                      r.score >= 80
                        ? "text-[#1b6b51]"
                        : r.score >= 50
                        ? "text-[#2a14b4]"
                        : "text-[#7b0020]"
                    }`}
                  >
                    {Math.round(r.score)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-[#464554] font-body">{r.topicName}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-2.5 py-0.5 rounded-full">
                    {r.language}
                  </span>
                  <span className="text-[#777586] font-body">{r.correctCount}/{r.totalQuestions}</span>
                  <span className="ml-auto text-[#777586] font-body">
                    {(() => { const d = new Date(r.completedAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        {total > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-body text-[#464554]/60">
              {startItem}-{endItem} of {total}
            </p>
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

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(18,28,42,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#eff4ff] text-xs font-body font-extrabold uppercase tracking-[0.08em] text-[#121c2a]">
              <th className="px-6 py-4">{t("studentName")}</th>
              <th className="px-6 py-4">{t("testNameCol")}</th>
              <th className="px-6 py-4">{t("topicCol")}</th>
              <th className="px-6 py-4">{t("languageCol")}</th>
              <th className="px-6 py-4 text-right">
                <span className="inline-flex items-center gap-1 group/score relative">
                  {t("scoreCol")}
                  <span className="material-symbols-outlined text-[14px] text-[#777586] cursor-help">info</span>
                  <span className="pointer-events-none absolute top-full right-0 mt-2 opacity-0 group-hover/score:opacity-100 transition-opacity whitespace-nowrap bg-[#121c2a] text-white text-xs font-body font-medium px-3 py-1.5 rounded normal-case tracking-normal before:content-[''] before:absolute before:bottom-full before:right-3 before:border-[5px] before:border-transparent before:border-b-[#121c2a]">
                    {t("scoreHint")}
                  </span>
                </span>
              </th>
              <th className="px-6 py-4 text-right">
                <span className="inline-flex items-center gap-1 group/correct relative">
                  {t("correctCol")}
                  <span className="material-symbols-outlined text-[14px] text-[#777586] cursor-help">info</span>
                  <span className="pointer-events-none absolute top-full right-0 mt-2 opacity-0 group-hover/correct:opacity-100 transition-opacity whitespace-nowrap bg-[#121c2a] text-white text-xs font-body font-medium px-3 py-1.5 rounded normal-case tracking-normal before:content-[''] before:absolute before:bottom-full before:right-3 before:border-[5px] before:border-transparent before:border-b-[#121c2a]">
                    {t("correctHint")}
                  </span>
                </span>
              </th>
              <th className="px-6 py-4 text-right">
                <span className="inline-flex items-center gap-1 group/tip relative">
                  {t("submittedDate")}
                  <span className="material-symbols-outlined text-[14px] text-[#777586] cursor-help">info</span>
                  <span className="pointer-events-none absolute top-full right-0 mt-2 opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap bg-[#121c2a] text-white text-xs font-body font-medium px-3 py-1.5 rounded normal-case tracking-normal before:content-[''] before:absolute before:bottom-full before:right-3 before:border-[5px] before:border-transparent before:border-b-[#121c2a]">
                    {t("dateFormatHint")}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c7c4d7]/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#777586]">
                  <span className="material-symbols-outlined animate-spin text-[#2a14b4] text-2xl">
                    progress_activity
                  </span>
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-[#777586]/40">
                      assignment
                    </span>
                    <p className="text-sm text-[#777586]">{t("noResults")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              results.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedResultId(r.id)}
                  className="hover:bg-[#e3dfff]/50 transition-colors duration-200 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e3dfff] flex items-center justify-center text-xs font-bold text-[#2a14b4]">
                        {r.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="font-body font-semibold text-sm text-[#121c2a]">
                        {r.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-body text-[#121c2a]">
                    {r.testName}
                  </td>
                  <td className="px-6 py-4 text-sm font-body text-[#464554]">
                    {r.topicName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1b6b51] bg-[#a6f2d1]/40 px-3 py-1 rounded-full">
                      {r.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-body font-bold text-lg ${
                        r.score >= 80
                          ? "text-[#1b6b51]"
                          : r.score >= 50
                          ? "text-[#2a14b4]"
                          : "text-[#7b0020]"
                      }`}
                    >
                      {Math.round(r.score)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-body text-[#464554]">
                    {r.correctCount}/{r.totalQuestions}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-body text-[#464554]">
                    {(() => { const d = new Date(r.completedAt); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })()}
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
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
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

      {/* Result Detail Modal */}
      {selectedResultId && (
        <ResultDetailModal
          resultId={selectedResultId}
          onClose={() => setSelectedResultId(null)}
        />
      )}
    </div>
  );
}
