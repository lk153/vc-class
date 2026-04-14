"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import LogoutOverlay from "@/components/LogoutOverlay";
import NotificationBell from "@/components/NotificationBell";

type Props = {
  user: { name: string; email: string };
};

export default function StudentNavbar({ user }: Props) {
  const t = useTranslations();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 glass-nav bg-[#eff4ff]/80">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
          <Link
            href="/topics"
            className="text-2xl font-body text-[#2a14b4]"
          >
            {t("common.appName")}
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/results"
              className="text-sm font-body font-medium text-[#777586] hover:text-[#2a14b4] transition-colors hidden sm:flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">assessment</span>
              {t("student.myResults")}
            </Link>
            <LocaleSwitcher />
            <NotificationBell />
            <div className="h-6 w-px bg-[#c7c4d7]/30 hidden sm:block" />
            <span className="text-[#121c2a] font-body text-sm font-medium hidden sm:block">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="no-ripple ml-1 text-[#777586] hover:text-[#7b0020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title={t("auth.logout")}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </nav>
      <LogoutOverlay open={loggingOut} />
    </>
  );
}
