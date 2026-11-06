"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cn } from "./cn";

export function Input({
  label,
  error,
  className,
  type = "text",
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="block">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-label-md font-bold text-ink">
          {label}
        </label>
      )}
      <div className={cn("relative", isPassword && "flex items-center")}>
        <input
          id={inputId}
          type={isPassword && showPassword ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "h-14 w-full rounded-2xl border border-border bg-warm-white px-4 text-body-md",
            "placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            isPassword && "pr-12",
            error && "border-error focus:border-error focus:ring-error/20",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-xl" />
          </button>
        )}
      </div>
      {error && (
        <span id={`${inputId}-error`} className="mt-1 block text-label-sm text-error">
          {error}
        </span>
      )}
    </div>
  );
}
