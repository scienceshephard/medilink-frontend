import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { RecommendationItem } from "@/lib/types";

function initials(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

interface Reason {
  icon: string;
  color: string;
  title: string;
  desc: string;
}

export function MatchBreakdown({ item }: { item: RecommendationItem; weights?: Record<string, number> }) {
  const last = item.doctor_name.replace(/^Dr\.?\s+/i, "").split(" ").at(-1) ?? item.doctor_name;
  const full = Math.round(item.average_rating);

  const reasons: Reason[] = [
    {
      icon: "verified",
      color: "text-accent",
      title: "Right for your problem",
      desc: `Dr. ${last} treats ${item.specialization.toLowerCase()} problems like the ones you told us about.`,
    },
    {
      icon: "sentiment_very_satisfied",
      color: "text-face-better",
      title: "Patients get better",
      desc:
        item.average_rating >= 4
          ? `Rated ${item.average_rating.toFixed(1)} out of 5 — patients feel better after seeing Dr. ${last}.`
          : `${item.years_experience} years helping patients with problems like yours.`,
    },
    {
      icon: "bolt",
      color: "text-primary",
      title: "Easy to reach",
      desc: item.is_available
        ? `Free today and ready to see you soon. ${item.years_experience} years of experience.`
        : `${item.years_experience} years of experience in ${item.specialization}.`,
    },
  ];

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start">
      {/* Doctor hero */}
      <div className="flex w-full flex-col items-center gap-3 rounded-[24px] border border-border bg-warm-white p-6 text-center md:w-[360px] md:shrink-0">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-4 font-extrabold text-on-primary">
          <Icon name="star" fill className="text-[16px]" /> Best match for you
        </span>
        <span className="grid h-28 w-28 place-items-center rounded-full bg-accent-soft text-display-lg font-extrabold text-accent">
          {initials(item.doctor_name)}
        </span>
        <div>
          <h3 className="text-headline-md font-extrabold text-ink">{item.doctor_name}</h3>
          <p className="text-body-md text-ink-muted">{item.specialization} · {item.years_experience} years</p>
          <span className="mt-1 flex justify-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="star" fill className={i < full ? "text-[20px] text-face-same" : "text-[20px] text-border"} />
            ))}
          </span>
        </div>
        <Link
          href={`/doctors/${item.doctor_id}/book`}
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
