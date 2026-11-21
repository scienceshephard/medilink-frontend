"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { RequestCard } from "@/components/app/RequestCard";
import { AvailabilityForm } from "@/components/app/AvailabilityForm";
import { SetupChecklist } from "@/components/app/SetupChecklist";
import { useApi } from "@/lib/useApi";
import { useRefreshOnNotification } from "@/lib/notifications";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, initials, parseServerDate, titleCase } from "@/lib/format";
import type { ConsultationSummary, DoctorRequest } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/app/PageHeader";

const MODE_LABEL: Record<string, string> = { in_person: "At clinic", video: "Video call", home_visit: "Home visit" };
const RECENT_PREVIEW = 5;

const METRICS: [string, string][] = [
  ["star", "Rating"],
  ["groups", "Total visits"],
  ["trending_up", "Accept rate"],
];

const secondaryAction = "inline-flex h-10 items-center gap-1.5 rounded-full bg-sand px-3.5 text-caption font-extrabold text-ink transition hover:bg-primary-soft";

export default function DoctorPortalPage() {
  const doctor = useApi(() => api.doctors.me(), []);
  const metrics = useApi(() => api.doctors.myMetrics(), []);
  const consults = useApi(() => api.doctors.myConsultations(), []);
  const requests = useApi(() => api.doctors.myRequests(), []);
  const invites = useApi(() => api.doctors.clinicInvites(), []);
  const myTimes = useApi(() => api.doctors.myAvailability(), []);
  const [inviteBusy, setInviteBusy] = useState<number | null>(null);

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
  const [visitTab, setVisitTab] = useState<"upcoming" | "recent">("upcoming");
  const [showAllRecent, setShowAllRecent] = useState(false);

  const lastName = doctor.data ? doctor.data.full_name.trim().split(" ").filter(Boolean).pop() : null;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const visitTime = (c: ConsultationSummary) => parseServerDate(c.scheduled_datetime).getTime();
  // Scheduled visits stay under Upcoming until marked done or no-show, so a
  // visit whose time has passed sits at the top waiting for its outcome.
  const upcoming = (consults.data ?? []).filter((c) => c.status === "scheduled").sort((a, b) => visitTime(a) - visitTime(b));
  const recent = (consults.data ?? []).filter((c) => c.status === "completed" || c.status === "no_show").sort((a, b) => visitTime(b) - visitTime(a));
  const visits = visitTab === "upcoming" ? upcoming : showAllRecent ? recent : recent.slice(0, RECENT_PREVIEW);
  const reqCount = (requests.data ?? []).length;

  const reloadAll = useCallback(() => {
    requests.reload();
    consults.reload();
    metrics.reload();
    doctor.reload();
    myTimes.reload();
  }, [requests, consults, metrics, doctor, myTimes]); // eslint-disable-line react-hooks/exhaustive-deps
  useRefreshOnNotification(() => { reloadAll(); invites.reload(); });

  async function answerInvite(id: number, accept: boolean) {
    setInviteBusy(id);
    setRespondError(null);
    try {
      await (accept ? api.doctors.acceptClinicInvite(id) : api.doctors.declineClinicInvite(id));
      invites.reload();
    } catch (err) {
      setRespondError(err instanceof ApiError ? err.message : "Could not answer the invite.");
    } finally {
      setInviteBusy(null);
    }
  }

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
    <div className="flex flex-col gap-5">
      <PageHeader
        title={<>{greeting}{lastName ? `, Dr. ${lastName}` : ""}</>}
        subtitle={reqCount > 0 ? `${reqCount} ${reqCount === 1 ? "new request" : "new requests"} waiting for you` : "No new requests right now"}
        leading={<span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent md:hidden"><Icon name="stethoscope" className="text-[24px]" /></span>}
      />

      {reqCount > 0 && (
        <a href="#requests" className="flex items-center gap-3 rounded-[20px] bg-primary px-4 py-3.5 text-white md:px-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20"><Icon name="notifications_active" className="text-[22px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold">{reqCount} {reqCount === 1 ? "person needs" : "people need"} you</span>
            <span className="block text-[13px] text-white/85">Please answer soon</span>
          </span>
          <Icon name="chevron_right" className="text-[22px]" />
        </a>
      )}

      {doctor.data && <SetupChecklist doctor={doctor.data} onAddTimes={() => setAvailOpen(true)} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          {respondError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{respondError}</p>}
          {(invites.data ?? []).length > 0 && (
            <section id="clinic-invites" className="flex flex-col gap-3 scroll-mt-6">
              <h2 className="text-[20px] font-extrabold text-ink">Team invitations</h2>
              {(invites.data ?? []).map((inv) => (
                <div key={inv.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                  <div>
                    <p className="font-extrabold text-ink">{inv.clinic_name}</p>
                    <p className="text-[14px] text-ink-muted">Invited you to join as a {inv.role}. They will be able to assign patient requests to you.</p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={inviteBusy === inv.id} onClick={() => answerInvite(inv.id, false)} className="h-11 rounded-full border border-border bg-warm-white px-5 text-[14px] font-extrabold text-ink disabled:opacity-50">Decline</button>
                    <button disabled={inviteBusy === inv.id} onClick={() => answerInvite(inv.id, true)} className="h-11 rounded-full bg-accent px-5 text-[14px] font-extrabold text-white disabled:opacity-50">Accept</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {reqCount > 0 && (
            <section id="requests" className="flex flex-col gap-3 scroll-mt-6">
              <h2 className="text-[20px] font-extrabold text-ink">People waiting for you</h2>
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

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[20px] font-extrabold text-ink">Your visits</h2>
              <div role="tablist" aria-label="Visits" className="inline-flex rounded-full border border-border bg-warm-white p-1">
                {([["upcoming", "Upcoming", upcoming.length], ["recent", "Recent", recent.length]] as const).map(([value, label, count]) => (
                  <button key={value} role="tab" aria-selected={visitTab === value} onClick={() => setVisitTab(value)} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-caption font-extrabold ${visitTab === value ? "bg-primary text-on-primary" : "text-ink-muted"}`}>
                    {label}<span className={`rounded-full px-1.5 text-[11px] ${visitTab === value ? "bg-white/20" : "bg-surface-container"}`}>{count}</span>
                  </button>
                ))}
              </div>
            </div>
            {completeError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{completeError}</p>}
            {consults.loading && !consults.data ? (
              <Skeleton className="h-24 rounded-[18px]" />
            ) : visits.length === 0 ? (
              <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">
                {visitTab === "upcoming" ? "No upcoming visits. Add free times so patients can book you." : "No finished visits yet."}
              </p>
            ) : (
              visits.map((c) => {
                const past = parseServerDate(c.scheduled_datetime) <= new Date();
                const name = c.patient_name || `Patient #${c.patient_id ?? c.id}`;
                const awaitingOutcome = c.status === "scheduled" && past;
                return (
                  <article key={c.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-accent-soft text-[17px] font-extrabold text-accent">{initials(name)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[17px] font-extrabold text-ink">{name}</p>
                          {awaitingOutcome ? (
                            <StatusBadge tone="warning">Needs outcome</StatusBadge>
                          ) : c.status === "scheduled" ? (
                            <StatusBadge tone="success">Confirmed</StatusBadge>
                          ) : c.status === "completed" ? (
                            <StatusBadge tone="neutral" icon="check">Done</StatusBadge>
                          ) : (
                            <StatusBadge tone="error">{titleCase(c.status.replace("_", " "))}</StatusBadge>
                          )}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-muted">
                          <span className="inline-flex items-center gap-1 font-bold text-ink"><Icon name="schedule" className="text-[16px] text-ink-muted" />{formatDateTime(c.scheduled_datetime)}</span>
                          {c.mode && <span className="inline-flex items-center gap-1"><Icon name={c.mode === "video" ? "videocam" : c.mode === "home_visit" ? "home_health" : "local_hospital"} className="text-[16px]" />{MODE_LABEL[c.mode] ?? titleCase(c.mode)}</span>}
                        </p>
                        {c.symptom_input && <p className="mt-2 line-clamp-2 rounded-xl bg-sand px-3 py-2 text-[14px] text-ink">{c.symptom_input}</p>}
                      </div>
                    </div>

                    {awaitingOutcome && (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-soft px-3 py-2.5">
                        <span className="mr-auto text-caption font-bold text-ink">Did this visit happen?</span>
                        <button onClick={() => markStatus(c.id, "completed")} disabled={completing === c.id} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-caption font-extrabold text-on-primary disabled:opacity-50">
                          <Icon name="check_circle" className="text-[16px]" /> Mark done
                        </button>
                        <button onClick={() => markStatus(c.id, "no_show")} disabled={completing === c.id} className="inline-flex h-10 items-center rounded-full border border-border bg-warm-white px-4 text-caption font-extrabold text-ink disabled:opacity-50">No-show</button>
                      </div>
                    )}

                    {(c.status === "scheduled" || c.status === "completed") && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        {c.mode === "video" && c.status === "scheduled" && (
                          <Link href={`/video-visit/${c.id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-extrabold text-on-primary"><Icon name="videocam" className="text-[18px]" />Join call</Link>
                        )}
                        {c.mode === "home_visit" && c.status === "scheduled" && (
                          <Link href={`/home-visit?id=${c.id}`} className={secondaryAction}><Icon name="home_health" />Home visit</Link>
                        )}
                        <Link href={`/visit-notes?id=${c.id}`} className={secondaryAction}><Icon name="edit_note" />Notes</Link>
                        <button onClick={() => { setCareTarget(c); setCareNotes(c.clinical_notes ?? ""); setCareError(null); }} className={secondaryAction}><Icon name="medication" />{c.clinical_notes ? "Edit care instructions" : "Care instructions"}</button>
                        <Link href={`/prepare-care-plan?consultation=${c.id}`} className={secondaryAction}><Icon name="healing" />Care plan</Link>
                        {c.status === "scheduled" && !past && (
                          <button onClick={() => setCancelTarget(c)} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-caption font-bold text-ink-muted hover:bg-red-soft hover:text-error">
                            <Icon name="close" className="text-[16px]" /> Cancel visit
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
            {visitTab === "recent" && recent.length > RECENT_PREVIEW && (
              <button onClick={() => setShowAllRecent((v) => !v)} className="self-center text-caption font-extrabold text-primary underline">
                {showAllRecent ? "Show fewer" : `Show all ${recent.length} recent visits`}
              </button>
            )}
          </section>
        </div>

        {/* Availability aside */}
        <aside id="times" className="flex flex-col gap-4 scroll-mt-6">
          <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-4 md:p-5">
            <p className="flex items-center gap-2 text-[18px] font-extrabold text-ink"><Icon name="event_available" className="text-[22px] text-primary" /> Your free times</p>
            <p className="text-caption text-ink-muted">Add times so patients can book you.</p>
            {(myTimes.data ?? []).length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {(myTimes.data ?? []).slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-[14px]">
                    <span className="font-bold text-ink">{formatDateTime(s.start_time)}</span>
                    <span className={s.is_booked ? "font-bold text-primary" : "text-ink-muted"}>{s.is_booked ? "Booked" : titleCase(s.mode.replace("_", " "))}</span>
                  </li>
                ))}
                {(myTimes.data ?? []).length > 6 && <li className="text-caption text-ink-muted">+{(myTimes.data ?? []).length - 6} more</li>}
              </ul>
            )}
            <button onClick={() => setAvailOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary">
              <Icon name="add" /> Add free times
            </button>
            <Link href="/calendar" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-warm-white text-[14px] font-extrabold text-ink"><Icon name="calendar_month" className="text-[18px]" /> See my week</Link>
          </div>
          <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-warm-white p-4 md:p-5">
            <p className="text-[18px] font-extrabold text-ink">Your numbers</p>
            <ul className="flex flex-col gap-2.5">
              {METRICS.map(([icon, label], i) => (
                <li key={label} className="flex items-center gap-2 text-[14px]">
                  <Icon name={icon} className="text-[18px] text-accent" />
                  <span className="flex-1 text-ink-muted">{label}</span>
                  <span className="font-extrabold text-ink">{metricValues[i]}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <Modal open={availOpen} onClose={() => setAvailOpen(false)} title="Add free time">
        <AvailabilityForm
          clinicAddress={doctor.data?.clinic_address}
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
