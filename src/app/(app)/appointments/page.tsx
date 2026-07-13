"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import {
  formatDateTime, formatNaira, severityTone, statusLabel, statusTone, titleCase,
} from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import { NextBestDoctor } from "@/components/app/NextBestDoctor";
import type { ConsultationSummary, DoctorPublicOut } from "@/lib/types";

export default function AppointmentsPage() {
  const {
    data: consultations, loading: consultLoading, error: consultError, reload,
  } = useApi(() => api.patients.consultations(), []);
  const { data: doctors } = useApi(() => api.doctors.list(), []);

  const [feedbackId, setFeedbackId] = useState<number | null>(null);
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
    return c.doctor_id != null ? `Doctor #${c.doctor_id}` : "Unknown Doctor";
  }

  async function handlePay(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      const { authorization_url } = await api.payments.initialize(id);
      window.location.href = authorization_url;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not start payment.");
      setBusyId(null);
    }
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
      // The backend tells us whether it actually issued a refund. Saying so out
      // loud is the difference between a patient who trusts their money is coming
      // back and one who has to email support to find out.
      const { refunded } = await api.consultations.cancel(cancelTarget.id);
      setCancelTarget(null);
      setCancelNotice(
        refunded
          ? "Appointment cancelled. Your payment has been refunded."
          : "Appointment cancelled.",
      );
      reload();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const items = consultations ?? [];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          My Appointments
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Track your consultations, review completed visits, and share feedback.
        </p>
      </header>

      {actionError && (
        <p className="mb-4 rounded-xl border border-error-container bg-error-container px-5 py-3 text-body-md text-on-error-container">
          {actionError}
        </p>
      )}

      {cancelNotice && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-success-container bg-success-container px-5 py-3 text-body-md text-on-success-container">
          <Icon name="check_circle" fill className="text-[20px]" />
          {cancelNotice}
        </p>
      )}

      {consultLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : consultError ? (
        <p className="rounded-xl border border-error-container bg-error-container px-5 py-4 text-body-md text-on-error-container">
          {consultError}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book a consultation to get started. Your upcoming and past appointments will appear here."
          action={
            <Link href="/intake">
              <Button><Icon name="add" className="text-base" /> New consultation</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((c) => {
            const name = doctorName(c);
            const paid = c.payment_status === "success";

            return (
              <Card key={c.id} hover>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar name={name} size={48} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-lg font-semibold text-on-surface">{name}</p>
                      <StatusBadge tone={statusTone(c.status)}>
                        {statusLabel(c.status)}
                      </StatusBadge>
                      {c.severity && c.status === "requested" && (
                        <StatusBadge tone={severityTone(c.severity)}>
                          {titleCase(c.severity)}
                        </StatusBadge>
                      )}
                      {c.status === "scheduled" && paid && (
                        <StatusBadge tone="success">Paid</StatusBadge>
                      )}
                      {c.status === "accepted" && !paid && (
                        <StatusBadge tone="neutral">Payment due</StatusBadge>
                      )}
                    </div>

                    {c.symptom_input && (
                      <p className="mt-0.5 truncate text-body-md text-on-surface-variant">
                        {c.symptom_input}
                      </p>
                    )}

                    <p className="mt-1 flex items-center gap-1 text-label-md text-on-surface-variant">
                      <Icon name="schedule" className="text-base" />
                      {formatDateTime(c.scheduled_datetime)}
                      {c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {c.status === "requested" && (
                      <Button
                        variant="outline"
                        loading={busyId === c.id}
                        onClick={() => handleWithdraw(c.id)}
                      >
                        <Icon name="undo" className="text-base" />
                        Withdraw
                      </Button>
                    )}
                    {c.status === "accepted" && !paid && (
                      <>
                        <Button
                          variant="primary"
                          loading={busyId === c.id}
                          onClick={() => handlePay(c.id)}
                        >
                          <Icon name="payments" className="text-base" />
                          Pay{c.amount != null ? ` ${formatNaira(c.amount)}` : ""}
                        </Button>
                        <Button variant="outline" onClick={() => setCancelTarget(c)}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {c.status === "scheduled" && (
                      <Button variant="outline" onClick={() => setCancelTarget(c)}>
                        <Icon name="close" className="text-base" />
                        Cancel
                      </Button>
                    )}
                    {c.status === "completed" && (
                      <Button variant="secondary" onClick={() => setFeedbackId(c.id)}>
                        <Icon name="rate_review" className="text-base" />
                        Leave feedback
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Status banner ── */}
                {c.status === "requested" && c.respond_by && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-warning-container px-4 py-3 text-label-md text-on-warning-container">
                    <Icon name="hourglass_top" className="text-[20px]" />
                    <span>
                      Waiting on {name} — <Countdown deadline={c.respond_by} onExpire={reload} /> left
                      to respond. We&apos;ll find you someone else if they don&apos;t.
                    </span>
                  </p>
                )}

                {c.status === "accepted" && !paid && c.pay_by && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-label-md text-on-success-container">
                    <Icon name="check_circle" fill className="text-[20px]" />
                    <span>
                      {name} accepted you. Pay within{" "}
                      <Countdown deadline={c.pay_by} onExpire={reload} /> to lock in this slot.
                    </span>
                  </p>
                )}

                {c.status === "scheduled" && c.mode === "in_person" && c.location && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                    <Icon name="location_on" fill className="text-[20px] text-secondary" />
                    <span>{c.location}</span>
                    <a
                      className="ml-auto shrink-0 text-label-md text-primary hover:underline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </a>
                  </p>
                )}

                {c.status === "scheduled" && c.mode === "video" && c.meeting_link && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                    <Icon name="videocam" fill className="text-[20px] text-secondary" />
                    <a
                      className="text-primary hover:underline"
                      href={c.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Join consultation
                    </a>
                  </p>
                )}

                {(c.status === "declined" || c.status === "expired") && (
                  <>
                    <p className="mt-4 flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
                      <Icon name="cancel" className="text-[20px]" />
                      <span>
                        {c.status === "declined"
                          ? c.decline_reason
                            ? `${name} can't take this appointment — ${c.decline_reason}`
                            : `${name} isn't able to take this appointment.`
                          : `${name} didn't respond in time, so the slot was released.`}
                      </span>
                    </p>
                    <NextBestDoctor consultationId={c.id} onRequested={reload} />
                  </>
                )}

                {c.status === "withdrawn" && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-label-md text-on-surface-variant">
                    <Icon name="undo" className="text-[20px]" />
                    <span>You withdrew this request.</span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {feedbackId != null && (
        <FeedbackModal
          consultationId={feedbackId}
          open={feedbackId != null}
          onClose={() => setFeedbackId(null)}
          onSubmitted={() => { setFeedbackId(null); reload(); }}
        />
      )}

      <Modal
        open={cancelTarget != null}
        onClose={() => { if (!cancelling) { setCancelTarget(null); setCancelError(null); } }}
        title="Cancel appointment?"
      >
        {cancelTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant">
              Cancel your appointment with{" "}
              <span className="font-semibold text-on-surface">{doctorName(cancelTarget)}</span> on{" "}
              <span className="font-semibold text-on-surface">
                {formatDateTime(cancelTarget.scheduled_datetime)}
              </span>
              ? This frees the slot for other patients.
            </p>

            {cancelTarget.payment_status === "success" && (
              <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                <Icon name="payments" className="text-[20px] text-secondary" />
                You&apos;ll be refunded{" "}
                {cancelTarget.amount != null ? formatNaira(cancelTarget.amount) : "your payment"}.
              </p>
            )}

            {cancelError && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {cancelError}
              </p>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => { setCancelTarget(null); setCancelError(null); }}
              >
                Keep appointment
              </Button>
              <Button
                variant="primary"
                className="!bg-error text-on-error hover:!bg-error/90"
                loading={cancelling}
                onClick={handleCancel}
              >
                <Icon name="close" className="text-base" />
                Cancel appointment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
