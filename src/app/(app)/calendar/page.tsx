"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/useApi";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ConsultationSummary, AvailabilitySlotOut } from "@/lib/types";

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

export default function CalendarPage() {
  const { data: me } = useApi(() => api.doctors.me(), []);
  const { data: consults, loading } = useApi(() => api.doctors.myConsultations(), []);
  const { data: slots } = useApi(
    () => (me ? api.doctors.availability(me.id) : Promise.resolve([])),
    [me?.id],
  );

  const days = useMemo(weekDays, []);
  const today = new Date();

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-[900px] rounded-[24px]" />;

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="text-display-sm font-extrabold text-ink">Your week</h1>
      <p className="mt-1 text-body-md text-ink-muted">Visits and open slots, Monday to Sunday.</p>

      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const isToday = sameDay(today.toISOString(), d);
          const count = (consults ?? []).filter((c) => sameDay(c.scheduled_datetime, d) && c.status !== "cancelled").length;
          return (
            <div key={d.toISOString()} className={`rounded-2xl border p-3 text-center ${isToday ? "bg-primary text-on-primary border-primary" : "border-border bg-warm-white"}`}>
              <p className={`text-xs font-bold ${isToday ? "text-on-primary/80" : "text-ink-muted"}`}>{d.toLocaleDateString([], { weekday: "short" })}</p>
              <p className="mt-1 text-lg font-extrabold">{d.getDate()}</p>
              {count > 0 && <p className={`mt-1 text-[11px] font-bold ${isToday ? "text-on-primary/80" : "text-ink-muted"}`}>{count} visit{count > 1 ? "s" : ""}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-extrabold text-ink">Visits this week</h2>
          <div className="mt-3 space-y-3">
            {(consults ?? [])
              .filter((c) => days.some((d) => sameDay(c.scheduled_datetime, d)) && !["cancelled", "declined", "withdrawn"].includes(c.status))
              .sort((a, b) => a.scheduled_datetime.localeCompare(b.scheduled_datetime))
              .map((c: ConsultationSummary) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                    <Icon name={c.mode === "video" ? "videocam" : "home_health"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{c.symptom_input ?? "Visit"}</p>
                    <p className="text-caption text-ink-muted">{c.mode === "video" ? "Video call" : "In person"}</p>
                  </div>
                  <span className="text-body-sm font-bold text-ink-muted">
                    {new Date(c.scheduled_datetime).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            {(consults ?? []).filter((c) => days.some((d) => sameDay(c.scheduled_datetime, d))).length === 0 && (
              <p className="text-body-md text-ink-muted">No visits booked this week yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-extrabold text-ink">Free times</h2>
          <div className="mt-3 space-y-2">
            {(slots ?? [])
              .filter((s) => !s.is_booked && new Date(s.start_time) >= today)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .slice(0, 8)
              .map((s: AvailabilitySlotOut) => (
                <div key={s.id} className="flex items-center gap-2 text-body-md">
                  <Icon name="event_available" className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-ink">
                    {new Date(s.start_time).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            {(slots ?? []).filter((s) => !s.is_booked).length === 0 && (
              <p className="text-body-md text-ink-muted">No open slots — add times in My times.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
