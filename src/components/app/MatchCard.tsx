"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { RecommendationItem } from "@/lib/types";
import { formatDateTime, formatNaira, initials } from "@/lib/format";


function Stars({ n }: { n: number }) {
  const full = Math.round(n);
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" fill className={i < full ? "text-[18px] text-face-same" : "text-[18px] text-border"} />
      ))}
    </span>
  );
}

// ── Hero (top match) ──────────────────────────────────────────────────────────
export function HeroMatchCard({ item }: { item: RecommendationItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border-2 border-primary bg-warm-white p-6">
      <span className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-accent px-4 font-extrabold text-on-primary">
        <Icon name="star" fill className="text-[16px]" /> Top symptom match
      </span>
      {item.is_demo && <p className="rounded-xl bg-sand px-4 py-2 text-center text-caption font-bold text-ink">Demo profile — sample data, not a credential-verified real clinician</p>}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-headline-lg font-extrabold text-accent">
          {initials(item.doctor_name)}
        </span>
        <div>
          <h3 className="text-headline-md font-extrabold text-ink">{item.doctor_name}</h3>
          <p className="text-body-md text-ink-muted">
            {item.specialization} · {item.years_experience} years
          </p>
          {item.is_demo && <p className="mt-1 text-caption font-bold text-ink-muted">Demo profile · sample data</p>}
          <div className="mt-1 flex justify-center">
            {item.rating_count ? <><Stars n={item.average_rating} /><span className="ml-1 text-caption text-ink-muted">{item.average_rating.toFixed(1)} · {item.rating_count} ratings</span></> : <span className="text-caption text-ink-muted">No patient ratings yet</span>}
          </div>
        </div>
      </div>

      <p className="text-center text-caption text-ink-muted">A ranking to help you choose a clinician, not a diagnosis.</p>
      {item.explanation && (
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4">
          <Icon name="info" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-body-md text-ink">{item.explanation}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/find-care/appointments/${item.doctor_id}`}
          className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="calendar_month" /> Book this doctor
        </Link>
        <Link
          href={`/match/${item.doctor_id}`}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-border px-6 font-extrabold text-ink"
        >
          See why
        </Link>
      </div>
    </div>
  );
}

// ── Compact (other matches) ───────────────────────────────────────────────────
export function CompactMatchCard({ item }: { item: RecommendationItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-body-lg font-extrabold text-accent">
          {initials(item.doctor_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-extrabold text-ink">{item.doctor_name}</h3>
          <p className="text-caption text-ink-muted">{item.specialization}</p>
          {item.is_demo && <p className="text-caption font-bold text-ink-muted">Demo profile · sample data</p>}
          <div className="mt-1">
            {item.rating_count ? <><Stars n={item.average_rating} /><span className="ml-1 text-caption text-ink-muted">{item.average_rating.toFixed(1)} · {item.rating_count} ratings</span></> : <span className="text-caption text-ink-muted">No patient ratings yet</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="flex flex-wrap items-center gap-1.5 text-caption font-bold text-ink-muted">
          <Icon name="event_available" className="text-[18px]" />
          {item.next_available_at ? `Next time: ${formatDateTime(item.next_available_at)}` : "No open times listed"}
        </span>
        <span className="text-caption font-bold text-ink-muted">{item.payment_required ? `Fee ${formatNaira(item.consultation_fee)}` : "No fee while payments are off"}</span>
        <Link href={`/match/${item.doctor_id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-extrabold text-on-primary">
          See why <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </div>
  );
}
