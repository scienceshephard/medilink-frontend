"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";

import { api, ApiError } from "@/lib/api";
import { formatDate, formatNaira, formatTime } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AvailabilitySlotOut } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function slotDate(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
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

function slotHour(iso: string): number {
  return new Date(iso).getHours();
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function BookingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="lg:col-span-8">
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card flex flex-col gap-6">
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BookAppointmentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();

  const { data: doctor, loading: docLoading, error: docError } = useApi(
    () => api.doctors.get(id),
    [id],
  );
  const { data: slots, loading: slotsLoading, error: slotsError } = useApi(
    () => api.doctors.availability(id),
    [id],
  );

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotOut | null>(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const loading = docLoading || slotsLoading;
  const loadError = docError || slotsError;

  if (loading) return <BookingSkeleton />;

  if (loadError || !doctor) {
    return (
      <div className="rounded-xl border border-error/30 bg-error-container px-6 py-5 text-on-error-container">
        <p className="font-semibold">{loadError || "Could not load booking page."}</p>
        <Link href={`/doctors/${id}`} className="mt-2 inline-flex items-center gap-1 text-label-md font-semibold underline hover:no-underline">
          <Icon name="arrow_back" className="text-[16px]" />
          Back to doctor profile
        </Link>
      </div>
    );
  }

  const availableSlots = (slots ?? []).filter((s) => !s.is_booked);
  const grouped = groupByDate(availableSlots);

  async function handleConfirm() {
    if (!selectedSlot || !doctor) return;
    setBooking(true);
    setBookError(null);
    try {
      const c = await api.consultations.book({
        doctor_id: id,
        slot_id: selectedSlot.id,
        symptom_input: reason || null,
        recommendation_rank: null,
      });
      sessionStorage.setItem(
        "telemed:lastBooking",
        JSON.stringify({
          consultation: c,
          doctorName: doctor.full_name,
          start: selectedSlot.start_time,
          end: selectedSlot.end_time,
        }),
      );
      router.push("/appointments/confirmed");
    } catch (err) {
      setBookError(err instanceof ApiError ? err.message : "Booking failed. Please try again.");
      setBooking(false);
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-caption text-on-surface-variant">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <Icon name="chevron_right" className="text-[16px] text-outline" />
        <Link href="/doctors" className="hover:text-primary transition-colors">
          Find a Doctor
        </Link>
        <Icon name="chevron_right" className="text-[16px] text-outline" />
        <Link href={`/doctors/${id}`} className="hover:text-primary transition-colors">
          {doctor.full_name}
        </Link>
        <Icon name="chevron_right" className="text-[16px] text-outline" />
        <span className="text-on-surface">Book Appointment</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left: Doctor summary card ── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex flex-col items-center text-center p-6">
            <Avatar name={doctor.full_name} size={96} />
            <h2 className="mt-4 text-headline-md text-on-surface">{doctor.full_name}</h2>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-caption text-on-surface">
                <Icon name="star" fill className="text-[16px] text-tertiary" />
                {doctor.average_rating.toFixed(1)}&nbsp;
                <span className="text-on-surface-variant">
                  ({doctor.total_consultations} review{doctor.total_consultations !== 1 ? "s" : ""})
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-caption text-on-surface">
                <Icon name="verified" fill className="text-[16px] text-secondary" />
                Board Certified
              </span>
            </div>

            <div className="mt-4 w-full rounded-lg bg-surface-container-low p-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-body-md text-on-surface-variant">
                <Icon name="payments" className="text-[20px] text-secondary" />
                Consultation fee
              </span>
              <span className="text-headline-md font-bold text-on-surface tabular-nums">
                {formatNaira(doctor.consultation_fee)}
              </span>
            </div>

            {doctor.bio && (
              <div className="mt-4 w-full border-t border-outline-variant pt-4 text-left">
                <p className="text-label-md text-on-surface-variant mb-1">About</p>
                <p className="text-body-md text-on-surface-variant line-clamp-4">{doctor.bio}</p>
              </div>
            )}

            {doctor.location && (
              <div className="mt-4 flex items-center gap-2 text-caption text-on-surface-variant">
                <Icon name="location_on" className="text-[16px] text-secondary" />
                {doctor.location}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Slot picker + reason + confirm ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="flex flex-col gap-6 p-6">
            {availableSlots.length === 0 ? (
              <EmptyState
                title="No open slots"
                description="This doctor has no available appointment slots at the moment."
                action={
                  <Link href={`/doctors/${id}`}>
                    <Button variant="outline">
                      <Icon name="arrow_back" className="text-[16px]" />
                      Back to profile
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                <section>
                  <h2 className="text-headline-md text-on-surface mb-4">Select a Time</h2>

                  <div className="flex flex-col gap-6">
                    {Array.from(grouped.entries()).map(([dateKey, dateSlots]) => {
                      const morning = dateSlots.filter((s) => slotHour(s.start_time) < 12);
                      const afternoon = dateSlots.filter((s) => slotHour(s.start_time) >= 12);

                      return (
                        <div key={dateKey}>
                          <p className="mb-3 text-label-md font-semibold text-on-surface">
                            {formatDate(dateKey)}
                          </p>

                          {morning.length > 0 && (
                            <div className="mb-4">
                              <h4 className="mb-2 flex items-center gap-1 text-label-md text-on-surface-variant">
                                <Icon name="light_mode" className="text-[20px]" />
                                Morning
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {morning.map((s) => {
                                  const selected = selectedSlot?.id === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      onClick={() => setSelectedSlot(selected ? null : s)}
                                      className={[
                                        "min-w-[100px] rounded-lg border px-4 py-3 text-body-md font-medium transition-colors",
                                        selected
                                          ? "border-primary bg-primary text-on-primary"
                                          : "border-outline-variant text-on-surface hover:border-primary hover:text-primary",
                                      ].join(" ")}
                                    >
                                      {formatTime(s.start_time)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {afternoon.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1 text-label-md text-on-surface-variant">
                                <Icon name="wb_sunny" className="text-[20px]" />
                                Afternoon
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {afternoon.map((s) => {
                                  const selected = selectedSlot?.id === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      onClick={() => setSelectedSlot(selected ? null : s)}
                                      className={[
                                        "min-w-[100px] rounded-lg border px-4 py-3 text-body-md font-medium transition-colors",
                                        selected
                                          ? "border-primary bg-primary text-on-primary"
                                          : "border-outline-variant text-on-surface hover:border-primary hover:text-primary",
                                      ].join(" ")}
                                    >
                                      {formatTime(s.start_time)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <hr className="border-outline-variant" />

                {/* Reason for visit */}
                <section>
                  <Textarea
                    label="Reason for visit (optional)"
                    placeholder="Briefly describe your symptoms or reason for the appointment..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </section>

                {/* Error message */}
                {bookError && (
                  <p className="text-body-md text-error">{bookError}</p>
                )}

                {/* Action bar */}
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:flex-row sm:items-center">
                  <div>
                    {selectedSlot ? (
                      <>
                        <p className="text-label-md text-on-surface">
                          {formatDate(selectedSlot.start_time)} at {formatTime(selectedSlot.start_time)}
                        </p>
                        <p className="text-body-md text-on-surface-variant">Telehealth consultation</p>
                      </>
                    ) : (
                      <p className="text-body-md text-on-surface-variant">No time selected</p>
                    )}
                  </div>

                  <Button
                    size="lg"
                    disabled={!selectedSlot}
                    loading={booking}
                    onClick={handleConfirm}
                  >
                    Confirm Appointment
                    <Icon name="arrow_forward" className="text-[20px]" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
