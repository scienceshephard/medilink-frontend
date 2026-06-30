"use client";

import { cn } from "./cn";
import type { ReactNode } from "react";
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex h-11 items-center gap-1 rounded-full border px-4 text-body-md transition-colors",
        active ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-on-surface hover:bg-surface-container-low")}>
      {children}
    </button>
  );
}
