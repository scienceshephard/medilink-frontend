"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { RecommendationItem } from "@/lib/types";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

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
        <Icon name="verified" fill className="text-[16px]" /> Best match for you
      </span>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-headline-lg font-extrabold text-accent">
          {initials(item.doctor_name)}
        </span>
        <div>
          <h3 className="text-headline-md font-extrabold text-ink">{item.doctor_name}</h3>
          <p className="text-body-md text-ink-muted">
            {item.specialization} · {item.years_experience} years
          </p>
          <div className="mt-1 flex justify-center">
            <Stars n={item.average_rating} />
          </div>
        </div>
      </div>

      {item.explanation && (
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4">
          <Icon name="info" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-body-md text-ink">{item.explanation}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/doctors/${item.doctor_id}/book`}
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
          <div className="mt-1">
            <Stars n={item.average_rating} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 font-bold text-accent">
          <Icon name="check_circle" className="text-[18px]" /> Free today
        </span>
        <Link href={`/match/${item.doctor_id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-extrabold text-on-primary">
          See why <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </div>
  );
}
