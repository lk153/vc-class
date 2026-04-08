import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to VC Class to access your courses, flashcards, and practice tests.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
