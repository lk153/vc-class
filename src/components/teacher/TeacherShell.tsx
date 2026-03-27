"use client";

import { useState } from "react";
import TeacherSidebar from "@/components/teacher/Sidebar";
import AccountInfo from "@/components/teacher/AccountInfo";

type Props = {
  user: { name: string; email: string };
  children: React.ReactNode;
};

export default function TeacherShell({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#f8f9ff]">
      <TeacherSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AccountInfo user={user} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 md:px-8 lg:px-12 pb-10 font-body">{children}</main>
      </div>
    </div>
  );
}
