"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { downloadIcs } from "@/lib/ics";
import { formatDateTime, initials } from "@/lib/format";
import type { ConsultationOut, SlotMode } from "@/lib/types";

interface LastRequest {
  consultation: ConsultationOut;
  doctorName: string;
  start: string;
  end: string;
  mode: SlotMode;
}


export default function AppointmentConfirmedPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<LastRequest | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("medilink:lastRequest");
    if (!raw) {
      router.replace("/appointments");
      return;
    }
    try {
      setBooking(JSON.parse(raw) as LastRequest);
    } catch {
      router.replace("/appointments");
    }
  }, [router]);

  if (!booking) return null;
  const { doctorName, start } = booking;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 py-8 text-center">
      <span className="grid h-24 w-24 place-items-center rounded-full bg-amber-soft text-warning">
        <Icon name="hourglass_top" fill className="text-[52px]" />
      </span>
      <h1 className="text-headline-lg font-extrabold text-ink">Request sent!</h1>
      <p className="text-body-md text-ink-muted">
        {doctorName} will answer soon. We&apos;ll tell you when they say yes.
      </p>

      <div className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4 text-left">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(doctorName)}</span>
        <div className="min-w-0">
          <p className="font-extrabold text-ink">{doctorName}</p>
          <p className="text-caption text-ink-muted">
            {formatDateTime(start)} · {booking.mode === "video" ? "Video" : booking.mode === "home_visit" ? "Home visit" : "At clinic"}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link href="/appointments" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary transition-colors hover:bg-primary-container">
          <Icon name="calendar_month" /> See my visits
        </Link>
        <button
          onClick={() => downloadIcs({ title: `Visit with ${doctorName}`, start, end: booking.end, description: "Booked via MediLink" })}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent-soft font-extrabold text-accent"
        >
          <Icon name="event" /> Add to calendar
        </button>
      </div>
    </div>
  );
}
