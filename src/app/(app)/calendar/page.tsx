"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ConsultationSummary, AvailabilitySlotOut } from "@/lib/types";
import { PageHeader } from "@/components/app/PageHeader";

function weekDays(): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const sameDay = (iso: string, d: Date) => {
  const t = new Date(iso);
  return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
};

const INACTIVE = ["cancelled", "declined", "withdrawn", "expired"];

interface AgendaItem { key: string; at: string; icon: string; tone: string; title: string; detail: string }

export default function CalendarPage() {
  const { data: me } = useApi(() => api.doctors.me(), []);
  const { data: consults, loading } = useApi(() => api.doctors.myConsultations(), []);
  const { data: slots } = useApi(
    () => (me ? api.doctors.availability(me.id) : Promise.resolve([])),
    [me?.id],
  );

  const days = useMemo(weekDays, []);
  const today = new Date();
  const [picked, setPicked] = useState<Date>(() => days.find((d) => sameDay(today.toISOString(), d)) ?? days[0]);

  if (loading) return <Skeleton className="h-96 w-full rounded-[24px]" />;

  const active = (consults ?? []).filter((c) => !INACTIVE.includes(c.status));
  const agenda: AgendaItem[] = [
    ...active.filter((c) => sameDay(c.scheduled_datetime, picked)).map((c: ConsultationSummary): AgendaItem => ({
      key: `v${c.id}`,
      at: c.scheduled_datetime,
      icon: c.mode === "video" ? "videocam" : c.mode === "home_visit" ? "home" : "local_hospital",
      tone: c.mode === "video" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary",
      title: c.patient_name || "A patient",
      detail: c.mode === "video" ? "Video call" : c.mode === "home_visit" ? `Home visit${c.location ? ` · ${c.location}` : ""}` : "At the clinic",
    })),
    ...(slots ?? []).filter((sl) => !sl.is_booked && sameDay(sl.start_time, picked)).map((sl: AvailabilitySlotOut): AgendaItem => ({
      key: `s${sl.id}`,
      at: sl.start_time,
      icon: "event_available",
      tone: "bg-sand text-ink-muted",
      title: "Free",
      detail: "Open slot — bookable",
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <PageHeader title="Your week" subtitle="Tap a day to see visits and free times." />

      <div className="grid grid-cols-7 gap-1.5 md:gap-3">
        {days.map((d) => {
          const on = sameDay(picked.toISOString(), d);
          const busy = active.some((c) => sameDay(c.scheduled_datetime, d));
          return (
            <button key={d.toISOString()} type="button" aria-pressed={on} onClick={() => setPicked(d)}
              className={cn("flex flex-col items-center gap-0.5 rounded-2xl border py-2.5 transition-colors", on ? "border-primary bg-primary text-on-primary" : "border-border bg-warm-white text-ink hover:border-primary/50")}>
              <span className={cn("text-[12px] font-semibold", on ? "text-on-primary/85" : "text-ink-muted")}>{d.toLocaleDateString([], { weekday: "short" })}</span>
              <span className="text-[18px] font-extrabold">{d.getDate()}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", busy ? (on ? "bg-on-primary" : "bg-primary") : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <h2 className="text-[18px] font-extrabold text-ink">
        {sameDay(today.toISOString(), picked) ? "Today · " : ""}{picked.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
      </h2>
      <div className="rounded-[20px] border border-border bg-warm-white px-4">
        {agenda.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-ink-muted">Nothing on this day.</p>
        ) : agenda.map((item, i) => (
          <div key={item.key} className={cn("flex items-center gap-3 py-3", i > 0 && "border-t border-border")}>
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", item.tone)}><Icon name={item.icon} className="text-[22px]" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-ink">{item.title}</p>
              <p className="truncate text-[13px] text-ink-muted">{item.detail}</p>
            </div>
            <span className="shrink-0 text-[14px] font-bold text-ink">{new Date(item.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>

      <Link href="/doctor-portal#times" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-warm-white font-extrabold text-ink transition hover:bg-primary-soft md:self-start md:px-6">
        <Icon name="add" className="text-[20px]" /> Add free times
      </Link>
    </div>
  );
}
