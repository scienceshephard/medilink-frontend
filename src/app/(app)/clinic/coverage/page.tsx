"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ClinicCoveragePage() {
  const { data: me, loading, reload } = useApi(() => api.clinics.me(), []);
  const [areas, setAreas] = useState<string[] | null>(null);
  const [specs, setSpecs] = useState<string[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAreas = areas ?? me?.coverage_areas ?? [];
  const currentSpecs = specs ?? me?.specialties_offered ?? [];

  function addArea() {
    const v = draft.trim();
    if (v && !currentAreas.includes(v)) setAreas([...currentAreas, v]);
    setDraft("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.clinics.updateMe({ coverage_areas: currentAreas, specialties_offered: currentSpecs });
      setMsg("Coverage updated.");
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-80 max-w-[760px] rounded-[24px]" />;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Coverage</h1>
      <p className="mt-1 text-body-md text-ink-muted">Areas you serve and care your clinic offers.</p>

      <Card className="mt-6">
        <h2 className="font-extrabold text-ink">Areas you serve</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentAreas.map((a) => (
            <span key={a} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-body-sm font-bold text-accent">
              <Icon name="location_on" className="h-4 w-4" />{a}
              <button onClick={() => setAreas(currentAreas.filter((x) => x !== a))} aria-label={`Remove ${a}`}><Icon name="close" className="h-4 w-4" /></button>
            </span>
          ))}
          {currentAreas.length === 0 && <p className="text-body-md text-ink-muted">No areas set — patients nearby won't find you.</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addArea()} placeholder="Add an area — e.g. Ikoyi" className="flex-1" />
          <Button size="sm" variant="outline" onClick={addArea}>Add</Button>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-extrabold text-ink">Care your clinic offers</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentSpecs.map((s) => (
            <span key={s} className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-body-sm font-bold text-primary">
              {s}
              <button onClick={() => setSpecs(currentSpecs.filter((x) => x !== s))} aria-label={`Remove ${s}`}><Icon name="close" className="h-4 w-4" /></button>
            </span>
          ))}
          {currentSpecs.length === 0 && <p className="text-body-md text-ink-muted">Add what your team offers — used to match requests to you.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["General practice", "Paediatrics", "Mental health", "Physiotherapy", "Home care"].filter((s) => !currentSpecs.includes(s)).map((s) => (
            <button key={s} onClick={() => setSpecs([...currentSpecs, s])} className="rounded-full border border-border px-3 py-1.5 text-body-sm font-bold text-ink-muted hover:border-primary hover:text-primary">+ {s}</button>
          ))}
        </div>
      </Card>

      {error && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      {msg && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{msg}</p>}
      <Button size="lg" full loading={saving} onClick={save} className="mt-6">Save coverage</Button>
    </div>
  );
}
