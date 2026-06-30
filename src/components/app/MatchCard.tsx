"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ScoreBar } from "@/components/ui/ScoreBar";
import type { RecommendationItem } from "@/lib/types";

// ── Hero card (top match) ────────────────────────────────────────────────────

export function HeroMatchCard({ item }: { item: RecommendationItem }) {
  const pct = Math.round(item.score * 100);
  const lastName = item.doctor_name.replace(/^Dr\.?\s+/i, "").split(" ").at(-1) ?? item.doctor_name;

  return (
    <div className="relative overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-card">
      {/* Decorative blobs */}
      <div className="absolute -mr-20 -mt-20 right-0 top-0 h-64 w-64 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="absolute -mb-10 -ml-10 bottom-0 left-0 h-48 w-48 rounded-full bg-secondary-container/20 blur-2xl" />

      <div className="relative z-10 grid grid-cols-1 gap-gutter p-md md:grid-cols-12 md:p-lg md:items-center">
        {/* Avatar + match % badge */}
        <div className="relative flex flex-col items-center md:col-span-4 md:items-start">
          <Avatar name={item.doctor_name} size={160} />
          <div className="absolute -top-3 flex items-center gap-1 rounded-full bg-tertiary px-4 py-2 font-semibold text-on-tertiary shadow-md text-label-md md:top-auto md:-bottom-3">
            <Icon name="stars" fill className="text-[16px]" />
            {pct}% Match
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col items-center text-center md:col-span-8 md:items-start md:text-left">
          {/* Name + verified */}
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-headline-md font-bold text-on-surface">{item.doctor_name}</h3>
            <Icon name="verified" fill className="text-primary" />
          </div>

          <p className="mb-4 text-body-md text-secondary font-medium">
            {item.specialization} &bull; {item.years_experience}+ Yrs Exp
          </p>

          {/* Explanation callout */}
          <div className="mb-6 flex w-full items-start gap-3 rounded-lg border border-surface-variant bg-surface-container-low p-4">
            <Icon name="info" className="mt-1 shrink-0 text-tertiary" />
            <p className="text-body-md text-on-surface-variant">
              <span className="font-semibold text-on-surface">Why {lastName}&apos;s a top match:</span>{" "}
              {item.explanation}
            </p>
          </div>

          {/* Highlights row */}
          <div className="mb-6 flex flex-wrap justify-center gap-2 md:justify-start">
            {item.is_available && (
              <span className="flex items-center gap-1 rounded-full bg-primary-container/20 px-3 py-1 text-caption font-caption text-on-primary-container">
                <Icon name="timer" className="text-[16px]" />
                Available Now
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-surface-variant px-3 py-1 text-caption font-caption text-on-surface">
              <Icon name="star" fill className="text-[16px]" />
              {item.average_rating.toFixed(1)} rating
            </span>
            <span className="flex items-center gap-1 rounded-full bg-surface-variant px-3 py-1 text-caption font-caption text-on-surface">
              <Icon name="workspace_premium" className="text-[16px]" />
              {item.years_experience} yrs experience
            </span>
          </div>

          {/* CTAs */}
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:w-auto">
            <Link href={`/doctors/${item.doctor_id}/book`}>
              <Button size="lg" full>
                <Icon name="calendar_month" />
                Book Appointment
              </Button>
            </Link>
            <Link href={`/doctors/${item.doctor_id}`}>
              <Button variant="outline" size="lg">
                View Profile
              </Button>
            </Link>
          </div>

          {/* Why this match link */}
          <Link
            href={`/match/${item.doctor_id}`}
            className="mt-4 inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            <Icon name="troubleshoot" className="text-[18px]" />
            Understanding your match
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Compact card (secondary matches) ────────────────────────────────────────

export function CompactMatchCard({ item }: { item: RecommendationItem }) {
  const pct = Math.round(item.score * 100);

  return (
    <Card hover className="flex flex-col gap-4 cursor-pointer hover:border-primary/30 transition-colors">
      {/* Top row */}
      <div className="flex items-start gap-4">
        <Avatar name={item.doctor_name} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-label-md font-semibold text-on-surface truncate">{item.doctor_name}</h3>
              <p className="text-caption text-secondary">{item.specialization}</p>
            </div>
            <div className="min-w-[48px] rounded-lg bg-surface-container p-1 text-center shrink-0">
              <span className="block text-label-md font-bold text-on-surface">{pct}%</span>
              <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Match</span>
            </div>
          </div>

          {/* Animated match bar */}
          <ScoreBar value={item.score} className="mt-2" />

          {/* Meta */}
          <div className="mt-2 flex items-center gap-3 text-caption text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Icon name="star" fill className="text-[14px]" />
              {item.average_rating.toFixed(1)}
            </span>
            {item.is_available && (
              <span className="flex items-center gap-1">
                <Icon name="check_circle" fill className="text-[14px] text-secondary" />
                Available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* "See Details" → match detail page */}
      <Link href={`/match/${item.doctor_id}`} className="block">
        <button className="min-h-[44px] w-full rounded-full border border-outline-variant bg-surface-container-low py-3 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-variant flex items-center justify-center gap-2">
          See Details
          <Icon name="arrow_forward" className="text-[16px]" />
        </button>
      </Link>
    </Card>
  );
}
