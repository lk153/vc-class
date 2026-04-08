import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import RippleEffect from "@/components/RippleEffect";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vc-class.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VC Class — Online Learning & Vocabulary Practice Platform",
    template: "%s | VC Class",
  },
  description:
    "VC Class is a modern e-learning platform for students and teachers. Study vocabulary with flashcards, take practice tests, track progress, and manage classes — all in one place.",
  keywords: [
    "e-learning",
    "LMS",
    "vocabulary",
    "flashcards",
    "practice tests",
    "online learning",
    "language learning",
    "classroom management",
    "quiz",
    "education platform",
    "học trực tuyến",
    "từ vựng",
    "thẻ ghi nhớ",
    "luyện thi",
  ],
  authors: [{ name: "VC Class" }],
  creator: "VC Class",
  openGraph: {
    type: "website",
    siteName: "VC Class",
    title: "VC Class — Online Learning & Vocabulary Practice Platform",
    description:
      "Study vocabulary with flashcards, take practice tests, track progress, and manage classes — all in one place.",
    locale: "en_US",
    alternateLocale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "VC Class — Online Learning & Vocabulary Practice Platform",
    description:
      "Study vocabulary with flashcards, take practice tests, track progress, and manage classes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className={`${roboto.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster
            position="top-center"
            richColors
            visibleToasts={4}
            expand={false}
            gap={0}
            toastOptions={{
              className: "toast-custom",
              duration: 3000,
            }}
          />
          <RippleEffect />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
