"use client";

import { useState, useEffect, useRef } from "react";

type Notification = {
  id: string;
  type: string;
  referenceId: string;
  read: boolean;
  createdAt: string;
};

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  EXAM_SUBMITTED: { icon: "send", label: "Exam submitted" },
  EXAM_GRADED: { icon: "verified", label: "Exam graded" },
  TEST_ACTIVATED: { icon: "play_circle", label: "New test available" },
};

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
        setNotifications(data.notifications);
      }
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center
          hover:bg-[#f0eef6] transition-colors"
      >
        <span className="material-symbols-outlined text-[20px] text-[#777586]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#7b0020] text-white
            text-[9px] font-bold flex items-center justify-center min-w-[18px] px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-[0_20px_40px_rgba(18,28,42,0.12)] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#c7c4d7]/15 flex items-center justify-between">
            <span className="text-sm font-body font-bold text-[#121c2a]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-body font-bold text-[#2a14b4] hover:underline uppercase tracking-wider"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-[#c7c4d7] block mb-2">notifications_off</span>
                <p className="text-xs font-body text-[#777586]">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_LABELS[n.type] || { icon: "info", label: n.type };
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-[#c7c4d7]/10 last:border-0 flex items-start gap-3 ${
                      !n.read ? "bg-[#f7f2fa]/50" : ""
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${
                      !n.read ? "text-[#2a14b4]" : "text-[#c7c4d7]"
                    }`}>
                      {config.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-body ${!n.read ? "font-semibold text-[#121c2a]" : "text-[#777586]"}`}>
                        {config.label}
                      </p>
                      <p className="text-[10px] font-body text-[#c7c4d7] mt-0.5">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#2a14b4] mt-1.5 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
