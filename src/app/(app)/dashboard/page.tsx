"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { useRefreshOnNotification } from "@/lib/notifications";
import { api } from "@/lib/api";
import { formatDateTime, statusLabel, statusTone } from "@/lib/format";
import type { ConsultationSummary, PatientOut } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/app/PageHeader";

const UPCOMING = ["requested", "accepted", "scheduled"];

/** Profile fields that help matching, counted for the "Finish your health info" nudge. */
function profileProgress(p: PatientOut | null) {
  if (!p) return null;
  const checks = [p.location, p.phone, p.preferred_languages?.length, p.chronic_conditions?.length, p.current_medications?.length];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export default function PatientHome() {
  const profile = useApi(() => api.patients.me(), []);
  const visits = useApi(() => api.patients.consultations(), []);
  useRefreshOnNotification(visits.reload);
  const all = visits.data ?? [];
  const nextVisit = all
    .filter((v) => UPCOMING.includes(v.status))
    .sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())[0];
  const toRate = all.find((v) => v.status === "completed" && !v.feedback_submitted);
  const firstName = profile.data?.full_name?.trim().split(/\s+/)[0];
  const progress = profileProgress(profile.data);

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <PageHeader
        title={<>Hi{firstName ? `, ${firstName}` : ""} 👋</>}
        subtitle="How are you today?"
        leading={<span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-border text-ink-muted md:hidden"><Icon name="person" className="text-[26px]" /></span>}
        className="mb-1 md:mb-3"
      />

      {progress && progress.done < progress.total && (
        <Link href="/profile" className="order-2 flex flex-col gap-3 rounded-[20px] border border-accent bg-accent-soft p-4 md:order-none md:flex-row md:items-center md:gap-5 md:px-5">
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white"><Icon name="clinical_notes" className="text-[24px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold text-ink">Finish your health info</span>
              <span className="block text-[13px] leading-5 text-ink-muted">Add your long-term illness — we match you better.</span>
            </span>
            <Icon name="chevron_right" className="text-[24px] text-accent md:hidden" />
          </span>
          <span className="flex items-center gap-2.5 md:w-[260px]">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-warm-white">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
            <span className="text-[13px] font-extrabold text-accent">{progress.done} of {progress.total}</span>
          </span>
          <span className="hidden h-10 items-center gap-1 rounded-full bg-accent px-4 text-[14px] font-extrabold text-white md:inline-flex">Finish <Icon name="chevron_right" className="text-[18px]" /></span>
        </Link>
      )}

      <section className="order-1 flex items-center gap-6 rounded-[28px] bg-primary p-6 text-white md:order-none md:p-9">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3.5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15"><Icon name="health_and_safety" className="text-[30px]" /></span>
          <h2 className="text-[26px] font-extrabold leading-tight md:text-[32px]">Not feeling well?</h2>
          <p className="max-w-[460px] text-[15px] leading-6 text-white/80">Tell us where it hurts — we&apos;ll find the right doctor for you.</p>
          <Link href="/find-care" className="mt-1 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-[18px] font-extrabold text-primary transition hover:bg-primary-soft md:w-auto">
            Find care <Icon name="arrow_forward" className="text-[22px]" />
          </Link>
        </div>
        <span className="hidden h-[140px] w-[140px] shrink-0 place-items-center rounded-full bg-white/15 md:grid"><Icon name="medical_services" className="text-[64px]" /></span>
      </section>

      <div className="order-3 grid gap-4 md:order-none md:grid-cols-2 md:gap-5">
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-ink-muted">Your next visit</h2>
          {nextVisit ? <NextVisitCard visit={nextVisit} /> : (
            <div className="flex flex-1 flex-col items-start gap-3 rounded-[20px] border border-border bg-warm-white p-4">
              <p className="text-[15px] text-ink-muted">No visits yet. When a doctor says yes, your visit shows here.</p>
              <Link href="/appointments" className="inline-flex items-center gap-1 text-[15px] font-extrabold text-primary">See all visits <Icon name="arrow_forward" className="text-[18px]" /></Link>
            </div>
          )}
        </section>

        {toRate && (
          <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-accent-soft p-4 md:mt-[26px]">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-ink"><Icon name="favorite" fill className="text-[22px] text-primary" /> How are you now?</h2>
            <p className="text-[14px] text-ink-muted">Did you get better after seeing {toRate.doctor_name ?? "your doctor"}?</p>
            <div className="grid grid-cols-3 gap-2.5">
              {([["better", "sentiment_very_satisfied", "Better", "text-face-better"], ["same", "sentiment_neutral", "Same", "text-face-same"], ["worse", "sentiment_very_dissatisfied", "Worse", "text-face-worse"]] as const).map(([value, icon, label, color]) => (
                <Link key={value} href={`/appointments?review=${toRate.id}&outcome=${value}`} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-warm-white py-3.5 transition hover:border-primary">
                  <Icon name={icon} className={`text-[34px] ${color}`} />
                  <span className="text-[14px] font-bold text-ink">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function NextVisitCard({ visit }: { visit: ConsultationSummary }) {
  const action = visit.status === "scheduled" && visit.mode === "video"
    ? { href: `/video-visit/${visit.id}`, icon: "videocam", label: "Join call" }
    : visit.status === "scheduled" && visit.location
      ? { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.location)}`, icon: "directions", label: "Get directions", external: true }
      : { href: "/appointments", icon: "arrow_forward", label: "View" };
  const modeLabel = visit.mode === "video" ? "Video visit" : visit.mode === "home_visit" ? "Home visit" : "Clinic visit";

  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] border border-border bg-warm-white p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Icon name="person" className="text-[30px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold text-ink">{visit.doctor_name ?? "Your doctor"}</p>
          <p className="text-[14px] text-ink-muted">{modeLabel}</p>
        </div>
        <StatusBadge tone={statusTone(visit.status)}>{statusLabel(visit.status)}</StatusBadge>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink"><Icon name="schedule" className="text-[20px] text-ink-muted" />{formatDateTime(visit.scheduled_datetime)}</span>
        <Link
          href={action.href}
          {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[15px] font-extrabold text-on-primary transition hover:bg-primary-container"
        >
          <Icon name={action.icon} className="text-[20px]" /> {action.label}
        </Link>
      </div>
    </div>
  );
}
