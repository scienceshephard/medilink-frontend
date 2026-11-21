"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { LocationPicker } from "@/components/app/LocationPicker";
import type { Coordinates } from "@/lib/geo";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatNaira, formatTime, initials, parseServerDate } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AvailabilitySlotOut } from "@/lib/types";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/app/PageHeader";

function slotDate(iso: string): string {
  return parseServerDate(iso).toISOString().split("T")[0];
}
function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

const MODES = [
  { mode: "in_person", icon: "location_on", label: "See in person" },
  { mode: "home_visit", icon: "home", label: "Come to me" },
  { mode: "video", icon: "videocam", label: "Video call" },
] as const;

function partOfDay(iso: string): string {
  const h = parseServerDate(iso).getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

function dayLabel(dateKey: string): { top: string; num: number } {
  const d = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return { top: isToday ? "Today" : d.toLocaleDateString([], { weekday: "short" }), num: d.getDate() };
}

export default function BookAppointmentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();
  const { data: doctor, loading: docLoading } = useApi(() => api.doctors.get(id), [id]);
  const { data: slots, loading: slotsLoading } = useApi(() => api.doctors.availability(id), [id]);

  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [selected, setSelected] = useState<AvailabilitySlotOut | null>(null);
  const [reason, setReason] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homePin, setHomePin] = useState<Coordinates | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  if (docLoading || slotsLoading) return <Skeleton className="mx-auto h-96 w-full max-w-[900px] rounded-[24px]" />;
  if (!doctor) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">Could not load this page.</p>;

  const availableSlots = (slots ?? []).filter((s) => !s.is_booked);
  const byDay = groupBy(
    [...availableSlots].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    (sl) => slotDate(sl.start_time),
  );
  const dayKey = day && byDay.has(day) ? day : Array.from(byDay.keys())[0] ?? null;
  const daySlots = dayKey ? byDay.get(dayKey)! : [];
  const byTime = groupBy(daySlots, (sl) => sl.start_time);
  const timeSlots = time ? byTime.get(time) ?? [] : [];
  const dayModes = new Set(daySlots.map((sl) => sl.mode));

  function pickDay(key: string) {
    setDay(key);
    setTime(null);
    setSelected(null);
  }
  function pickTime(start: string) {
    const options = byTime.get(start) ?? [];
    setTime(start);
    setSelected(options.find((sl) => sl.mode === selected?.mode) ?? options[0] ?? null);
  }

  async function handleConfirm() {
    if (!selected || !doctor) return;
    if (selected.mode === "home_visit" && !homeAddress.trim()) {
      setBookError("Enter the address where you would like the clinician to visit.");
      return;
    }
    setBooking(true);
    setBookError(null);
    try {
      const recId = sessionStorage.getItem("medilink:recommendationId");
      const c = await api.consultations.book({
        doctor_id: id,
        slot_id: selected.id,
        symptom_input: reason || null,
        recommendation_id: recId ? Number(recId) : null,
        recommendation_rank: null,
        home_address: selected.mode === "home_visit" ? homeAddress.trim() : null,
        home_latitude: selected.mode === "home_visit" ? homePin?.latitude ?? null : null,
        home_longitude: selected.mode === "home_visit" ? homePin?.longitude ?? null : null,
      });
      sessionStorage.setItem(
        "medilink:lastRequest",
        JSON.stringify({ consultation: c, doctorName: doctor.full_name, start: selected.start_time, end: selected.end_time, mode: selected.mode }),
      );
      router.push("/appointments/confirmed");
    } catch (err) {
      setBookError(err instanceof ApiError ? err.message : "Could not send the request. Please try again.");
      setBooking(false);
    }
  }

  const section = "text-[20px] font-extrabold text-ink";

  return (
    <div className="flex flex-col gap-4 md:max-w-[720px] md:gap-5">
      <PageHeader back title="Book a visit" />

      <div className="flex items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-[17px] font-extrabold text-accent">{initials(doctor.full_name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold text-ink">{doctor.full_name}</p>
          <p className="truncate text-[14px] text-ink-muted">{doctor.specialization_names?.join(" · ") || "Doctor"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-[13px] font-extrabold text-accent">{doctor.payment_required ? formatNaira(doctor.consultation_fee) : "Free"}</span>
      </div>
      {doctor.is_demo && <p className="text-caption text-ink-muted">Demo profile: these sample times are for exploring the booking flow, not a real appointment.</p>}

      {availableSlots.length === 0 ? (
        <EmptyState icon="event_busy" title="No times listed yet" action={{ href: "/find-care/recommendations", label: "Back to my doctors" }}>
          This doctor has no upcoming times. Try another doctor or check back later.
        </EmptyState>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className={section}>Pick a day</h2>
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {Array.from(byDay.keys()).map((key) => {
                const on = key === dayKey;
                const { top, num } = dayLabel(key);
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => pickDay(key)}
                    className={cn("flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl border transition-colors", on ? "border-primary bg-primary text-on-primary" : "border-border bg-warm-white text-ink hover:border-primary/50")}>
                    <span className={cn("text-[13px] font-semibold", on ? "text-on-primary/85" : "text-ink-muted")}>{top}</span>
                    <span className="text-[22px] font-extrabold leading-tight">{num}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={section}>Pick a time</h2>
            {Array.from(groupBy(Array.from(byTime.keys()), partOfDay).entries()).map(([part, starts]) => (
              <div key={part} className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink-muted"><Icon name={part === "Morning" ? "wb_sunny" : part === "Afternoon" ? "light_mode" : "bedtime"} className="text-[18px]" />{part}</p>
                <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">
                  {starts.map((start) => {
                    const on = start === time;
                    return (
                      <button key={start} type="button" aria-pressed={on} onClick={() => pickTime(start)}
                        className={cn("h-12 rounded-2xl border text-[16px] font-extrabold transition-colors", on ? "border-primary bg-primary text-on-primary" : "border-border bg-warm-white text-ink hover:border-primary/50")}>
                        {formatTime(start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={section}>How?</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {MODES.filter((m) => dayModes.has(m.mode)).map((m) => {
                const option = timeSlots.find((sl) => sl.mode === m.mode);
                const on = selected?.mode === m.mode && Boolean(time);
                return (
                  <button key={m.mode} type="button" aria-pressed={on} disabled={Boolean(time) && !option} onClick={() => option && setSelected(option)}
                    title={time && !option ? "Not offered at this time" : undefined}
                    className={cn("flex flex-col items-center justify-center gap-2 rounded-[18px] border py-5 transition-colors disabled:opacity-40", on ? "border-primary bg-primary-soft" : "border-border bg-warm-white hover:border-primary/50")}>
                    <Icon name={m.icon} className={cn("text-[28px]", on ? "text-primary" : "text-ink")} />
                    <span className="text-[15px] font-bold text-ink">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {!time && <p className="text-[13px] text-ink-muted">Pick a time first — each time shows how the doctor can see you.</p>}
          </section>

          {selected?.mode === "home_visit" && (
            <div className="flex flex-col gap-2 rounded-[20px] border border-primary/30 bg-primary-soft p-4">
              <LocationPicker
                mode="address"
                label="Where should the clinician visit?"
                text={homeAddress}
                onTextChange={setHomeAddress}
                point={homePin}
                onPointChange={setHomePin}
                placeholder="House number, street, neighborhood, town or city"
                hint="Then pin your home on the map so the clinician can find it, even if the street has no number."
              />
              {!homePin && homeAddress.trim() && <span className="text-caption font-bold text-ink">Without a map pin, the clinician gets directions from the typed address only, which can be imprecise.</span>}
              <span className="text-caption text-ink-muted">Your address{homePin ? " and map pin are" : " is"} shared only with the clinician you request, so they can decide whether they can travel to you and find your home.</span>
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-[16px] font-bold text-ink">Anything the doctor should know? <span className="font-normal text-ink-muted">(optional)</span></span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell the doctor a little about how you feel…"
              className="min-h-[90px] w-full rounded-2xl border border-border bg-warm-white p-4 text-[15px] placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {bookError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{bookError}</p>}

          <div className="flex flex-col gap-2">
            <button
              disabled={!selected || booking || (selected.mode === "home_visit" && !homeAddress.trim())}
              onClick={handleConfirm}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-[18px] font-extrabold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {booking ? "Sending…" : "Book this visit"} <Icon name="check" className="text-[22px]" />
            </button>
            <p className="text-center text-[13px] text-ink-muted">
              {selected ? `${formatDate(selected.start_time)} at ${formatTime(selected.start_time)} · ` : ""}
              {doctor.payment_required ? "You pay only after the doctor says yes." : "The doctor confirms before it's final."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
