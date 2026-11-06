"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Conversation } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesPage() {
  const { role } = useAuth();
  const { data: convos, loading, error } = useApi(() => api.messages.conversations(), []);

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Messages</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        {role === "doctor" ? "Conversations with your patients." : "Conversations with your clinicians."}
      </p>

      <div className="mt-6 space-y-3">
        {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[20px]" />)}
        {error && <p className="text-body-md text-ink-muted">{error}</p>}
        {convos && convos.length === 0 && (
          <div className="rounded-[20px] border border-border bg-warm-white p-8 text-center">
            <Icon name="inbox" className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-extrabold text-ink">No conversations yet</p>
            <p className="mt-1 text-body-md text-ink-muted">
              {role === "doctor"
                ? "When a patient messages you it shows up here."
                : "Once you have a visit, you can message your clinician here."}
            </p>
          </div>
        )}
        {convos?.map((c: Conversation) => (
          <Link
            key={`${c.patient_id}-${c.doctor_id}`}
            href={`/messages/thread?patient_id=${c.patient_id}&doctor_id=${c.doctor_id}&name=${encodeURIComponent(c.partner_name)}`}
            className="flex items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Icon name={c.partner_role === "doctor" ? "medical_services" : "person"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold text-ink">{c.partner_name}</span>
              <span className="block truncate text-body-sm text-ink-muted">{c.last_message}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-ink-muted">{timeAgo(c.last_at)}</span>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-extrabold text-on-primary">
                  {c.unread}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
