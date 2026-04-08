import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "VC Class",
    template: "%s | VC Class",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
