"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { formatDateTime, statusLabel, statusTone } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const FACES: [string, string, string][] = [
  ["sentiment_very_satisfied", "Better", "text-face-better"],
  ["sentiment_neutral", "Same", "text-face-same"],
  ["sentiment_very_dissatisfied", "Worse", "text-face-worse"],
];

export default function PatientHome() {
  const profile = useApi(() => api.patients.me(), []);
  const consults = useApi(() => api.patients.consultations(), []);
  const doctors = useApi(() => api.doctors.list(), []);

  const doctorMap: Record<number, string> = {};
  for (const d of doctors.data ?? []) doctorMap[d.id] = d.full_name;
  const docName = (id: number | null | undefined) =>
    id != null && doctorMap[id] ? doctorMap[id] : "Your doctor";

  // Most urgent thing to act on next (accepted → requested → scheduled).
  const urgency: Record<string, number> = { accepted: 0, requested: 1, scheduled: 2 };
  const nextAppt =
    (consults.data ?? [])
      .filter((c) => c.status in urgency)
      .sort((a, b) => urgency[a.status] - urgency[b.status])[0] ?? null;
  const doneConsult = (consults.data ?? []).find((c) => c.status === "completed") ?? null;

  const firstName = profile.data?.full_name.split(" ")[0] ?? "";
  const completion = profile.data?.profile_completion_score ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4">
      <header>
        {profile.loading ? (
          <Skeleton className="mb-1 h-9 w-56" />
        ) : (
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
        )}
        <p className="text-body-md text-ink-muted">How are you today?</p>
      </header>

      {/* Health-info nudge → fuller history = better matches */}
      {profile.data && completion < 1 && (
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-[20px] border border-accent bg-accent-soft p-4 transition-colors hover:brightness-[0.98] md:p-5"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-on-primary">
            <Icon name="clinical_notes" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-ink">Finish your health info</span>
            <span className="block text-caption text-ink-muted">
              Add your long-term illness — we match you better.
            </span>
          </span>
          <Icon name="chevron_right" className="text-accent" />
        </Link>
      )}

      {/* Big primary action */}
      <Link
        href="/intake"
        className="flex flex-col gap-3 rounded-[28px] bg-primary p-6 text-on-primary transition-colors hover:bg-primary-container md:flex-row md:items-center md:justify-between md:p-8"
      >
        <span className="flex flex-col gap-3 md:max-w-[560px]">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15">
            <Icon name="health_and_safety" className="text-[30px]" />
          </span>
          <span className="text-headline-md font-extrabold">Not feeling well?</span>
          <span className="text-body-md text-on-primary/90">
            Tell us where it hurts and we&apos;ll find the right doctor for you.
          </span>
        </span>
        <span className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-warm-white px-8 font-extrabold text-primary md:w-auto">
          Find care <Icon name="arrow_forward" />
        </span>
      </Link>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next visit */}
        <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-5">
          <p className="text-label-sm font-extrabold uppercase tracking-wide text-ink-muted">Your next visit</p>
          {consults.loading ? (
            <Skeleton className="h-16 w-full" />
          ) : nextAppt ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">
                  {initials(docName(nextAppt.doctor_id))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{docName(nextAppt.doctor_id)}</p>
                  <StatusBadge tone={statusTone(nextAppt.status)}>{statusLabel(nextAppt.status)}</StatusBadge>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="flex items-center gap-1.5 font-bold text-ink">
                  <Icon name="schedule" className="text-ink-muted" />
                  {formatDateTime(nextAppt.scheduled_datetime)}
                </span>
                {nextAppt.status === "scheduled" && nextAppt.mode === "video" && nextAppt.meeting_link ? (
                  <a
                    href={nextAppt.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-extrabold text-on-primary"
                  >
                    <Icon name="videocam" /> Join
                  </a>
                ) : nextAppt.status === "scheduled" && nextAppt.location ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextAppt.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-extrabold text-on-primary"
                  >
                    <Icon name="directions" /> Directions
                  </a>
                ) : (
                  <Link href="/appointments" className="font-extrabold text-primary">
                    See visit
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Icon name="calendar_month" className="text-[32px] text-ink-muted" />
              <p className="text-ink-muted">No visits yet.</p>
              <Link href="/intake" className="inline-flex h-11 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">
                Find care
              </Link>
            </div>
          )}
        </section>

        {/* How are you now? (outcome check-in) */}
        {doneConsult ? (
          <Link href="/appointments" className="flex flex-col gap-3 rounded-[20px] border border-border bg-accent-soft p-5">
            <p className="flex items-center gap-2 font-extrabold text-ink">
              <Icon name="favorite" className="text-accent" /> How are you now?
            </p>
            <p className="text-caption text-ink-muted">
              Did you get better after seeing {docName(doneConsult.doctor_id)}?
            </p>
            <div className="flex gap-2.5">
              {FACES.map(([ic, lab, col]) => (
                <span key={lab} className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border bg-warm-white py-3.5">
                  <Icon name={ic} className={`text-[30px] ${col}`} />
                  <span className="text-caption font-bold text-ink">{lab}</span>
                </span>
              ))}
            </div>
          </Link>
        ) : (
          <section className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-border bg-warm-white p-5 text-center">
            <Icon name="volunteer_activism" className="text-[32px] text-accent" />
            <p className="font-extrabold text-ink">You&apos;re all set</p>
            <p className="text-caption text-ink-muted">Your visits and updates show up here.</p>
          </section>
        )}
      </div>
    </div>
  );
}
