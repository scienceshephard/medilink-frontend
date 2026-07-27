"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { DoctorPublicOut } from "@/lib/types";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function DoctorCard({ doctor }: { doctor: DoctorPublicOut }) {
  const full = Math.round(doctor.average_rating);
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-body-lg font-extrabold text-accent">
          {initials(doctor.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-extrabold text-ink">{doctor.full_name}</h3>
          <p className="flex items-center gap-1 text-caption text-ink-muted">
            <Icon name="location_on" className="text-[14px] text-accent" />
            {doctor.location || "Nearby"}
          </p>
          <span className="mt-1 flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="star" fill className={i < full ? "text-[16px] text-face-same" : "text-[16px] text-border"} />
            ))}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-caption text-ink-muted">
        <span className="flex items-center gap-1">
          <Icon name="work_history" className="text-[15px]" /> {doctor.years_experience} yrs
        </span>
        <span className="h-3.5 w-px bg-border" />
        <span className="flex items-center gap-1">
          <Icon name="groups" className="text-[15px]" /> {doctor.total_consultations} visits
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="flex items-center gap-1.5 font-bold text-accent">
          <Icon name="check_circle" className="text-[18px]" /> Free today
        </span>
        <Link
          href={`/doctors/${doctor.id}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-extrabold text-on-primary"
        >
          See doctor <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </div>
  );
}
