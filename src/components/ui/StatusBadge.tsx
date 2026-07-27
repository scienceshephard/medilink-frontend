import { cn } from "./cn";
import type { ReactNode } from "react";
const tones = {
  primary: "bg-primary-soft text-primary",
  secondary: "bg-accent-soft text-accent",
  tertiary: "bg-accent-soft text-accent",
  success: "bg-accent-soft text-accent",
  warning: "bg-amber-soft text-warning",
  error: "bg-red-soft text-error",
  neutral: "bg-surface-container text-ink-muted",
};
export function StatusBadge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-label-sm font-bold", tones[tone])}>{children}</span>;
}
