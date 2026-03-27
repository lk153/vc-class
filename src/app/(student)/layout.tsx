import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentNavbar from "@/components/student/Navbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <StudentNavbar user={session.user} />
      <main className="max-w-screen-2xl mx-auto px-8 pt-12 pb-20">{children}</main>
    </div>
  );
}
