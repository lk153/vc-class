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

  function handleRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }

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
    <>
      <style>{`
        .login-glass {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 1rem;
          padding: 1.75rem;
          box-shadow: 0 10px 40px -10px rgba(74,58,255,0.12);
        }
        @media (min-width: 1024px) {
          .login-glass {
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8f9ff]">
        {/* ── Left Panel: Branding ── */}
        <section className="relative lg:w-[45%] flex flex-col justify-end lg:justify-center items-center overflow-hidden h-[280px] lg:h-auto lg:min-h-screen">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#5e42ce,#4a3aff_50%,#1a0b4e)]" />

          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Decorative blurred orbs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#e0e7ff] rounded-full mix-blend-screen blur-[80px] opacity-30" />
          <div className="absolute -bottom-24 -left-24 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-[#4a3aff]/20 rounded-full blur-[120px]" />

          {/* Mobile branding */}
          <div className="relative z-10 text-center px-8 pb-14 lg:hidden">
            <h1 className="font-headline text-3xl font-black text-white tracking-tight drop-shadow-lg">
              VC Class
            </h1>
            <p className="font-headline text-base text-white/80 font-semibold mt-1">
              {t("brandingSubtitle")}
            </p>
          </div>

          {/* Desktop branding */}
          <div className="relative z-10 w-full max-w-xl px-14 xl:px-16 hidden lg:flex lg:flex-col lg:gap-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-white/90 text-sm font-semibold tracking-wide uppercase bg-white/5 backdrop-blur-xl border border-white/10 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#818cf8] animate-pulse" />
              {t("brandingSubtitle")}
            </div>
            <h1 className="font-headline text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              {t("brandingTitle")}
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              {t("brandingMessage")}
            </p>
          </div>
        </section>

        {/* ── Right Panel: Login Form ── */}
        <section className="relative flex-1 flex flex-col items-center justify-start lg:justify-center px-5 lg:px-16 -mt-8 lg:mt-0 z-20">
          {/* Ambient blurs — desktop only */}
          <div className="hidden lg:block absolute top-0 right-0 w-64 h-64 bg-[#e0e7ff]/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="hidden lg:block absolute bottom-0 left-0 w-96 h-96 bg-[#4a3aff]/8 blur-[120px] rounded-full pointer-events-none" />

          <div className="w-full max-w-md lg:max-w-lg">
            <div className="login-glass">
              {/* Heading */}
              <div className="text-center lg:text-left mb-8 lg:mb-10">
                <h2 className="font-headline text-3xl lg:text-4xl xl:text-5xl font-extrabold text-[#1e1b4b] tracking-tight mb-2">
                  {t("welcomeBack")}
                </h2>
                <p className="text-[#5a5d7e] font-medium text-sm lg:text-base">
                  {t("welcomeSubtitle")}
                </p>
              </div>

              {error === "inactive" && (
                <div className="bg-warning-light text-warning rounded-xl p-3 mb-6 text-sm font-body">
                  {t("inactiveError")}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="font-headline text-[11px] font-bold text-[#4a3aff] uppercase tracking-widest ml-1"
                  >
                    {t("email")}
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7c7ea1]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      disabled={loading}
                      placeholder={t("emailPlaceholder")}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-[#c4c6d0]/30 focus:border-[#4a3aff]/50 focus:ring-2 focus:ring-[#4a3aff]/10 placeholder:text-[#7c7ea1]/50 transition-all text-[#1e1b4b] font-medium disabled:opacity-60 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="font-headline text-[11px] font-bold text-[#4a3aff] uppercase tracking-widest ml-1"
                  >
                    {t("password")}
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7c7ea1]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      disabled={loading}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-[#c4c6d0]/30 focus:border-[#4a3aff]/50 focus:ring-2 focus:ring-[#4a3aff]/10 placeholder:text-[#7c7ea1]/50 transition-all text-[#1e1b4b] font-medium disabled:opacity-60 outline-none"
                    />
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  onClick={handleRipple}
                  className="relative overflow-hidden !mt-8 w-full py-4 bg-gradient-to-r from-[#4a3aff] to-[#5e42ce] text-white font-headline font-extrabold text-lg rounded-full shadow-lg shadow-[#4a3aff]/25 hover:shadow-xl hover:shadow-[#4a3aff]/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {loading ? t("loggingIn") : t("login")}
                  {!loading && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  )}
                </button>
              </form>

              {/* Register link */}
              <p className="text-center text-sm text-[#5a5d7e] font-medium mt-8 lg:mt-10">
                {t("noAccount")}{" "}
                <Link
                  href="/register"
                  className="text-[#4a3aff] font-bold hover:underline decoration-2 underline-offset-4"
                >
                  {t("register")}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
