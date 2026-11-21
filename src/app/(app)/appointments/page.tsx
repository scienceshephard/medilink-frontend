"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { useRefreshOnNotification } from "@/lib/notifications";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatNaira, initials, statusLabel, statusTone } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import { NextBestDoctor } from "@/components/app/NextBestDoctor";
import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/components/ui/cn";
import type { ConsultationSummary, DoctorPublicOut } from "@/lib/types";

type Outcome = "better" | "same" | "worse";

const primaryAction = "inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-extrabold text-on-primary transition hover:bg-primary-container";

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
  useRefreshOnNotification(reload);
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
    <div className="flex flex-col gap-4 md:gap-5">
      <PageHeader title="My visits" />

      {actionError && <p className="rounded-xl bg-red-soft px-5 py-3 font-bold text-error">{actionError}</p>}
      {cancelNotice && (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-5 py-3 font-bold text-accent">
          <Icon name="check_circle" fill /> {cancelNotice}
        </p>
      )}

      {loading && !consultations ? (
        <div className="flex flex-col gap-3.5">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-[20px]" />)}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-soft px-5 py-4 font-bold text-error">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-warm-white px-6 py-14 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="calendar_month" className="text-[32px]" /></span>
          <p className="text-[20px] font-extrabold text-ink">No visits yet</p>
          <p className="max-w-[320px] text-[15px] text-ink-muted">When you ask a doctor for a visit, it shows here.</p>
          <Link href="/find-care" className="mt-1 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-extrabold text-on-primary">Find care <Icon name="arrow_forward" /></Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map((c) => {
            const name = doctorName(c);
            const paid = c.payment_status === "success";
            const inPerson = c.mode === "in_person" || c.mode === "home_visit";
            const pill = c.status === "requested"
              ? <StatusBadge tone="warning">Waiting</StatusBadge>
              : c.status === "completed"
                ? <StatusBadge tone="neutral" icon="check">Done</StatusBadge>
                : <StatusBadge tone={statusTone(c.status)}>{statusLabel(c.status)}</StatusBadge>;
            const when = (
              <span className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
                <Icon name="schedule" className="text-[18px] text-ink-muted" />
                {formatDateTime(c.scheduled_datetime)}{c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
              </span>
            );
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-4 md:flex-row md:flex-wrap md:items-center md:gap-x-5 md:px-5">
                <div className="flex min-w-0 items-center gap-3 md:flex-1">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-accent-soft text-[17px] font-extrabold text-accent">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[17px] font-extrabold text-ink">{name}</p>
                      <span className="hidden md:inline-flex">{pill}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[14px] text-ink-muted">
                      <Icon name={c.mode === "video" ? "videocam" : c.mode === "home_visit" ? "home_pin" : "local_hospital"} className="text-[16px]" />
                      {c.mode === "video" ? "Video visit" : c.mode === "home_visit" ? "Home visit" : "At the clinic"}
                    </p>
                    {c.status !== "requested" && c.status !== "completed" && <p className="mt-0.5 hidden md:block">{when}</p>}
                    {c.status === "completed" && <p className="mt-0.5 hidden text-[14px] text-ink-muted md:block">Visit finished</p>}
                    {c.status === "requested" && <p className="mt-0.5 hidden text-[14px] text-ink-muted md:block">Waiting for the doctor to say yes. We will tell you soon.</p>}
                  </div>
                  <span className="md:hidden">{pill}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 md:justify-end">
                  {c.status === "requested" ? (
                    <p className="w-full text-[14px] text-ink-muted md:hidden">Waiting for the doctor to say yes. We will tell you soon.</p>
                  ) : c.status === "completed" ? (
                    <span className="text-[14px] text-ink-muted md:hidden">Visit finished</span>
                  ) : (
                    <span className="md:hidden">{when}</span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {c.status === "requested" && (
                      <button onClick={() => handleWithdraw(c.id)} disabled={busyId === c.id} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[14px] font-extrabold text-ink hover:bg-primary-soft disabled:opacity-50">
                        <Icon name="undo" className="text-[18px]" /> Withdraw
                      </button>
                    )}
                    {(c.status === "scheduled" || (c.status === "accepted" && !paid)) && (
                      <button onClick={() => setCancelTarget(c)} className="inline-flex h-11 items-center rounded-full px-3 text-[14px] font-bold text-ink-muted hover:bg-red-soft hover:text-error">
                        Cancel
                      </button>
                    )}
                    {c.status === "accepted" && !paid && (
                      <Link href={`/payments/checkout?consultation_id=${c.id}`} className={primaryAction}>
                        <Icon name="payments" className="text-[18px]" /> Pay{c.amount != null ? ` ${formatNaira(c.amount)}` : ""}
                      </Link>
                    )}
                    {c.status === "scheduled" && c.mode === "video" && (
                      <Link href={`/video-visit/${c.id}`} className={primaryAction}><Icon name="videocam" className="text-[18px]" /> Join call</Link>
                    )}
                    {c.status === "scheduled" && inPerson && c.location && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`} target="_blank" rel="noopener noreferrer" className={primaryAction}>
                        <Icon name="directions" className="text-[18px]" /> Get directions
                      </a>
                    )}
                    {c.status === "completed" && !c.feedback_submitted && (
                      <button onClick={() => setFeedbackId(c.id)} className={cn(primaryAction, "bg-accent hover:bg-accent/90")}>
                        <Icon name="favorite" className="text-[18px]" /> How are you now?
                      </button>
                    )}
                    {c.status === "completed" && c.feedback_submitted && (
                      <Link href="/care-plan" className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[14px] font-extrabold text-ink hover:bg-primary-soft">
                        <Icon name="medication" className="text-[18px]" /> Care plan
                      </Link>
                    )}
                  </div>
                </div>

                {c.status === "scheduled" && inPerson && (
                  <p className="flex w-full items-center gap-2 rounded-xl bg-sand px-4 py-3 text-[14px] text-ink">
                    <Icon name={c.mode === "home_visit" ? "home_pin" : "location_on"} className="text-[18px] text-accent" />
                    <span className="min-w-0 flex-1">{c.location ?? "Location shared before the visit"}</span>
                    {c.mode === "home_visit" && <Link className="shrink-0 font-extrabold text-primary" href={`/home-visit?id=${c.id}`}>Track visit</Link>}
                  </p>
                )}
                {c.clinical_notes && (
                  <section className="w-full rounded-xl border border-accent/30 bg-accent-soft p-4" aria-label="Clinician care instructions">
                    <h2 className="flex items-center gap-2 font-extrabold text-ink"><Icon name="medication" className="text-accent" />Your clinician’s care instructions</h2>
                    <p className="mt-2 whitespace-pre-wrap text-body-md text-ink">{c.clinical_notes}</p>
                    <p className="mt-2 text-caption text-ink-muted">If you have questions about these instructions or a medicine, contact your clinician or pharmacist.</p>
                  </section>
                )}
                {(c.status === "declined" || c.status === "expired") && (
                  <>
                    <p className="flex w-full items-center gap-2 rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">
                      <Icon name="cancel" />
                      {c.status === "declined"
                        ? c.decline_reason ? `${name} can't take this — ${c.decline_reason}` : `${name} can't take this visit.`
                        : `${name} didn't answer in time, so the time was freed.`}
                    </p>
                    <div className="w-full"><NextBestDoctor consultationId={c.id} onRequested={reload} /></div>
                  </>
                )}
                {c.status === "withdrawn" && (
                  <p className="flex w-full items-center gap-2 rounded-xl bg-sand px-4 py-3 text-[14px] font-bold text-ink-muted">
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
