import { cn } from "./cn";
import { Icon } from "./Icon";
import type { ReactNode } from "react";
const tones = {
  primary: "bg-primary-soft text-primary",
  secondary: "bg-accent-soft text-accent",
  tertiary: "bg-accent-soft text-accent",
  success: "bg-accent-soft text-face-better",
  warning: "bg-amber-soft text-[#B07A1E]",
  error: "bg-red-soft text-face-worse",
  neutral: "bg-[#EFE6D8] text-ink-muted",
};
const toneIcons: Partial<Record<keyof typeof tones, string>> = {
  success: "check_circle",
  warning: "hourglass_top",
  error: "cancel",
};
export function StatusBadge({ tone, icon, children }: { tone: keyof typeof tones; icon?: string | false; children: ReactNode }) {
  const glyph = icon === false ? undefined : icon ?? toneIcons[tone];
  return (
    <span className={cn("inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-bold", tones[tone])}>
      {glyph && <Icon name={glyph} className="text-[16px]" />}
      {children}
    </span>
  );
}
