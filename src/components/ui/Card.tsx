import { cn } from "./cn";
import type { ReactNode } from "react";

export function Card({ as, className, children, hover }: { as?: keyof JSX.IntrinsicElements; className?: string; children: ReactNode; hover?: boolean }) {
  const Tag = as ?? "div";
  return (
    <Tag className={cn(
      "rounded-xl bg-surface-container-lowest p-6 shadow-card border border-outline-variant/40",
      hover && "transition-transform hover:-translate-y-0.5 hover:shadow-modal", className,
    )}>
      {children}
    </Tag>
  );
}
