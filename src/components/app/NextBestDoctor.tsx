"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatResponseTime } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Shown when a doctor declines or lets a request lapse.
 *
 * The ranked list was already persisted when we made the original recommendation,
 * so there is nothing to re-score and no intake to redo — we simply walk to the
 * next name the model chose. A rejection becomes the system working *for* them.
 */
export function NextBestDoctor({
  consultationId,
  onRequested,
}: {
  consultationId: number;
  onRequested: () => void;
}) {
  const { data: next, loading } = useApi(
    () => api.consultations.nextBest(consultationId),
    [consultationId],
  );
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

  if (loading) return <Skeleton className="mt-4 h-32 w-full rounded-xl" />;

  // The list is exhausted — don't dead-end them, send them back to their matches.
  if (!next) {
    return (
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low px-5 py-4">
        <p className="text-body-md text-on-surface-variant">
          No other matches have open slots right now.
        </p>
        <Link href="/recommendations">
          <Button variant="outline">See all matches</Button>
        </Link>
      </div>
    );
  }

  const responseHint = formatResponseTime(next.avg_response_minutes);

  return (
    <div className="mt-4 rounded-xl border border-secondary-container bg-surface-container-low p-5">
      <p className="mb-4 flex items-center gap-2 text-label-md uppercase tracking-wider text-secondary">
        <Icon name="auto_awesome" fill className="text-[18px]" />
        Your next best match
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={next.doctor_name} size={56} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-lg font-semibold text-on-surface">{next.doctor_name}</p>
            <StatusBadge tone="tertiary">
              #{next.rank} · {Math.round(next.score * 100)}% match
            </StatusBadge>
          </div>

          <p className="mt-0.5 text-body-md text-on-surface-variant">
            {next.specialization} · {next.years_experience} years experience
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <Icon name="star" fill className="text-[16px] text-warning" />
              {next.average_rating.toFixed(1)}
            </span>
            {responseHint && (
              <span className="inline-flex items-center gap-1">
                <Icon name="bolt" className="text-[16px]" />
                {responseHint}
              </span>
            )}
            {next.acceptance_rate != null && next.acceptance_rate > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="check" className="text-[16px]" />
                accepts {Math.round(next.acceptance_rate * 100)}%
              </span>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="event_available" className="text-base" />
            Next open slot — {formatDateTime(next.next_slot_start)}
            {next.next_slot_mode === "video" ? " · Video" : " · In-person"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="primary" loading={requesting} onClick={handleRequest}>
            Request {next.doctor_name.split(" ").slice(0, 2).join(" ")}
          </Button>
          <Link href="/recommendations">
            <Button variant="outline">See all matches</Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}
