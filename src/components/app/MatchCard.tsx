"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { RecommendationItem } from "@/lib/types";
import { formatDateTime, formatNaira, initials } from "@/lib/format";
import { cn } from "@/components/ui/cn";


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

function nextLabel(item: RecommendationItem): string {
  return item.next_available_at ? `Free · ${formatDateTime(item.next_available_at)}` : "Ask about times";
}

/** One doctor in the "Choose a doctor" list; the top match gets the terracotta border and badge. */
export function MatchCard({ item, best = false }: { item: RecommendationItem; best?: boolean }) {
  const where = item.distance_km != null ? `About ${item.distance_km} km away` : item.location_match ? "In your area" : item.location;
  return (
    <article className={cn("flex flex-col gap-3 rounded-[20px] bg-warm-white p-4", best ? "border-2 border-primary" : "border border-border")}>
      {best && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-extrabold text-accent">
          <Icon name="star" fill className="text-[14px]" /> Best for you
        </span>
      )}
      <Link href={`/match/${item.doctor_id}`} className="flex items-center gap-3 rounded-xl hover:opacity-85">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-[18px] font-extrabold text-accent">{initials(item.doctor_name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-extrabold text-ink">{item.doctor_name}</span>
          <span className="block truncate text-[14px] text-ink-muted">{item.specialization}{where ? ` · ${where}` : ""}</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <Stars n={item.rating_count ? item.average_rating : 0} />
            <span className="text-[12px] text-ink-muted">{item.rating_count ? `${item.average_rating.toFixed(1)} (${item.rating_count})` : "New"}</span>
          </span>
        </span>
        <Icon name="chevron_right" className="text-[20px] text-ink-muted" />
      </Link>
      {item.is_demo && <p className="text-[12px] font-bold text-ink-muted">Sample profile — not a verified real clinician</p>}
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[14px] font-bold text-accent">
          <Icon name="check_circle" className="shrink-0 text-[18px]" />
          <span className="truncate">{nextLabel(item)}</span>
        </span>
        {item.payment_required && <span className="shrink-0 text-[13px] font-bold text-ink-muted">{formatNaira(item.consultation_fee)}</span>}
        <Link href={`/find-care/appointments/${item.doctor_id}`} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-[15px] font-extrabold text-on-primary transition hover:bg-primary-container">
          Choose <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </div>
    </article>
  );
}
