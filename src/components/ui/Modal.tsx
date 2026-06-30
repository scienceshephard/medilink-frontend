"use client";
import type { ReactNode } from "react";
export function Modal({ open, onClose, title, children }:
  { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inverse-surface/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-surface-container-lowest p-6 shadow-modal">
        {title && <h2 className="mb-4 text-headline-md font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
