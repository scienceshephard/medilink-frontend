import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** The medlink-v4 empty card: soft icon circle, bold title, short line, optional button. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} className="text-[32px]" />
      </span>
      <p className="text-[20px] font-extrabold text-ink">{title}</p>
      {children && <p className="max-w-[340px] text-[15px] leading-6 text-ink-muted">{children}</p>}
      {action && (
        <Link href={action.href} className="mt-1 inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary transition hover:bg-primary-container">
          {action.label}
        </Link>
      )}
    </div>
  );
}
