import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { RingScore } from "@/components/ui/RingScore";
import type { RecommendationItem } from "@/lib/types";

interface MatchBreakdownProps {
  item: RecommendationItem;
  weights: Record<string, number>;
}

function BreakdownRow({
  iconName,
  iconBg,
  iconColor,
  title,
  description,
}: {
  iconName: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon name={iconName} className={`text-[22px] ${iconColor}`} />
      </div>
      <div>
        <h4 className="text-label-md font-semibold text-on-surface mb-xs">{title}</h4>
        <p className="text-body-md text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

export function MatchBreakdown({ item }: MatchBreakdownProps) {
  const lastName = item.doctor_name.replace(/^Dr\.?\s+/i, "").split(" ").at(-1) ?? item.doctor_name;

  // CBF signal: symptom/specialization alignment
  const symptomDesc = `Dr. ${lastName} specializes in ${item.specialization}, matching your reported symptoms.`;

  // Feature signal: urgency & availability
  const availabilityDesc = item.is_available
    ? `Dr. ${lastName} is currently available and can see you soon — fitting your urgency well.`
    : `With ${item.years_experience} years of clinical experience in ${item.specialization}, Dr. ${lastName} is well-suited to your care needs.`;

  // CF signal: communication & track record
  const trackRecordDesc =
    item.average_rating >= 4
      ? `Highly rated ${item.average_rating.toFixed(1)}/5 across ${item.years_experience} years of practice — patients consistently praise their communication style.`
      : `${item.years_experience} years of clinical experience treating patients with similar needs.`;

  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
      {/* Left column: ring + doctor card */}
      <div className="flex flex-col gap-gutter md:col-span-5">
        {/* Score ring card */}
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-md text-center shadow-card flex flex-col items-center">
          {/* Accent bar at top */}
          <div className="absolute top-0 left-0 h-2 w-full bg-secondary-container rounded-t-2xl" />
          <div className="mt-4">
            <RingScore value={item.score} size={160} />
          </div>
          <h3 className="mt-md text-headline-md font-semibold text-on-surface">
            {item.specialization} Match
          </h3>
          <p className="mt-xs text-body-md text-on-surface-variant max-w-xs">
            High confidence based on your reported symptoms and Dr. {lastName}&apos;s clinical
            success rate.
          </p>
        </div>

        {/* Doctor profile card */}
        <div className="flex items-center gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-card">
          <Avatar name={item.doctor_name} size={80} />
          <div>
            <h4 className="text-label-md font-semibold text-on-surface">{item.doctor_name}</h4>
            <p className="mt-xs text-caption text-on-surface-variant">
              {item.specialization} &bull; {item.years_experience} yrs experience
            </p>
            <div className="mt-sm flex items-center gap-xs">
              <Icon name="star" fill className="text-secondary text-[16px]" />
              <span className="text-caption font-bold text-on-surface">
                {item.average_rating.toFixed(1)}
              </span>
              <span className="text-caption text-on-surface-variant">patient rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: breakdown + explanation + next steps */}
      <div className="flex flex-col gap-gutter md:col-span-7">
        {/* AI explanation from backend */}
        <div className="rounded-2xl border border-secondary-container bg-surface-container-lowest p-md shadow-card">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="neurology" className="text-secondary text-[22px]" />
            <h3 className="text-headline-md font-semibold text-on-surface">AI Recommendation</h3>
          </div>
          <p className="text-body-md text-on-surface-variant">{item.explanation}</p>
        </div>

        {/* Three-signal breakdown */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-md shadow-card">
          <h3 className="mb-md flex items-center gap-sm text-headline-md font-semibold text-on-surface">
            <Icon name="troubleshoot" className="text-primary text-[22px]" />
            Match Breakdown
          </h3>

          <div className="space-y-md">
            {/* CBF signal */}
            <BreakdownRow
              iconName="neurology"
              iconBg="bg-primary-fixed"
              iconColor="text-on-primary-fixed"
              title="Symptom Alignment"
              description={symptomDesc}
            />

            <hr className="border-outline-variant opacity-50" />

            {/* Feature signal */}
            <BreakdownRow
              iconName="schedule"
              iconBg="bg-tertiary-fixed"
              iconColor="text-on-tertiary-fixed"
              title="Urgency & Availability"
              description={availabilityDesc}
            />

            <hr className="border-outline-variant opacity-50" />

            {/* CF signal */}
            <BreakdownRow
              iconName="forum"
              iconBg="bg-secondary-fixed"
              iconColor="text-on-secondary-fixed"
              title="Communication & Track Record"
              description={trackRecordDesc}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
