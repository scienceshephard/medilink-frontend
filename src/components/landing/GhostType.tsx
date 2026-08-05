"use client";

/**
 * Oversized outlined display text used as a decorative backdrop.
 * `aria-hidden` because it repeats copy that is already present as real text —
 * screen readers must not read it twice.
 */
export function GhostType({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none select-none whitespace-nowrap font-extrabold uppercase leading-none tracking-tight ${className}`}
      style={{
        WebkitTextStroke: "1.5px currentColor",
        color: "transparent",
      }}
    >
      {text}
    </span>
  );
}
