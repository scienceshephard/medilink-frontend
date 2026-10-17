"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { RequestCard } from "@/components/app/RequestCard";
import { AvailabilityForm } from "@/components/app/AvailabilityForm";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, parseServerDate, titleCase } from "@/lib/format";
import type { ConsultationSummary, DoctorRequest } from "@/lib/types";

const METRICS: [string, string][] = [
  ["star", "Rating"],
  ["groups", "Total visits"],
  ["trending_up", "Accept rate"],
];

export default function DoctorPortalPage() {
  const doctor = useApi(() => api.doctors.me(), []);
  const metrics = useApi(() => api.doctors.myMetrics(), []);
  const consults = useApi(() => api.doctors.myConsultations(), []);
  const requests = useApi(() => api.doctors.myRequests(), []);

  const [availOpen, setAvailOpen] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsultationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<DoctorRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [careTarget, setCareTarget] = useState<ConsultationSummary | null>(null);
  const [careNotes, setCareNotes] = useState("");
  const [savingCare, setSavingCare] = useState(false);
  const [careError, setCareError] = useState<string | null>(null);

  const lastName = doctor.data ? doctor.data.full_name.trim().split(" ").filter(Boolean).pop() : null;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const queueStatuses = new Set(["scheduled", "completed", "no_show"]);
  const queue = (consults.data ?? []).filter((c) => queueStatuses.has(c.status));
  const reqCount = (requests.data ?? []).length;

  const reloadAll = useCallback(() => {
    requests.reload();
    consults.reload();
    metrics.reload();
  }, [requests, consults, metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markStatus(id: number, status: "completed" | "no_show") {
    setCompleting(id);
    setCompleteError(null);
    try {
      await api.consultations.update(id, { status });
      reloadAll();
    } catch (err) {
      setCompleteError(err instanceof ApiError ? err.message : "Could not update.");
    } finally {
      setCompleting(null);
    }
  }
  async function handleAccept(id: number) {
    setRespondingId(id);
    setRespondError(null);
    try {
      await api.consultations.accept(id);
      reloadAll();
    } catch (err) {
      setRespondError(err instanceof ApiError ? err.message : "Could not accept.");
    } finally {
      setRespondingId(null);
    }
  }
  async function handleDecline() {
    if (!declineTarget) return;
    setRespondingId(declineTarget.id);
    setRespondError(null);
    try {
      await api.consultations.decline(declineTarget.id, declineReason || undefined);
      setDeclineTarget(null);
      setDeclineReason("");
      reloadAll();
    } catch (err) {
      setRespondError(err instanceof ApiError ? err.message : "Could not decline.");
    } finally {
      setRespondingId(null);
    }
  }
  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.consultations.cancel(cancelTarget.id);
      setCancelTarget(null);
      consults.reload();
      metrics.reload();
    } catch {
      /* ignore */
    } finally {
      setCancelling(false);
    }
  }
  async function saveCareNotes() {
    if (!careTarget) return;
    setSavingCare(true);
    setCareError(null);
    try {
      await api.consultations.update(careTarget.id, { clinical_notes: careNotes });
      setCareTarget(null);
      setCareNotes("");
      consults.reload();
    } catch (err) {
      setCareError(err instanceof ApiError ? err.message : "Could not share these instructions.");
    } finally {
      setSavingCare(false);
    }
  }

  const metricValues = [
    metrics.data?.rating_count ? `${metrics.data.average_rating.toFixed(1)} / 5` : "No ratings yet",
    metrics.data ? String(metrics.data.total_consultations) : "—",
    metrics.data ? `${Math.round(metrics.data.recommendation_acceptance_rate * 100)}%` : "—",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7">
      <div className="flex flex-col gap-4 border-b border-[#E4E9E5] pb-6 sm:flex-row sm:items-end sm:justify-between">
       <div>
        {doctor.loading ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <h1 className="font-serif text-[clamp(34px,4vw,48px)] leading-tight tracking-[-.04em] text-[#19352E]">
            {greeting}{lastName ? `, Dr. ${lastName}` : ""}
          </h1>
        )}
        <p className="mt-2 text-[14px] text-[#65756F]">Review patient concerns and agree on a suitable next step together.</p>
       </div>
        {reqCount > 0 && (
          <p className="flex w-fit items-center gap-2 rounded-full bg-[#EAF3EE] px-4 py-2 text-[13px] font-bold text-[#286653]">
            <Icon name="notifications_active" className="text-[18px]" /> {reqCount} {reqCount === 1 ? "new care request" : "new care requests"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-[18px] border border-[#E4E9E5] bg-white px-5 py-4">
        {METRICS.map(([icon, label], i) => (
          <div key={label} className="flex min-w-[120px] items-center gap-2">
            <Icon name={icon} className="text-[19px] text-[#286653]" />
            <span className="text-[13px] font-bold text-[#19352E]">{metricValues[i]}</span>
            <span className="text-[11px] text-[#65756F]">{label.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          {respondError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{respondError}</p>}
          {reqCount > 0 && (
            <section id="requests" className="flex flex-col gap-3 scroll-mt-6">
              <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#65756F]">Your inbox</p><h2 className="mt-1 font-serif text-[28px] text-[#19352E]">New care requests</h2></div>
              {(requests.data ?? []).map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  busy={respondingId === r.id}
                  onAccept={() => handleAccept(r.id)}
                  onDecline={() => setDeclineTarget(r)}
                />
              ))}
            </section>
          )}

          <h2 className="font-serif text-[28px] text-[#19352E]">Upcoming and recent visits</h2>
          {completeError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{completeError}</p>}
          {consults.loading ? (
            <Skeleton className="h-24 rounded-[18px]" />
          ) : queue.length === 0 ? (
            <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">
              No visits yet. Add free times so patients can book you.
            </p>
          ) : (
            queue.map((c) => {
              const past = parseServerDate(c.scheduled_datetime) <= new Date();
              return (
                <article key={c.id} className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-5 sm:flex-row sm:items-center">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft font-extrabold text-primary">
                    P{c.patient_id ?? c.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-ink">Patient #{c.patient_id ?? "—"} · {titleCase(c.status)}</p>
                    <p className="text-caption text-ink-muted">{formatDateTime(c.scheduled_datetime)}</p>
                    {c.symptom_input && <p className="mt-1 truncate text-caption text-ink-muted">{c.symptom_input}</p>}
                  </div>
                  {c.status === "scheduled" && (
                    <div className="flex flex-wrap gap-2">
                      {past ? (
                        <>
                          <button onClick={() => markStatus(c.id, "completed")} disabled={completing === c.id} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 font-extrabold text-on-primary disabled:opacity-50">
                            <Icon name="check_circle" className="text-[18px]" /> Done
                          </button>
                          <button onClick={() => markStatus(c.id, "no_show")} className="inline-flex h-11 items-center rounded-full border-2 border-border px-4 font-extrabold text-ink">No-show</button>
                        </>
                      ) : (
                        <button onClick={() => setCancelTarget(c)} className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-4 font-extrabold text-ink">
                          <Icon name="close" className="text-[18px]" /> Cancel
                        </button>
                      )}
                    </div>
                  )}
              {(c.status === "scheduled" || c.status === "completed") && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  {c.clinical_notes && <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">Care instructions shared with patient</p>}
                  <button onClick={() => { setCareTarget(c); setCareNotes(c.clinical_notes ?? ""); setCareError(null); }} className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-border px-4 text-caption font-extrabold text-primary"><Icon name="medication" />{c.clinical_notes ? "Update care instructions" : "Share care instructions"}</button>
                </div>
              )}
                </article>
              );
            })
          )}
        </div>

        {/* Availability aside */}
        <aside id="times" className="flex flex-col gap-4 scroll-mt-6">
          <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-5">
            <p className="flex items-center gap-2 text-headline-md font-extrabold text-ink"><Icon name="event_available" className="text-primary" /> Your free times</p>
            <p className="text-caption text-ink-muted">Add times so patients can book you.</p>
            <button onClick={() => setAvailOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary">
              <Icon name="add" /> Add free times
            </button>
          </div>
        </aside>
      </div>

      <Modal open={availOpen} onClose={() => setAvailOpen(false)} title="Add free time">
        <AvailabilityForm
          clinicAddress={doctor.data?.clinic_address}
          meetingLink={doctor.data?.default_meeting_link}
          serviceArea={doctor.data?.location}
          onAdded={() => { setAvailOpen(false); reloadAll(); }}
        />
      </Modal>

      <Modal open={cancelTarget != null} onClose={() => { if (!cancelling) setCancelTarget(null); }} title="Cancel this visit?">
        {cancelTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-ink-muted">Cancel the visit on <span className="font-extrabold text-ink">{formatDateTime(cancelTarget.scheduled_datetime)}</span>? The time is freed and the patient refunded if they paid.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelTarget(null)} disabled={cancelling} className="inline-flex h-12 items-center rounded-full border-2 border-border px-6 font-extrabold text-ink">Keep it</button>
              <button onClick={handleCancel} disabled={cancelling} className="inline-flex h-12 items-center rounded-full bg-error px-6 font-extrabold text-on-primary disabled:opacity-50">{cancelling ? "…" : "Cancel visit"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={declineTarget != null} onClose={() => { setDeclineTarget(null); setDeclineReason(""); }} title="Say no to this?">
        {declineTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-ink-muted">The time becomes free again and we find the patient another doctor. Nothing was paid.</p>
            <label className="flex flex-col gap-2">
              <span className="font-bold text-ink">Why? (the patient sees this)</span>
              <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="For example: I am fully booked that day." className="min-h-[80px] rounded-2xl border border-border bg-sand p-4 text-body-md placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeclineTarget(null); setDeclineReason(""); }} className="inline-flex h-12 items-center rounded-full border-2 border-border px-6 font-extrabold text-ink">Keep it</button>
              <button onClick={handleDecline} disabled={respondingId === declineTarget.id} className="inline-flex h-12 items-center rounded-full bg-error px-6 font-extrabold text-on-primary disabled:opacity-50">Say no</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={careTarget != null} onClose={() => { if (!savingCare) { setCareTarget(null); setCareError(null); } }} title="Share care instructions">
        <div className="flex flex-col gap-4">
          <p className="text-body-md text-ink-muted">Write the instructions you discussed with the patient. Include any medicine and usage details only when you have determined them as the treating clinician.</p>
          <label className="flex flex-col gap-2">
            <span className="font-bold text-ink">Care instructions and medicines</span>
            <textarea value={careNotes} onChange={(event) => setCareNotes(event.target.value)} maxLength={5000} placeholder="For example, the care plan and any medicine instructions you discussed…" className="min-h-36 rounded-2xl border border-border bg-sand p-4 text-body-md text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <span className="text-caption text-ink-muted">Visible to the patient on My visits. MediLink does not generate or verify prescriptions.</span>
          </label>
          {careError && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{careError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => setCareTarget(null)} disabled={savingCare} className="inline-flex h-12 items-center rounded-full border-2 border-border px-5 font-extrabold text-ink">Cancel</button>
            <button onClick={saveCareNotes} disabled={(!careNotes.trim() && !careTarget?.clinical_notes) || savingCare} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-extrabold text-on-primary disabled:opacity-50">{savingCare ? "Saving…" : careNotes.trim() ? "Share with patient" : "Remove instructions"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
