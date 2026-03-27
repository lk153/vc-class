import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MediaTable from "@/components/teacher/MediaTable";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("teacher");

  const media = await prisma.media.findMany({
    where: { uploadedById: session.user.id },
    select: { fileType: true, fileSize: true },
  });

  const totalFiles = media.length;
  const totalSize = media.reduce((sum, m) => sum + m.fileSize, 0);
  const imageCount = media.filter((m) => m.fileType.startsWith("image/")).length;
  const audioCount = media.filter((m) => m.fileType.startsWith("audio/")).length;
  const videoCount = media.filter((m) => m.fileType.startsWith("video/")).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl text-[#121c2a] font-bold mb-2">
          {t("media")}
        </h1>
        <p className="text-lg font-headline italic text-[#464554] opacity-80">
          {t("mediaDescription")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">perm_media</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#121c2a] leading-none">{totalFiles}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("totalFiles")}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#2a14b4]">cloud</span>
          </div>
          <div>
            <p className="font-headline text-2xl text-[#2a14b4] leading-none">{formatSize(totalSize)}</p>
            <p className="text-[10px] font-body uppercase tracking-widest text-[#777586] font-bold mt-1">{t("storageUsed")}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl ambient-shadow p-5 flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e3dfff] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#2a14b4]">image</span>
            </div>
            <div>
              <p className="font-headline text-lg text-[#2a14b4] leading-none">{imageCount}</p>
              <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("images")}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-[#c7c4d7]/20" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#a6f2d1]/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#1b6b51]">audio_file</span>
            </div>
            <div>
              <p className="font-headline text-lg text-[#1b6b51] leading-none">{audioCount}</p>
              <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("audio")}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-[#c7c4d7]/20" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ffdada]/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-[#7b0020]">video_file</span>
            </div>
            <div>
              <p className="font-headline text-lg text-[#7b0020] leading-none">{videoCount}</p>
              <p className="text-[9px] font-body uppercase tracking-widest text-[#777586] font-bold mt-0.5">{t("videos")}</p>
            </div>
          </div>
        </div>
      </div>

      <MediaTable />
    </div>
  );
}
