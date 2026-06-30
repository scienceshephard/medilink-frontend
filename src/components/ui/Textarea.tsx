import { cn } from "./cn";
import type { TextareaHTMLAttributes } from "react";
export function Textarea({ label, error, className, ...props }:
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-label-md text-on-surface-variant">{label}</span>}
      <textarea
        className={cn(
          "min-h-[112px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-body-md",
          "placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20", className,
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-label-sm text-error">{error}</span>}
    </label>
  );
}
