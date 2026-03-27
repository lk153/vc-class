import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeacherShell from "@/components/teacher/TeacherShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/topics");

  return <TeacherShell user={session.user}>{children}</TeacherShell>;
}
