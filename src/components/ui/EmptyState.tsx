import type { ReactNode } from "react";
export function EmptyState({ title, description, action }:
  { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant py-16 text-center">
      <p className="text-headline-md font-semibold text-on-surface">{title}</p>
      {description && <p className="mt-1 max-w-md text-body-md text-on-surface-variant">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
