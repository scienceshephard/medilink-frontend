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
    <article className="overflow-hidden rounded-[24px] border border-[#D7E1DB] bg-white">
      <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-5 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-[#286653]"><Icon name="looks_one" className="text-[16px]" /> Your closest clinical match</span>
          {item.is_demo && <p className="mt-3 rounded-lg bg-[#F5F4EF] px-3 py-2 text-[11px] font-semibold text-[#65756F]">Sample profile — not a verified real clinician</p>}
          <div className="mt-5 flex items-start gap-4">
            <span className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-full bg-[#EAF3EE] font-serif text-[24px] text-[#286653]">{initials(item.doctor_name)}</span>
            <div className="min-w-0"><h2 className="font-serif text-[30px] leading-tight tracking-[-.03em] text-[#19352E]">{item.doctor_name}</h2><p className="mt-1 text-[14px] text-[#65756F]">{item.specialization}{item.years_experience ? ` · ${item.years_experience} years’ experience` : ""}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#65756F]"><Icon name="location_on" className="text-[17px] text-[#286653]" />{item.distance_km != null ? `Approximately ${item.distance_km} km away` : item.location_match ? "Practices in your area" : item.location ? `Based in ${item.location}` : "Location not listed"}</p>
              <div className="mt-2 flex items-center gap-1.5">{item.rating_count ? <><Stars n={item.average_rating} /><span className="text-[11px] text-[#65756F]">{item.average_rating.toFixed(1)} · {item.rating_count} reviews</span></> : <span className="text-[11px] text-[#65756F]">New to MediLink</span>}</div>
            </div>
          </div>
          <div className="mt-5 border-t border-[#E4E9E5] pt-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#65756F]">Why we suggested this clinician</p><p className="mt-1.5 text-[13px] leading-6 text-[#3B5A50]">{item.explanation || "Their clinical area may fit the concern you shared. A clinician will assess your needs directly."}</p></div>
          <p className="mt-3 text-[10px] text-[#8B9691]">This is a clinician-finding aid, not a diagnosis.</p>
        </div>
        <div className="flex flex-col justify-end gap-3 bg-[#F2F5F2] p-5 sm:p-6">
          <p className="mb-auto text-[12px] leading-5 text-[#65756F]">You can choose how you would like to meet. The clinician will confirm your request.</p>
          <Link href={`/find-care/appointments/${item.doctor_id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#286653] px-5 text-[13px] font-bold text-white hover:bg-[#1F5544]"><Icon name="calendar_month" />View available visits</Link>
          <Link href={`/match/${item.doctor_id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D7E1DB] bg-white px-5 text-[13px] font-bold text-[#286653]">View clinician profile <Icon name="arrow_forward" className="text-[17px]" /></Link>
        </div>
      </div>
    </article>
  );
}

// ── Compact (other matches) ───────────────────────────────────────────────────
export function CompactMatchCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="flex flex-col gap-4 rounded-[18px] border border-[#E4E9E5] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#EAF3EE] font-serif text-[17px] text-[#286653]">
          {initials(item.doctor_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-[21px] leading-tight text-[#19352E]">{item.doctor_name}</h3>
          <p className="mt-1 text-[12px] text-[#65756F]">{item.specialization}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-[#65756F]"><Icon name="location_on" className="text-[15px]" />{item.distance_km != null ? `Approximately ${item.distance_km} km away` : item.location_match ? "Practices in your area" : item.location || "Location not listed"}</p>
          {item.is_demo && <p className="mt-1 text-[10px] font-bold text-[#65756F]">Sample profile</p>}
          <div className="mt-1">{item.rating_count ? <span className="inline-flex items-center gap-1"><Stars n={item.average_rating} /><span className="text-[10px] text-[#65756F]">{item.average_rating.toFixed(1)} · {item.rating_count}</span></span> : <span className="text-[10px] text-[#65756F]">New to MediLink</span>}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end sm:border-l sm:border-[#E4E9E5] sm:pl-4">
        <span className="mr-auto flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#65756F] sm:mr-0">
          <Icon name="event_available" className="text-[18px]" />
          {item.next_available_at ? `Next visit: ${formatDateTime(item.next_available_at)}` : "Ask about available times"}
        </span>
        <span className="text-[11px] font-semibold text-[#65756F]">{item.payment_required ? formatNaira(item.consultation_fee) : "Fee details on request"}</span>
        <Link href={`/find-care/appointments/${item.doctor_id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#286653] px-4 text-[12px] font-bold text-white">
          View visits <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </article>
  );
}
