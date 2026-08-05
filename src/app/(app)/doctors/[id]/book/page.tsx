"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatTime, initials, parseServerDate } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AvailabilitySlotOut } from "@/lib/types";
import { cn } from "@/components/ui/cn";

function slotDate(iso: string): string {
  return parseServerDate(iso).toISOString().split("T")[0];
}
function groupByDate(slots: AvailabilitySlotOut[]): Map<string, AvailabilitySlotOut[]> {
  const map = new Map<string, AvailabilitySlotOut[]>();
  for (const s of slots) {
    const d = slotDate(s.start_time);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(s);
  }
  return map;
}

export default function BookAppointmentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();
  const { data: doctor, loading: docLoading } = useApi(() => api.doctors.get(id), [id]);
  const { data: slots, loading: slotsLoading } = useApi(() => api.doctors.availability(id), [id]);

  const [selected, setSelected] = useState<AvailabilitySlotOut | null>(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  if (docLoading || slotsLoading) return <Skeleton className="mx-auto h-96 w-full max-w-[900px] rounded-[24px]" />;
  if (!doctor) return <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">Could not load this page.</p>;

  const availableSlots = (slots ?? []).filter((s) => !s.is_booked);
  const grouped = groupByDate(availableSlots);

  async function handleConfirm() {
    if (!selected || !doctor) return;
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

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5">
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Book a visit</h1>

      {/* Doctor mini */}
      <div className="flex items-center gap-3 rounded-[18px] border border-border bg-warm-white p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(doctor.full_name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">{doctor.full_name}</p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent">Free</span>
      </div>

      {availableSlots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white p-8 text-center">
          <Icon name="event_busy" className="text-[40px] text-ink-muted" />
          <p className="font-extrabold text-ink">No free times yet</p>
          <p className="text-body-md text-ink-muted">This doctor hasn&apos;t added times. Try another doctor.</p>
          <Link href="/doctors" className="inline-flex h-11 items-center rounded-full border-2 border-border px-6 font-extrabold text-ink">
            Back to doctors
          </Link>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-5">
            <h2 className="text-headline-md font-extrabold text-ink">Pick a time</h2>
            {Array.from(grouped.entries()).map(([dateKey, dateSlots]) => (
              <div key={dateKey} className="flex flex-col gap-2">
                <p className="font-bold text-ink">{formatDate(dateKey)}</p>
                <div className="flex flex-wrap gap-2.5">
                  {dateSlots.map((s) => {
                    const on = selected?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelected(on ? null : s)}
                        className={cn(
                          "h-12 min-w-[96px] rounded-2xl border px-4 font-extrabold transition-colors",
                          on ? "border-2 border-primary bg-primary text-on-primary" : "border border-border bg-sand text-ink hover:border-primary",
                        )}
                      >
                        {formatTime(s.start_time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <div className="flex flex-col gap-2">
            <label htmlFor="reason" className="font-bold text-ink">Why the visit? (not needed)</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell the doctor a little about how you feel…"
              className="min-h-[90px] w-full rounded-2xl border border-border bg-warm-white p-4 text-body-md placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {bookError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{bookError}</p>}

          <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {selected ? (
                <>
                  <p className="font-extrabold text-ink">{formatDate(selected.start_time)} at {formatTime(selected.start_time)}</p>
                  <p className="flex items-center gap-1.5 text-body-md text-ink-muted">
                    <Icon name={selected.mode === "video" ? "videocam" : "location_on"} className="text-[18px]" />
                    {selected.mode === "video" ? "Video call" : "See in person"}
                  </p>
                </>
              ) : (
                <p className="text-body-md text-ink-muted">Pick a time above</p>
              )}
            </div>
            <button
              disabled={!selected || booking}
              onClick={handleConfirm}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 font-extrabold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {booking ? "Sending…" : "Request visit"} <Icon name="arrow_forward" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
