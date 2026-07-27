import { cn } from "./cn";
import type { ReactNode } from "react";

export function Card({ as, className, children, hover }: { as?: keyof JSX.IntrinsicElements; className?: string; children: ReactNode; hover?: boolean }) {
  const Tag = as ?? "div";
  return (
    <Tag className={cn(
      "rounded-[20px] bg-warm-white p-6 shadow-card border border-border",
      hover && "transition-transform hover:-translate-y-0.5 hover:shadow-modal", className,
    )}>
      {children}
    </Tag>
  );
}
