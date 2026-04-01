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

export const metadata: Metadata = {
  title: "VC Class - E-Learning Platform",
  description: "Learn and practice vocabulary with flashcards and quizzes",
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
