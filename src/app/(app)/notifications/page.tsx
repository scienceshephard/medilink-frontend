"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { NOTIFICATION_ICON, notificationsChanged, timeAgo } from "@/lib/notifications";
import type { Notification } from "@/lib/types";

const EMPTY_HINT: Record<string, string> = {
  patient: "Updates about your visit requests, confirmations, payments and care plans will show here.",
  doctor: "New requests, cancellations, ratings and visit reminders will show here.",
  clinic: "Team invites and assignments will show here.",
  admin: "New clinicians to verify and every step of each visit will show here.",
};

export default function NotificationsPage() {
  const { role } = useAuth();
  const { data: items, loading, error, reload } = useApi(() => api.notifications.list(), []);
  // Unread when first shown here, so they stay highlighted after being marked read.
  const freshIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!items) return;
    const fresh = (freshIds.current ??= new Set());
    items.forEach((n) => { if (!n.read_at) fresh.add(n.id); });
    if (items.some((n) => !n.read_at)) {
      api.notifications.readAll().then(notificationsChanged).catch(() => undefined);
    }
  }, [items]);

  // New arrivals while this page is open appear without a manual refresh.
  useEffect(() => {
    const timer = setInterval(reload, 20000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center justify-between">
        <h1 className="text-display-sm font-extrabold text-ink">Notifications</h1>
        <button onClick={() => reload()} className="text-body-md font-bold text-primary">Refresh</button>
      </div>

      <div className="mt-6 space-y-3">
        {loading && !items && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[20px]" />)}
        {error && <p className="text-body-md text-ink-muted">{error}</p>}
        {items && items.length === 0 && (
          <div className="rounded-[20px] border border-border bg-warm-white p-8 text-center">
            <Icon name="notifications_active" className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-extrabold text-ink">All caught up</p>
            <p className="mt-1 text-body-md text-ink-muted">{EMPTY_HINT[role ?? "patient"] ?? EMPTY_HINT.patient}</p>
          </div>
        )}
        {items?.map((n: Notification) => {
          const fresh = !n.read_at || freshIds.current?.has(n.id);
          const inner = (
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name={NOTIFICATION_ICON[n.kind] ?? "notifications_active"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-ink">{n.title}</span>
                {n.body && <span className="block text-body-sm text-ink-muted">{n.body}</span>}
                <span className="mt-1 block text-caption text-ink-muted">{timeAgo(n.created_at)}</span>
              </span>
              {fresh && <span aria-label="New" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
            </div>
          );
          const frame = `block rounded-[20px] border p-4 shadow-card ${fresh ? "border-primary/40 bg-white" : "border-border bg-warm-white"}`;
          return n.href ? (
            <Link key={n.id} href={n.href} className={`${frame} transition-transform hover:-translate-y-0.5`}>
              {inner}
            </Link>
          ) : (
            <div key={n.id} className={frame}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
