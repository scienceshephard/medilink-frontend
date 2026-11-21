"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDateTime, formatNaira, initials } from "@/lib/format";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/app/PageHeader";


export default function DoctorDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data: d, loading, error } = useApi(() => api.doctors.get(id), [id]);

  if (loading) return <Skeleton className="h-96 w-full rounded-[24px]" />;
  if (error || !d) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error ?? "Doctor not found."}</p>;

  const card = "rounded-[20px] border border-border bg-warm-white p-4 md:p-5";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <PageHeader back title="Doctor profile" />
      {d.is_demo && <p className="rounded-xl bg-amber-soft px-4 py-2 text-[12px] font-extrabold uppercase tracking-wide text-[#8A5A12]">Demo profile · sample data</p>}

      <div className={cn(card, "flex flex-col items-center gap-2 py-6 text-center")}>
        <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-[26px] font-extrabold text-accent">{initials(d.full_name)}</span>
        <h2 className="mt-1 text-[22px] font-extrabold text-ink">{d.full_name}</h2>
        <p className="text-[14px] text-ink-muted">{d.specialization_names?.join(" · ") || "Specialty not provided"} · {d.years_experience}+ years</p>
        {d.location && <p className="flex items-center gap-1 text-[14px] text-ink-muted"><Icon name="location_on" className="text-[16px]" />{d.location}</p>}
        <p className="text-[13px] text-ink-muted">{d.rating_count ? `${d.average_rating.toFixed(1)} / 5 from ${d.rating_count} ratings` : "No patient ratings yet"}</p>
      </div>

      {d.languages?.length > 0 && (
        <section className={card}>
          <h2 className="mb-2 text-[16px] font-extrabold text-ink">Languages</h2>
          <div className="flex flex-wrap gap-2">
            {d.languages.map((l) => <span key={l} className="rounded-full bg-primary-soft px-3 py-1 text-[13px] font-bold text-primary">{l}</span>)}
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-1 text-[16px] font-extrabold text-ink">About</h2>
        <p className="text-[15px] leading-6 text-ink-muted">{d.bio || "This doctor has not written about themselves yet."}</p>
      </section>

      <section className={cn(card, "flex flex-col gap-3")}>
        <div>
          <h2 className="text-[16px] font-extrabold text-ink">{d.next_available_at ? `Next time: ${formatDateTime(d.next_available_at)}` : "No open times listed"}</h2>
          <p className="text-[14px] text-ink-muted">
            {d.next_available_at ? (d.payment_required ? `Fee: ${formatNaira(d.consultation_fee)} — you pay only after the doctor says yes.` : "Free — the doctor confirms before it's final.") : "Check back later or choose another doctor."}
          </p>
        </div>
        <Link href={`/find-care/appointments/${d.id}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 font-extrabold text-on-primary transition-colors hover:bg-primary-container md:w-auto md:self-start">
          Book a visit
        </Link>
      </section>
    </div>
  );
}
