"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { downloadIcs } from "@/lib/ics";
import { formatDateTime } from "@/lib/format";
import type { ConsultationOut } from "@/lib/types";

interface LastBooking {
  consultation: ConsultationOut;
  doctorName: string;
  start: string;
  end: string;
}

export default function AppointmentConfirmedPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<LastBooking | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("telemed:lastBooking");
    if (!raw) {
      router.replace("/appointments");
      return;
    }
    try {
      setBooking(JSON.parse(raw) as LastBooking);
    } catch {
      router.replace("/appointments");
    }
  }, [router]);

  if (!booking) return null;

  const { doctorName, start, end } = booking;

  function handleAddToCalendar() {
    downloadIcs({
      title: `TeleMed consultation with ${doctorName}`,
      start,
      end,
      description: "Booked via TeleMed",
    });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-lg">
        {/* Main card */}
        <div className="relative overflow-hidden rounded-[24px] border border-outline-variant/30 bg-surface-container-lowest p-10 shadow-card flex flex-col items-center text-center">
          {/* Subtle glow background */}
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-full -translate-y-1/2 rounded-full bg-primary-fixed/20 blur-3xl" />

          {/* Success icon */}
          <div className="relative z-10 mb-8 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32] shadow-card">
            <Icon name="check_circle" fill className="text-[48px]" />
          </div>

          {/* Heading */}
          <h1 className="text-headline-lg text-on-surface">Appointment Confirmed!</h1>
          <p className="mt-3 max-w-xs text-body-md text-on-surface-variant">
            Your booking is confirmed. Details are shown below.
          </p>

          {/* Details card */}
          <div className="mt-8 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low p-6 text-left">
            {/* Provider row */}
            <div className="mb-5 flex items-start gap-4 border-b border-outline-variant/20 pb-5">
              <Avatar name={doctorName} size={56} />
              <div>
                <p className="text-caption text-on-surface-variant">Provider</p>
                <p className="mt-0.5 text-label-md text-on-surface">{doctorName}</p>
                <p className="text-body-md text-on-surface-variant text-[14px]">Telehealth Consultation</p>
              </div>
            </div>

            {/* Date / time grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="calendar_today" className="text-[16px]" />
                  Date &amp; Time
                </p>
                <p className="mt-1 text-label-md text-on-surface">{formatDateTime(start)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="videocam" className="text-[16px]" />
                  Mode
                </p>
                <p className="mt-1 text-label-md text-on-surface">Telehealth</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex w-full flex-col gap-3">
            <Link href="/dashboard" className="w-full">
              <Button full size="lg">
                <Icon name="dashboard" className="text-[20px]" />
                Go to Dashboard
              </Button>
            </Link>

            <Button full size="lg" variant="secondary" onClick={handleAddToCalendar}>
              <Icon name="event" className="text-[20px]" />
              Add to Calendar
            </Button>
          </div>

          {/* Reschedule link */}
          <Link
            href="/appointments"
            className="mt-5 text-caption text-primary hover:underline"
          >
            Cancel or reschedule
          </Link>
        </div>
      </div>
    </div>
  );
}
