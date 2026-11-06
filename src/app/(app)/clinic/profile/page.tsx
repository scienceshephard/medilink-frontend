"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ClinicProfilePage() {
  const { data: me, loading, reload } = useApi(() => api.clinics.me(), []);
  const [form, setForm] = useState<{ name: string; phone: string; address: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const f = form ?? { name: me?.name ?? "", phone: me?.phone ?? "", address: me?.address ?? "" };
  const set = (k: string, v: string) => setForm({ ...f, [k]: v });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.clinics.updateMe(f);
      setMsg("Profile updated.");
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-80 max-w-[760px] rounded-[24px]" />;
  if (!me) return <p className="mx-auto max-w-[760px] py-16 text-center text-ink-muted">Could not load clinic profile.</p>;

  const verified = me.verification_status === "verified";

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">{me.name}</h1>
      <div className="mt-1 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-caption font-extrabold ${verified ? "bg-accent-soft text-accent" : "bg-amber-soft text-face-same"}`}>
          {verified ? "Verified" : "Pending review"}
        </span>
        <p className="text-body-md text-ink-muted">{me.email}</p>
      </div>

      {!verified && (
        <Card className="mt-5 bg-amber-soft/40">
          <div className="flex items-start gap-3">
            <Icon name="schedule" className="mt-0.5 h-5 w-5 shrink-0 text-face-same" />
            <p className="text-body-md text-ink-muted">Your registration is under review. You can finish your profile now — requests arrive once you're verified.</p>
          </div>
        </Card>
      )}

      <Card className="mt-5">
        <h2 className="font-extrabold text-ink">Clinic details</h2>
        <div className="mt-4 space-y-4">
          <Input label="Clinic name" value={f.name} onChange={(e) => set("name", e.target.value)} />
          <Input label="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
          <Input label="Address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, area, city" />
        </div>
      </Card>

      {error && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      {msg && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{msg}</p>}
      <Button size="lg" full loading={saving} onClick={save} className="mt-6">Save profile</Button>
    </div>
  );
}
