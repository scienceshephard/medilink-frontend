import { cn } from "./cn";
import type { InputHTMLAttributes } from "react";
export function Input({ label, error, className, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-label-md text-on-surface-variant">{label}</span>}
      <input
        className={cn(
          "h-14 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md",
          "placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          error && "border-error focus:border-error focus:ring-error/20", className,
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-label-sm text-error">{error}</span>}
    </label>
  );
}
