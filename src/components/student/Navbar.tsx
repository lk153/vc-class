"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type Props = {
  user: { name: string; email: string };
};

export default function StudentNavbar({ user }: Props) {
  const t = useTranslations();

  return (
    <nav className="sticky top-0 z-50 glass-nav bg-[#eff4ff]/80">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
        <Link
          href="/topics"
          className="text-2xl font-body text-[#2a14b4]"
        >
          {t("common.appName")}
        </Link>

        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <div className="h-5 w-px bg-[#c7c4d7]/30" />
          <span className="text-[#27313f] font-body text-sm hidden sm:block">
            {user.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[#777586] font-body text-xs uppercase tracking-wider hover:text-[#2a14b4] transition-colors duration-300"
          >
            {t("auth.logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}
