"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
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
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  async function withdraw() {
    if (!booking) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await api.consultations.withdraw(booking.consultation.id);
      sessionStorage.removeItem("medilink:lastRequest");
      router.replace("/appointments");
    } catch (err) {
      setWithdrawError(err instanceof ApiError ? err.message : "Could not withdraw. Please try again.");
      setWithdrawing(false);
    }
  }

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
      <span className="grid h-24 w-24 place-items-center rounded-full bg-amber-soft text-face-same">
        <Icon name="hourglass_top" className="text-[48px]" />
      </span>
      <h1 className="text-[28px] font-extrabold text-ink">Request sent!</h1>
      <p className="text-[15px] text-ink-muted">
        {doctorName} will answer soon. We&apos;ll tell you when they say yes.
      </p>

      <div className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-warm-white p-4 text-left">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(doctorName)}</span>
        <div className="min-w-0">
          <p className="truncate font-extrabold text-ink">{doctorName}</p>
          <p className="text-[13px] text-ink-muted">
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-warm-white font-extrabold text-ink hover:bg-primary-soft"
        >
          <Icon name="event" /> Add to calendar
        </button>
        <button onClick={() => setConfirmWithdraw(true)} className="h-11 text-[15px] font-bold text-ink-muted underline-offset-2 hover:text-error hover:underline">
          Cancel this request
        </button>
      </div>

      <Modal open={confirmWithdraw} onClose={() => { if (!withdrawing) setConfirmWithdraw(false); }} title="Withdraw this request?">
        <div className="flex flex-col gap-4 text-left">
          <p className="text-[15px] text-ink-muted">{doctorName} has not accepted yet. Withdrawing frees the slot — you can book again any time.</p>
          {withdrawError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{withdrawError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button onClick={() => setConfirmWithdraw(false)} disabled={withdrawing} className="inline-flex h-12 items-center justify-center rounded-full border border-border px-6 font-extrabold text-ink">Keep request</button>
            <button onClick={withdraw} disabled={withdrawing} className="inline-flex h-12 items-center justify-center rounded-full bg-error px-6 font-extrabold text-on-primary disabled:opacity-50">{withdrawing ? "…" : "Withdraw"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
