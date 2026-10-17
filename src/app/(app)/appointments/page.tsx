"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatNaira, initials, statusLabel, statusTone } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import { NextBestDoctor } from "@/components/app/NextBestDoctor";
import type { ConsultationSummary, DoctorPublicOut } from "@/lib/types";

type Outcome = "better" | "same" | "worse";

function parseOutcome(v: string | null): Outcome | null {
  return v === "better" || v === "same" || v === "worse" ? v : null;
}

/** `?review=<id>&outcome=<better|same|worse>` — the Home outcome card deep-links here. */
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[900px] rounded-[24px]" />}>
      <AppointmentsContent />
    </Suspense>
  );
}

function AppointmentsContent() {
  const { data: consultations, loading, error, reload } = useApi(() => api.patients.consultations(), []);
  const { data: doctors } = useApi(() => api.doctors.list(), []);

  const searchParams = useSearchParams();
  const reviewParam = Number(searchParams.get("review"));
  const deepLinkedOutcome = parseOutcome(searchParams.get("outcome"));

  const [feedbackId, setFeedbackId] = useState<number | null>(
    Number.isFinite(reviewParam) && reviewParam > 0 ? reviewParam : null,
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsultationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const doctorMap: Record<number, string> = {};
  for (const d of (doctors ?? []) as DoctorPublicOut[]) doctorMap[d.id] = d.full_name;
  function doctorName(c: ConsultationSummary): string {
    if (c.doctor_id != null && doctorMap[c.doctor_id]) return doctorMap[c.doctor_id];
    return c.doctor_id != null ? `Doctor #${c.doctor_id}` : "Your doctor";
  }

  async function handleWithdraw(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.consultations.withdraw(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not withdraw.");
    } finally {
      setBusyId(null);
    }
  }
  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { refunded } = await api.consultations.cancel(cancelTarget.id);
      setCancelTarget(null);
      setCancelNotice(refunded ? "Visit cancelled. Your money is coming back." : "Visit cancelled.");
      reload();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const items = consultations ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
      <div>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">My visits</h1>
        <p className="text-body-md text-ink-muted">Track your visits and tell us how you felt after.</p>
      </div>

      {actionError && <p className="rounded-xl bg-red-soft px-5 py-3 font-bold text-error">{actionError}</p>}
      {cancelNotice && (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-5 py-3 font-bold text-accent">
          <Icon name="check_circle" fill /> {cancelNotice}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Icon name="calendar_month" className="text-[40px] text-ink-muted" />
          <p className="font-extrabold text-ink">No visits yet</p>
          <Link href="/find-care" className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-extrabold text-on-primary">Find care</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((c) => {
            const name = doctorName(c);
            const paid = c.payment_status === "success";
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-ink">{name}</p>
                      <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</StatusBadge>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-body-md text-ink-muted">
                      <Icon name="schedule" className="text-[18px]" />
                      {formatDateTime(c.scheduled_datetime)}
                      {c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {c.status === "requested" && (
                      <button onClick={() => handleWithdraw(c.id)} disabled={busyId === c.id} className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-4 font-extrabold text-ink disabled:opacity-50">
                        <Icon name="undo" className="text-[18px]" /> Withdraw
                      </button>
                    )}
                    {c.status === "accepted" && !paid && (
                      <>
                        <Link href={`/payments/checkout?consultation_id=${c.id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-extrabold text-on-primary">
                          <Icon name="payments" className="text-[18px]" /> Review payment{c.amount != null ? ` · ${formatNaira(c.amount)}` : ""}
                        </Link>
                        <button onClick={() => setCancelTarget(c)} className="inline-flex h-11 items-center rounded-full border-2 border-border px-4 font-extrabold text-ink">Cancel</button>
                      </>
                    )}
                    {c.status === "scheduled" && (
                      <button onClick={() => setCancelTarget(c)} className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-4 font-extrabold text-ink">
                        <Icon name="close" className="text-[18px]" /> Cancel
                      </button>
                    )}
                    {c.status === "completed" && !c.feedback_submitted && (
                      <button onClick={() => setFeedbackId(c.id)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 font-extrabold text-on-primary">
                        <Icon name="favorite" className="text-[18px]" /> How are you now?
                      </button>
                    )}
                  </div>
                </div>

                {/* Status banner */}
                {c.status === "requested" && (
                  <p className="flex items-center gap-2 rounded-xl bg-amber-soft px-4 py-3 font-bold text-warning">
                    <Icon name="hourglass_top" /> Waiting for {name} to say yes. We&apos;ll tell you soon.
                  </p>
                )}
                {c.status === "scheduled" && c.mode === "in_person" && c.location && (
                  <p className="flex items-center gap-2 rounded-xl bg-sand px-4 py-3 text-body-md text-ink">
                    <Icon name="location_on" fill className="text-accent" />
                    <span className="min-w-0 flex-1">{c.location}</span>
                    <a className="shrink-0 font-extrabold text-primary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`}>Directions</a>
                  </p>
                )}
                {c.status === "scheduled" && c.mode === "video" && c.meeting_link && (
                  <p className="flex items-center gap-2 rounded-xl bg-sand px-4 py-3 text-body-md text-ink">
                    <Icon name="videocam" fill className="text-accent" />
                    <a className="font-extrabold text-primary" target="_blank" rel="noopener noreferrer" href={c.meeting_link}>Join the call</a>
                  </p>
                )}
                {(c.status === "declined" || c.status === "expired") && (
                  <>
                    <p className="flex items-center gap-2 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">
                      <Icon name="cancel" />
                      {c.status === "declined"
                        ? c.decline_reason ? `${name} can't take this — ${c.decline_reason}` : `${name} can't take this visit.`
                        : `${name} didn't answer in time, so the time was freed.`}
                    </p>
                    <NextBestDoctor consultationId={c.id} onRequested={reload} />
                  </>
                )}
                {c.status === "completed" && c.feedback_submitted && (
                  <p className="text-caption font-bold text-accent">Feedback received. Thank you.</p>
                )}
                {c.status === "withdrawn" && (
                  <p className="flex items-center gap-2 rounded-xl bg-sand px-4 py-3 font-bold text-ink-muted">
                    <Icon name="undo" /> You withdrew this.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedbackId != null && (
        <FeedbackModal consultationId={feedbackId} open={feedbackId != null} initialOutcome={deepLinkedOutcome} onClose={() => setFeedbackId(null)} onSubmitted={() => { setFeedbackId(null); reload(); }} />
      )}

      <Modal open={cancelTarget != null} onClose={() => { if (!cancelling) { setCancelTarget(null); setCancelError(null); } }} title="Cancel this visit?">
        {cancelTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-ink-muted">
              Cancel your visit with <span className="font-extrabold text-ink">{doctorName(cancelTarget)}</span> on{" "}
              <span className="font-extrabold text-ink">{formatDateTime(cancelTarget.scheduled_datetime)}</span>? This frees the time.
            </p>
            {cancelError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{cancelError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setCancelTarget(null); setCancelError(null); }} disabled={cancelling} className="inline-flex h-12 items-center rounded-full border-2 border-border px-6 font-extrabold text-ink">Keep it</button>
              <button onClick={handleCancel} disabled={cancelling} className="inline-flex h-12 items-center gap-1.5 rounded-full bg-error px-6 font-extrabold text-on-primary disabled:opacity-50">
                <Icon name="close" /> {cancelling ? "…" : "Cancel visit"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
