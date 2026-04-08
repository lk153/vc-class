import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a free VC Class account to start learning vocabulary, taking practice tests, and tracking your progress.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
