"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/topics";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("loginError"));
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const destination =
          session?.user?.role === "TEACHER" ? "/teacher" : callbackUrl;
        router.push(destination);
        router.refresh();
      }
    } catch {
      toast.error(t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8e6ef] px-6 py-8">
      <div className="w-[90vw] max-w-6xl h-[75vh] min-h-[500px] bg-white rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel — Branding */}
        <div className="relative md:w-[45%] bg-gradient-to-br from-[#2a14b4] via-[#3d2cc7] to-[#6c3fd6] p-10 md:p-14 flex flex-col justify-end overflow-hidden">
          {/* Decorative elements */}
          <svg className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 400 500" fill="none">
            <circle cx="50" cy="80" r="6" fill="white" />
            <circle cx="350" cy="60" r="4" fill="white" />
            <circle cx="80" cy="420" r="5" fill="white" />
            <circle cx="320" cy="380" r="3" fill="white" />
            <rect x="160" y="40" width="40" height="40" rx="4" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M30 350 Q100 300 80 400 Q60 450 150 430 Q200 420 180 460" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M250 350 Q320 310 300 410 Q280 460 370 440" stroke="white" strokeWidth="1.5" fill="none" />
            <rect x="40" y="200" width="8" height="8" fill="white" opacity="0.4" transform="rotate(45 44 204)" />
            <rect x="300" y="150" width="12" height="12" fill="white" opacity="0.3" transform="rotate(45 306 156)" />
            <path d="M340 100 L350 90 M345 95 L345 95" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 130 L70 120 M65 125 L65 125" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>

          <div className="relative z-10">
            <h2 className="font-body text-4xl md:text-5xl text-white font-bold leading-tight mb-4">
              {t("welcomeBack")}
            </h2>
            <p className="text-white/80 font-body text-base leading-relaxed">
              {t("welcomeMessage")}
            </p>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="md:w-[55%] p-10 md:px-16 md:py-14 flex flex-col justify-center bg-white">
          <h1 className="font-body font-bold text-3xl md:text-4xl text-[#121c2a] mb-2">
            {t("welcomeBack")}
          </h1>
          <p className="text-[#777586] font-body text-base mb-10">
            {t("welcomeMessage")}
          </p>

          {error === "inactive" && (
            <div className="bg-warning-light text-warning rounded-lg p-3 mb-6 text-sm font-body">
              {t("inactiveError")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-[#d0cde0] bg-white font-body text-sm text-[#121c2a] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 focus:border-[#2a14b4] transition disabled:opacity-60"
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-2 text-[11px] font-body text-[#777586] pointer-events-none transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-[#2a14b4]"
              >
                {t("email")}
              </label>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 rounded-xl border border-[#d0cde0] bg-white font-body text-sm text-[#121c2a] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/30 focus:border-[#2a14b4] transition disabled:opacity-60"
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-2 text-[11px] font-body text-[#777586] pointer-events-none transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-[#2a14b4]"
              >
                {t("password")}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#2a14b4] to-[#5c3fd6] hover:from-[#2310a0] hover:to-[#5235c0] text-white font-body font-bold py-3.5 rounded-full shadow-lg shadow-[#2a14b4]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? t("loggingIn") : t("login")}
            </button>
          </form>

          <p className="text-center text-sm text-[#777586] font-body mt-8">
            {t("noAccount")}{" "}
            <Link href="/register" className="text-[#2a14b4] hover:underline font-bold">
              {t("register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
