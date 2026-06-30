"use client";
import { cn } from "./cn";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container hover:brightness-95",
  outline: "border border-outline-variant text-primary bg-transparent hover:bg-surface-container-low",
  ghost: "text-primary hover:bg-surface-container-low",
};

export function Button({
  variant = "primary", size = "md", full, loading, className, children, disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants; size?: "md" | "lg"; full?: boolean; loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none",
        size === "lg" ? "h-14 px-8 text-body-lg" : "h-11 px-6 text-body-md",
        full && "w-full", variants[variant], className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
