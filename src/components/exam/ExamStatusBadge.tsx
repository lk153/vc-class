"use client";

import { useTranslations } from "next-intl";

type Status = "ACTIVE" | "INACTIVE" | "DOING" | "GRADING" | "GRADED";

type Props = {
  testStatus: string;
  sessionStatus?: string | null;
};

const STATUS_CONFIG: Record<Status, { labelKey: string; color: string; icon: string }> = {
  ACTIVE: { labelKey: "statusAvailable", color: "bg-[#a6f2d1]/30 text-[#1b6b51]", icon: "play_circle" },
  INACTIVE: { labelKey: "statusUnavailable", color: "bg-[#e5e0ed]/50 text-[#777586]", icon: "block" },
  DOING: { labelKey: "statusInProgress", color: "bg-[#fef3c7] text-[#92400e]", icon: "pending" },
  GRADING: { labelKey: "statusAwaitingGrade", color: "bg-[#dbeafe] text-[#1e40af]", icon: "hourglass_top" },
  GRADED: { labelKey: "statusViewResults", color: "bg-[#e3dfff] text-[#5e35f1]", icon: "verified" },
};

export default function ExamStatusBadge({ testStatus, sessionStatus }: Props) {
  const t = useTranslations("exam");
  const effectiveStatus = (sessionStatus || testStatus) as Status;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.ACTIVE;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wider ${config.color}`}>
      <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
      {t(config.labelKey)}
    </span>
  );
}
