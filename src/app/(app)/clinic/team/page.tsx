"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ClinicTeamPage() {
  const { data: team, loading, reload } = useApi(() => api.clinics.team(), []);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"clinician" | "nurse">("clinician");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function invite() {
    setSaving(true);
    setError(null);
    try {
      await api.clinics.invite({ doctor_email: email.trim().toLowerCase(), role });
      setMsg(`Invite sent to ${email.trim()}.`);
      setInviteOpen(false);
      setEmail("");
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not invite.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-extrabold text-ink">Team & coverage</h1>
          <p className="mt-1 text-body-md text-ink-muted">Clinicians on your team receive assigned requests.</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}><Icon name="person_add" className="h-5 w-5" /> Invite</Button>
      </div>

      {msg && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{msg}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <Skeleton className="h-40 rounded-[20px]" />
        ) : (team ?? []).length === 0 ? (
          <Card className="py-12 text-center">
            <Icon name="groups" className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-extrabold text-ink">No clinicians yet</p>
            <p className="mt-1 text-body-md text-ink-muted">Invite clinicians by email — they need a MediLink account.</p>
          </Card>
        ) : (
          (team ?? []).map((m) => (
            <Card key={m.id}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft font-extrabold text-primary">{(m.doctor_name ?? "?")[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{m.doctor_name ?? `Clinician #${m.doctor_id}`}</p>
                  <p className="text-body-sm text-ink-muted">{m.specialization ?? "General practice"} · {m.role}</p>
                </div>
                {m.invite_pending
                  ? <span className="rounded-full bg-amber-soft px-3 py-1 text-caption font-extrabold text-face-same">Invite pending</span>
                  : <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-extrabold text-accent">On team</span>}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a clinician">
        <p className="text-body-md text-ink-muted">They get a MediLink notification. They can accept or decline.</p>
        <div className="mt-4 space-y-3">
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="clinician@example.com" type="email" />
          <div className="flex gap-2">
            {(["clinician", "nurse"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`h-10 flex-1 rounded-[14px] text-body-md font-extrabold capitalize ${role === r ? "bg-primary text-on-primary" : "border border-border"}`}>{r}</button>
            ))}
          </div>
          {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
          <Button full loading={saving} disabled={!email.trim()} onClick={invite}>Send invite</Button>
        </div>
      </Modal>
    </div>
  );
}
