"use client";
import { motion } from "framer-motion";
import { cn } from "./cn";
export function ScoreBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-container-high", className)}>
      <motion.div className="h-full rounded-full bg-primary"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}
