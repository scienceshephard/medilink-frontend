"use client";
import { motion } from "framer-motion";
export function RingScore({ value, label, size = 140 }: { value: number; label?: string; size?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-surface-container-high" strokeWidth={10} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-primary"
          strokeWidth={10} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-headline-lg font-bold text-on-surface">{Math.round(pct * 100)}%</span>
        {label && <span className="text-label-sm text-on-surface-variant">{label}</span>}
      </div>
    </div>
  );
}
