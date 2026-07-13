"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDateTime, parseServerDate, statusLabel, statusTone } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { RingScore } from "@/components/ui/RingScore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function activityIcon(type: string): string {
  switch (type) {
    case "symptom":
      return "vital_signs";
    case "booking":
      return "event_available";
    case "completed":
      return "task_alt";
    case "feedback":
      return "reviews";
    default:
      return "info";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const profile = useApi(() => api.patients.me(), []);
  const consults = useApi(() => api.patients.consultations(), []);
  const activity = useApi(() => api.patients.activity(), []);
  const recommendation = useApi(() => api.patients.latestRecommendation(), []);
  const doctors = useApi(() => api.doctors.list(), []);

  // Build id → name map from doctor list
  const doctorMap: Record<number, string> = {};
  if (doctors.data) {
    for (const d of doctors.data) {
      doctorMap[d.id] = d.full_name;
    }
  }

  // The next appointment that needs the patient's attention — not only confirmed
  // ones. An `accepted` appointment carries a 2h payment window, and this is the
  // screen the patient lands on: if the dashboard ignores it, that window lapses
  // silently. Rank by what is most urgent to act on, not by calendar date — a
  // payment due in two hours matters more than a confirmed visit next week.
  const urgency: Record<string, number> = { accepted: 0, requested: 1, scheduled: 2 };
  const active = (consults.data ?? [])
    .filter((c) => c.status in urgency)
    .sort(
      (a, b) =>
        urgency[a.status] - urgency[b.status] ||
        parseServerDate(a.scheduled_datetime).getTime() -
          parseServerDate(b.scheduled_datetime).getTime(),
    );
  const nextAppt = active[0] ?? null;

  const firstName = profile.data?.full_name.split(" ")[0] ?? "";
  const completionScore = profile.data?.profile_completion_score ?? 0;

  return (
    <>
      {/* Header */}
      <header className="mb-lg">
        {profile.loading ? (
          <Skeleton className="h-10 w-64 mb-2" />
        ) : (
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
        )}
        <p className="text-body-md text-on-surface-variant">
          Here is your health overview for today.
        </p>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-md">

        {/* ── Card 1: Health Profile (8 cols) ── */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-[24px] p-md soft-shadow border border-surface-container-high relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />

          <div className="flex justify-between items-start mb-md relative z-10">
            <div>
              <h2 className="text-headline-md text-on-surface flex items-center gap-sm">
                <Icon name="favorite" fill className="text-primary" />
                Health Profile
              </h2>
              <p className="text-caption text-on-surface-variant mt-xs">
                Your medical overview at a glance
              </p>
            </div>
            {profile.data && (
              <span className="bg-primary-container text-on-primary-container px-sm py-xs rounded-full text-label-md text-sm">
                {Math.round(completionScore * 100)}% Complete
              </span>
            )}
          </div>

          {profile.loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-sm">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : profile.error ? (
            <p className="text-error text-caption">{profile.error}</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-md relative z-10">
              {/* Ring score */}
              <div className="shrink-0">
                <RingScore value={completionScore} label="Profile" size={120} />
              </div>
              {/* Stat tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm flex-1 w-full">
                <div className="bg-surface-container-low p-sm rounded-lg flex flex-col justify-center items-center text-center">
                  <Icon name="monitor_heart" className="text-on-surface-variant mb-xs" />
                  <span className="text-label-md text-on-surface">
                    {profile.data?.chronic_conditions.length ?? 0}
                  </span>
                  <span className="text-caption text-on-surface-variant">Conditions</span>
                </div>
                <div className="bg-surface-container-low p-sm rounded-lg flex flex-col justify-center items-center text-center">
                  <Icon name="warning" className="text-on-surface-variant mb-xs" />
                  <span className="text-label-md text-on-surface">
                    {profile.data?.allergies.length ?? 0}
                  </span>
                  <span className="text-caption text-on-surface-variant">Allergies</span>
                </div>
                <div className="bg-surface-container-low p-sm rounded-lg flex flex-col justify-center items-center text-center">
                  <Icon name="medication" className="text-on-surface-variant mb-xs" />
                  <span className="text-label-md text-on-surface">
                    {profile.data?.current_medications.length ?? 0}
                  </span>
                  <span className="text-caption text-on-surface-variant">Medications</span>
                </div>
                <div className="bg-surface-container-low p-sm rounded-lg flex flex-col justify-center items-center text-center">
                  <Icon name="medical_services" className="text-on-surface-variant mb-xs" />
                  <span className="text-label-md text-on-surface">
                    {profile.data?.consultation_count ?? 0}
                  </span>
                  <span className="text-caption text-on-surface-variant">Consultations</span>
                </div>
              </div>
            </div>
          )}

          {profile.data && (
            <div className="mt-md pt-md border-t border-outline-variant/30 flex items-center justify-between relative z-10">
              <p className="text-body-md text-on-surface-variant max-w-xl">
                {completionScore < 1
                  ? "Complete your profile to get more accurate AI-powered doctor recommendations."
                  : "Your health profile is complete. Your recommendations are fully personalised."}
              </p>
              {completionScore < 1 && (
                <Link
                  href="/intake"
                  className="text-primary text-label-md flex items-center gap-xs hover:bg-primary-container/20 px-sm py-2 rounded-full transition-colors"
                >
                  Complete <Icon name="arrow_forward" className="text-sm" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Card 2: Next Appointment (4 cols) ── */}
        <div className="md:col-span-4 bg-primary text-on-primary rounded-[24px] p-md soft-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary via-surface-tint to-on-primary-fixed-variant opacity-80 z-0" />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex justify-between items-start mb-md">
              <h2 className="text-headline-md flex items-center gap-sm">
                <Icon name="event" />
                Next Appointment
              </h2>
            </div>

            {consults.loading || doctors.loading ? (
              <div className="mt-auto bg-on-primary/10 rounded-xl p-sm border border-on-primary/20">
                <Skeleton className="h-12 w-full mb-sm bg-on-primary/20" />
                <Skeleton className="h-6 w-3/4 bg-on-primary/20" />
              </div>
            ) : consults.error ? (
              <p className="text-on-primary/80 text-caption mt-auto">{consults.error}</p>
            ) : nextAppt ? (
              <div className="mt-auto bg-on-primary/10 rounded-xl p-sm backdrop-blur-sm border border-on-primary/20">
                <div className="flex items-center gap-sm mb-sm">
                  <Avatar
                    name={
                      nextAppt.doctor_id != null && doctorMap[nextAppt.doctor_id]
                        ? doctorMap[nextAppt.doctor_id]
                        : `Doctor ${nextAppt.doctor_id ?? ""}`
                    }
                    size={48}
                  />
                  <div>
                    <h3 className="text-label-md">
                      {nextAppt.doctor_id != null && doctorMap[nextAppt.doctor_id]
                        ? doctorMap[nextAppt.doctor_id]
                        : `Doctor #${nextAppt.doctor_id ?? "—"}`}
                    </h3>
                    <div className="mt-0.5">
                      <StatusBadge tone={statusTone(nextAppt.status)}>
                        {statusLabel(nextAppt.status)}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-sm mt-sm pt-sm border-t border-on-primary/20 text-on-primary/90 text-caption">
                  <span className="flex items-center gap-xs">
                    <Icon name="calendar_today" className="text-base" />
                    {formatDateTime(nextAppt.scheduled_datetime)}
                  </span>
                </div>

                {nextAppt.status === "accepted" && nextAppt.pay_by && (
                  <Link href="/appointments" className="mt-sm block">
                    <p className="flex items-center gap-xs rounded-lg bg-on-primary px-sm py-xs text-caption font-semibold text-primary">
                      <Icon name="payments" className="text-base" />
                      <span>
                        Accepted — pay within{" "}
                        <Countdown deadline={nextAppt.pay_by} onExpire={consults.reload} /> to
                        confirm
                      </span>
                      <Icon name="chevron_right" className="ml-auto text-base" />
                    </p>
                  </Link>
                )}

                {nextAppt.status === "requested" && nextAppt.respond_by && (
                  <p className="mt-sm flex items-center gap-xs rounded-lg bg-on-primary/15 px-sm py-xs text-caption text-on-primary">
                    <Icon name="hourglass_top" className="text-base" />
                    <span>
                      Awaiting the doctor —{" "}
                      <Countdown deadline={nextAppt.respond_by} onExpire={consults.reload} /> left
                      to respond
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-auto bg-on-primary/10 rounded-xl p-sm border border-on-primary/20 text-center">
                <Icon name="calendar_month" className="text-on-primary/70 mb-sm" />
                <p className="text-on-primary/90 text-label-md mb-sm">No upcoming appointments</p>
                <Link href="/intake">
                  <Button variant="secondary" className="text-primary bg-on-primary text-sm px-sm py-xs h-auto">
                    Check your symptoms
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Card 3: Recommended Follow-ups (6 cols) ── */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-[24px] p-md soft-shadow border border-surface-container-high flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-headline-md text-on-surface flex items-center gap-sm">
              <Icon name="medical_services" className="text-secondary" />
              Recommended Follow-ups
            </h2>
          </div>

          {recommendation.loading ? (
            <div className="flex flex-col gap-sm flex-1">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recommendation.error ? (
            <p className="text-error text-caption">{recommendation.error}</p>
          ) : !recommendation.data?.results.length ? (
            <EmptyState
              title="No recommendations yet"
              description="Complete a symptom intake to receive personalised doctor recommendations."
              action={
                <Link href="/intake">
                  <Button>Check your symptoms</Button>
                </Link>
              }
            />
          ) : (
            <div className="flex-1 flex flex-col gap-sm">
              {recommendation.data.results.slice(0, 4).map((rec) => (
                <div
                  key={rec.doctor_id}
                  className="bg-surface p-sm rounded-xl border border-outline-variant/50 flex items-center gap-md hover:border-primary/50 transition-colors"
                >
                  <Avatar name={rec.doctor_name} size={56} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-label-md text-on-surface truncate">{rec.doctor_name}</h3>
                    <p className="text-caption text-on-surface-variant truncate">
                      {rec.specialization} &bull; {Math.round(rec.score * 100)}% Match
                    </p>
                  </div>
                  <Link href={`/doctors/${rec.doctor_id}/book`}>
                    <button className="shrink-0 bg-primary-container text-on-primary-container w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors">
                      <Icon name="calendar_add_on" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Card 4: Recent Activity Timeline (6 cols) ── */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-[24px] p-md soft-shadow border border-surface-container-high">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-headline-md text-on-surface flex items-center gap-sm">
              <Icon name="history" className="text-tertiary" />
              Recent Activity
            </h2>
            <Link
              href="/appointments"
              className="text-primary text-label-md hover:underline"
            >
              View All
            </Link>
          </div>

          {activity.loading ? (
            <div className="relative pl-6 border-l-2 border-surface-container-high space-y-6 mt-sm">
              {[0, 1, 2].map((i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface-container-high" />
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-64 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          ) : activity.error ? (
            <p className="text-error text-caption">{activity.error}</p>
          ) : !activity.data?.length ? (
            <EmptyState
              title="No recent activity"
              description="Your health activity will appear here after your first consultation."
            />
          ) : (
            <div className="relative pl-6 border-l-2 border-surface-container-high space-y-6 mt-sm">
              {(activity.data ?? []).slice(0, 6).map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-surface-container-lowest flex items-center justify-center">
                    {/* dot */}
                  </div>
                  <div className="flex items-start gap-sm">
                    <Icon
                      name={activityIcon(item.type)}
                      className="text-primary shrink-0 text-base mt-0.5"
                    />
                    <div className="min-w-0">
                      <h3 className="text-label-md text-on-surface">{item.title}</h3>
                      {item.description && (
                        <p className="text-body-md text-on-surface-variant mt-1">
                          {item.description}
                        </p>
                      )}
                      <span className="text-caption text-on-surface-variant mt-1 block">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
