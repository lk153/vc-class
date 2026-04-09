"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import LogoutOverlay from "@/components/LogoutOverlay";

type Props = {
  user: { name: string; email: string };
  onMenuToggle: () => void;
};

export default function AccountInfo({ user, onMenuToggle }: Props) {
  const t = useTranslations("auth");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    signOut({ callbackUrl: "/login" });
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 lg:px-12 py-4 bg-[#f8f9ff]/80 backdrop-blur-md">
        {/* Hamburger (mobile only) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-[#121c2a] hover:text-[#2a14b4] transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>

        {/* Spacer on desktop */}
        <div className="hidden lg:block" />

        {/* Account */}
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <div className="h-6 w-px bg-[#c7c4d7]/30 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-body font-semibold text-[#121c2a]">{user.name}</p>
            <p className="text-xs font-body text-[#777586]">{user.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#e3dfff] flex items-center justify-center">
            <span className="font-body text-sm text-[#2a14b4]">{initials}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="no-ripple ml-1 text-[#777586] hover:text-[#7b0020] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title={t("logout")}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
      <LogoutOverlay open={loggingOut} />
    </>
  );
}
