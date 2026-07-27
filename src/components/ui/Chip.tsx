"use client";

import { cn } from "./cn";
import type { ReactNode } from "react";
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex h-11 items-center gap-1 rounded-full border px-4 text-body-md font-bold transition-colors",
        active ? "border-2 border-primary bg-primary-soft text-ink" : "border border-border bg-warm-white text-ink hover:bg-primary-soft/40")}>
      {children}
    </button>
  );
}
