"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect } from "react";
import type { Notification } from "@/lib/types";

const KIND_ICON: Record<string, string> = {
  request: "inbox",
  payment: "payments",
  rating: "star",
  reminder: "event_available",
  clinic: "local_hospital",
};

export default function NotificationsPage() {
  const { data: items, loading, error, reload } = useApi(() => api.notifications.list(), []);

  useEffect(() => {
    if (items && items.some((n) => !n.read_at)) {
      api.notifications.readAll().catch(() => undefined);
    }
  }, [items]);

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center justify-between">
        <h1 className="text-display-sm font-extrabold text-ink">Notifications</h1>
        <button onClick={() => reload()} className="text-body-md font-bold text-primary">Refresh</button>
      </div>

      <div className="mt-6 space-y-3">
        {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[20px]" />)}
        {error && <p className="text-body-md text-ink-muted">{error}</p>}
        {items && items.length === 0 && (
          <div className="rounded-[20px] border border-border bg-warm-white p-8 text-center">
            <Icon name="notifications_active" className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-extrabold text-ink">All caught up</p>
            <p className="mt-1 text-body-md text-ink-muted">Requests, payments and reminders will show here.</p>
          </div>
        )}
        {items?.map((n: Notification) => {
          const inner = (
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name={KIND_ICON[n.kind] ?? "notifications_active"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-ink">{n.title}</span>
                {n.body && <span className="block text-body-sm text-ink-muted">{n.body}</span>}
              </span>
              {!n.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
            </div>
          );
          return n.href ? (
            <Link key={n.id} href={n.href} className="block rounded-[20px] border border-border bg-warm-white p-4 shadow-card hover:-translate-y-0.5 transition-transform">
              {inner}
            </Link>
          ) : (
            <div key={n.id} className="rounded-[20px] border border-border bg-warm-white p-4 shadow-card">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
