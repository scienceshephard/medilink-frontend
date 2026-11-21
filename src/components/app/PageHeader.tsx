"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { useUnreadCount } from "./NotificationsProvider";

const roundButton = "relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-warm-white text-ink transition-colors hover:bg-primary-soft";

/**
 * The top of every signed-in page, as drawn in medlink-v4: an optional back
 * button or leading avatar, the page title and subtitle, then page actions and
 * the notification bell on the right.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  leading,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** A route to go back to, or `true` for browser history. */
  back?: string | true;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { role } = useAuth();
  const unread = useUnreadCount();
  const hasInbox = role === "patient" || role === "doctor";

  return (
    <header className={cn("flex items-center gap-3", className)}>
      {back && (
        typeof back === "string"
          ? <Link href={back} aria-label="Back" className={roundButton}><Icon name="arrow_back" className="text-[22px]" /></Link>
          : <button type="button" onClick={() => router.back()} aria-label="Back" className={roundButton}><Icon name="arrow_back" className="text-[22px]" /></button>
      )}
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] font-extrabold leading-tight text-ink md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[14px] leading-5 text-ink-muted md:text-[15px]">{subtitle}</p>}
      </div>
      {actions}
      {hasInbox && (
        <Link href="/messages" aria-label="Messages" className={roundButton}>
          <Icon name="chat" className="text-[20px]" />
        </Link>
      )}
      <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} className={roundButton}>
        <Icon name="notifications_active" className="text-[20px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-on-primary">{unread > 9 ? "9+" : unread}</span>
        )}
      </Link>
    </header>
  );
}
