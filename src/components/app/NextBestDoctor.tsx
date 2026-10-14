"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, initials } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";


export function NextBestDoctor({ consultationId, onRequested }: { consultationId: number; onRequested: () => void }) {
  const { data: next, loading } = useApi(() => api.consultations.nextBest(consultationId), [consultationId]);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    if (!next) return;
    setRequesting(true);
    setError(null);
    try {
      await api.consultations.book({
        doctor_id: next.doctor_id,
        slot_id: next.next_slot_id,
        symptom_input: next.symptom_input,
        recommendation_id: next.recommendation_id,
        recommendation_rank: next.rank,
      });
      onRequested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the request.");
      setRequesting(false);
    }
  }

  if (loading) return <Skeleton className="mt-3 h-28 w-full rounded-2xl" />;

  if (!next) {
    return (
      <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-sand px-5 py-4">
        <p className="text-body-md text-ink-muted">No other doctors have free times now.</p>
        <Link href="/find-care/recommendations" className="font-extrabold text-primary">See all</Link>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
      <p className="flex items-center gap-2 text-caption font-extrabold uppercase tracking-wide text-accent">
        <Icon name="stars" fill className="text-[16px]" /> Your next best match
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-warm-white font-extrabold text-accent">{initials(next.doctor_name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">{next.doctor_name}</p>
          <p className="text-body-md text-ink-muted">{next.specialization} · {next.years_experience} years</p>
          <p className="mt-0.5 flex items-center gap-1 text-caption text-ink-muted">
            <Icon name="event_available" className="text-[16px]" /> Next: {formatDateTime(next.next_slot_start)}
          </p>
        </div>
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-extrabold text-on-primary disabled:opacity-50"
        >
          {requesting ? "Sending…" : `Ask ${next.doctor_name.split(" ").slice(0, 2).join(" ")}`}
        </button>
      </div>
      {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
    </div>
  );
}
