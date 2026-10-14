import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { RecommendationItem } from "@/lib/types";
import { formatDateTime, formatNaira, initials } from "@/lib/format";


interface Reason {
  icon: string;
  color: string;
  title: string;
  desc: string;
}

export function MatchBreakdown({ item }: { item: RecommendationItem; weights?: Record<string, number> }) {
  const reasons: Reason[] = [
    {
      icon: "info",
      color: "text-accent",
      title: "Why this doctor is listed",
      desc: item.explanation || "The available profile information did not produce a clear symptom match. Review the specialty before choosing.",
    },
    {
      icon: "medical_services",
      color: "text-primary",
      title: "Specialty",
      desc: item.specialization || "Specialty not provided",
    },
    {
      icon: "event_available",
      color: "text-primary",
      title: "Next appointment",
      desc: item.next_available_at ? formatDateTime(item.next_available_at) : "No open appointment time is currently listed.",
    },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      {/* Doctor hero */}
      <div className="flex w-full flex-col items-center gap-3 rounded-[24px] border border-border bg-warm-white p-6 text-center md:w-[360px] md:shrink-0">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-4 font-extrabold text-on-primary">
          <Icon name="star" fill className="text-[16px]" /> Top profile match
        </span>
        <span className="grid h-28 w-28 place-items-center rounded-full bg-accent-soft text-display-lg font-extrabold text-accent">
          {initials(item.doctor_name)}
        </span>
        <div>
          <h3 className="text-headline-md font-extrabold text-ink">{item.doctor_name}</h3>
          <p className="text-body-md text-ink-muted">{item.specialization} · {item.years_experience} years</p>
          <p className="text-caption text-ink-muted">{item.payment_required ? `Consultation fee: ${formatNaira(item.consultation_fee)}` : "Platform payments are currently off; accepted visits are free."}</p>
          {item.rating_count ? (
            <p className="mt-1 text-caption text-ink-muted">{item.average_rating.toFixed(1)} / 5 from {item.rating_count} ratings</p>
          ) : (
            <p className="mt-1 text-caption text-ink-muted">No patient ratings yet</p>
          )}
        </div>
        <Link
          href={`/find-care/appointments/${item.doctor_id}`}
          className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary transition-colors hover:bg-primary-container"
        >
          Book this doctor <Icon name="arrow_forward" />
        </Link>
      </div>

      {/* Plain reasons */}
      <div className="flex w-full flex-col gap-3">
        {reasons.map((r) => (
          <div key={r.title} className="flex items-center gap-4 rounded-[18px] border border-border bg-warm-white p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft">
              <Icon name={r.icon} className={`text-[26px] ${r.color}`} />
            </span>
            <div>
              <h4 className="font-extrabold text-ink">{r.title}</h4>
              <p className="text-body-md text-ink-muted">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
