"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ClinicRequest } from "@/lib/types";

const TABS = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "done", label: "Done" },
];

const SEVERITY_STYLE: Record<string, string> = {
  mild: "bg-accent-soft text-accent",
  moderate: "bg-amber-soft text-face-same",
  severe: "bg-red-soft text-face-worse",
};

export default function ClinicRequestsPage() {
  const [tab, setTab] = useState("new");
  const { data: requests, loading, reload } = useApi(() => api.clinics.requests(tab), [tab]);
  const { data: team } = useApi(() => api.clinics.team(), []);
  const [target, setTarget] = useState<ClinicRequest | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    if (!target || !doctorId) return;
    setSaving(true);
    setError(null);
    try {
      await api.clinics.assign(target.id, { doctor_id: doctorId, note: note || undefined });
      setTarget(null);
      setNote("");
      setDoctorId(null);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not assign.");
    } finally {
      setSaving(false);
    }
  }

  const doctors = (team ?? []).filter((m) => !m.invite_pending && m.role === "clinician");

  return (
    <div className="mx-auto max-w-[860px]">
      <h1 className="text-display-sm font-extrabold text-ink">Care requests</h1>
      <p className="mt-1 text-body-md text-ink-muted">Review incoming requests and assign a clinician.</p>

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`h-10 rounded-full px-5 text-body-md font-extrabold ${tab === t.key ? "bg-primary text-on-primary" : "border border-border bg-warm-white text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <Skeleton className="h-40 rounded-[20px]" />
        ) : (requests ?? []).length === 0 ? (
          <Card className="py-12 text-center">
            <Icon name="inbox" className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-extrabold text-ink">{tab === "new" ? "No new requests" : `No ${tab} requests`}</p>
            <p className="mt-1 text-body-md text-ink-muted">New requests appear here when a patient chooses your clinic.</p>
          </Card>
        ) : (
          (requests ?? []).map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="person" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{r.patient_name ?? `Patient #${r.patient_id}`}</p>
                  <p className="truncate text-body-sm text-ink-muted">{r.symptom_input ?? "No symptoms noted"}</p>
                </div>
                {r.severity && <span className={`rounded-full px-3 py-1 text-caption font-extrabold capitalize ${SEVERITY_STYLE[r.severity] ?? "bg-surface-container text-ink"}`}>{r.severity}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-body-sm text-ink-muted">
                <span className="flex items-center gap-1.5"><Icon name={r.visit_mode === "home_visit" ? "home_health" : r.visit_mode === "video" ? "videocam" : "local_hospital"} className="h-4 w-4" />{r.visit_mode === "home_visit" ? "Home visit" : r.visit_mode === "video" ? "Video" : "Clinic visit"}</span>
                <span className="flex items-center gap-1.5"><Icon name="calendar_month" className="h-4 w-4" />{new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                {r.assigned_doctor_name && <span className="flex items-center gap-1.5 font-bold text-accent"><Icon name="person" className="h-4 w-4" />{r.assigned_doctor_name}</span>}
                {r.status === "new" && <Button size="sm" className="ml-auto" onClick={() => setTarget(r)}>Review & assign</Button>}
                {r.status === "assigned" && <span className="ml-auto"><StatusBadge tone="success">Assigned</StatusBadge></span>}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={target != null} onClose={() => setTarget(null)} title="Assign this request">
        {target && (
          <div>
            <p className="text-body-md text-ink-muted"><span className="font-extrabold text-ink">{target.patient_name ?? `Patient #${target.patient_id}`}</span> — {target.symptom_input ?? "no symptoms noted"}.</p>
            <p className="mt-4 mb-2 text-body-sm font-extrabold text-ink">Assign to a clinician</p>
            <div className="space-y-2">
              {doctors.length === 0 && <p className="text-body-md text-ink-muted">No clinicians on your team yet — invite them from Team & coverage.</p>}
              {doctors.map((d) => (
                <button key={d.doctor_id} onClick={() => setDoctorId(d.doctor_id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${doctorId === d.doctor_id ? "border-accent bg-accent-soft" : "border-border"}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-extrabold text-primary">{(d.doctor_name ?? "?")[0]}</span>
                  <div className="flex-1"><p className="font-extrabold text-ink">{d.doctor_name ?? "Clinician"}</p><p className="text-caption text-ink-muted">{d.specialization ?? "General practice"}</p></div>
                  {doctorId === d.doctor_id && <Icon name="check_circle" className="text-accent" />}
                </button>
              ))}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the clinician" className="mt-4 min-h-[72px]" />
            {error && <p className="mt-3 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
            <div className="mt-5 grid gap-2">
              <Button full loading={saving} disabled={!doctorId} onClick={assign}>Assign & notify</Button>
              <Button full variant="outline" onClick={() => setTarget(null)}>Back</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
