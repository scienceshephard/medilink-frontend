"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DoctorDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data: d, loading, error } = useApi(() => api.doctors.get(id), [id]);

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-[820px] rounded-[24px]" />;
  if (error || !d) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error ?? "Doctor not found."}</p>;

  const full = Math.round(d.average_rating);

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-border bg-warm-white p-6 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-headline-lg font-extrabold text-accent">
          {initials(d.full_name)}
        </span>
        <div>
          <h1 className="text-headline-md font-extrabold text-ink">{d.full_name}</h1>
          <p className="text-body-md text-ink-muted">{d.years_experience}+ years{d.location ? ` · ${d.location}` : ""}</p>
          <span className="mt-1 flex justify-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="star" fill className={i < full ? "text-[20px] text-face-same" : "text-[20px] text-border"} />
            ))}
          </span>
        </div>
        {d.languages?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {d.languages.map((l) => (
              <span key={l} className="rounded-full bg-primary-soft px-3 py-1 text-caption font-bold text-primary">{l}</span>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-[20px] border border-border bg-warm-white p-5">
        <h2 className="mb-2 font-extrabold text-ink">About</h2>
        <p className="text-body-md leading-relaxed text-ink-muted">
          {d.bio || "This doctor has not written about themselves yet."}
        </p>
      </section>

      <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 font-extrabold text-accent">
          <Icon name="check_circle" fill /> Free today
        </span>
        <Link
          href={`/doctors/${d.id}/book`}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 font-extrabold text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="calendar_month" /> Book a visit
        </Link>
      </div>
    </div>
  );
}
