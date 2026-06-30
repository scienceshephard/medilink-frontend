import { cn } from "./cn";
import type { ReactNode } from "react";
const tones = {
  primary: "bg-primary-fixed text-on-primary-fixed-variant",
  secondary: "bg-secondary-fixed text-on-secondary-fixed-variant",
  tertiary: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  success: "bg-success-container text-on-success-container",
  error: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};
export function StatusBadge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-label-sm font-semibold", tones[tone])}>{children}</span>;
}
