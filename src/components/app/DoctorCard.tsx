"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNaira } from "@/lib/format";
import type { DoctorPublicOut } from "@/lib/types";

export function DoctorCard({ doctor }: { doctor: DoctorPublicOut }) {
  return (
    <Card
      hover
      className="flex flex-col gap-4 p-6 hover:border-primary/30 transition-colors"
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <Avatar name={doctor.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-label-md font-semibold text-on-surface">
            {doctor.full_name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-caption text-on-surface-variant">
            <Icon name="location_on" className="shrink-0 text-[14px] text-secondary" />
            <span className="truncate">{doctor.location || "Location not set"}</span>
          </p>
        </div>
      </div>

      {/* Bio excerpt */}
      {doctor.bio && (
        <p className="line-clamp-2 text-caption text-on-surface-variant leading-relaxed">
          {doctor.bio}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="star" fill className="text-[14px] text-tertiary" />
          <span className="font-semibold text-on-surface">
            {doctor.average_rating.toFixed(1)}
          </span>
          <span>/5</span>
        </span>
        <span className="h-3.5 w-px bg-outline-variant" />
        <span className="flex items-center gap-1">
          <Icon name="work_history" className="text-[14px]" />
          {doctor.years_experience} yrs
        </span>
        <span className="h-3.5 w-px bg-outline-variant" />
        <span className="flex items-center gap-1">
          <Icon name="groups" className="text-[14px]" />
          {doctor.total_consultations} consults
        </span>
      </div>

      {/* Footer: fee + CTA */}
      <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
        <span className="flex items-center gap-1 text-label-md font-semibold text-on-surface">
          <Icon name="payments" className="text-[16px] text-secondary" />
          {formatNaira(doctor.consultation_fee)}
        </span>
        <Link
          href={`/doctors/${doctor.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-caption font-semibold text-on-surface transition-colors hover:bg-primary hover:border-primary hover:text-on-primary"
        >
          View Profile
          <Icon name="arrow_forward" className="text-[14px]" />
        </Link>
      </div>
    </Card>
  );
}
