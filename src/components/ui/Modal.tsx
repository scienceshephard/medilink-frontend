"use client";
import type { ReactNode } from "react";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-[28px] bg-warm-white p-6 shadow-modal sm:rounded-[24px]">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-headline-md font-extrabold text-ink">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-sand text-ink-muted">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
