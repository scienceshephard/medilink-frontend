"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ClinicOnboardingPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [draftArea, setDraftArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm({ ...f, [k]: v });
  const f = form;

  const STEP_LABELS = ["About your clinic", "Where you serve", "What you offer"];

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.auth.registerClinic({
        name: form.name, email: form.email.trim().toLowerCase(), password: form.password,
        phone: form.phone || undefined, address: form.address || undefined,
      });
      setSession(res);
      if (areas.length || specs.length) {
        await api.clinics.updateMe({ coverage_areas: areas, specialties_offered: specs });
      }
      router.push("/clinic/requests");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the account.");
      setSaving(false);
    }
  }

  const canNext = step === 0 ? form.name.trim() && form.email.trim() && form.password.length >= 8 : step === 1 ? areas.length > 0 : specs.length > 0;

  return (
    <div className="mx-auto max-w-[640px] py-8">
      <p className="text-caption font-extrabold uppercase tracking-widest text-primary">Step {step + 1} of 3</p>
      <h1 className="mt-1 text-display-sm font-extrabold text-ink">{STEP_LABELS[step]}</h1>

      <Card className="mt-6">
        {step === 0 && (
          <div className="space-y-4">
            <Input label="Clinic name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sunrise Family Clinic" />
            <Input label="Work email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@clinic.com" />
            <Input label="Password" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
            <Input label="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
            <Input label="Address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, area, city" />
          </div>
        )}
        {step === 1 && (
          <div>
            <p className="text-body-md text-ink-muted">Areas you serve — patients nearby find your clinic.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {areas.map((a) => (
                <span key={a} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-body-sm font-bold text-accent">
                  <Icon name="location_on" className="h-4 w-4" />{a}
                  <button onClick={() => setAreas(areas.filter((x) => x !== a))}><Icon name="close" className="h-4 w-4" /></button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={draftArea} onChange={(e) => setDraftArea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draftArea.trim()) { setAreas([...areas, draftArea.trim()]); setDraftArea(""); } }} placeholder="e.g. Ikoyi, Yaba, Lekki" className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { if (draftArea.trim()) { setAreas([...areas, draftArea.trim()]); setDraftArea(""); } }}>Add</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="text-body-md text-ink-muted">What your team offers — used to match requests to you.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["General practice", "Paediatrics", "Mental health", "Physiotherapy", "Home care", "Cardiology", "Dermatology"].map((s) => (
                <button key={s} onClick={() => setSpecs(specs.includes(s) ? specs.filter((x) => x !== s) : [...specs, s])}
                  className={`rounded-full px-4 py-2 text-body-sm font-bold ${specs.includes(s) ? "bg-primary text-on-primary" : "border border-border text-ink"}`}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {error && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      <div className="mt-6 flex gap-3">
        {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 2 ? (
          <Button full disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button full loading={saving} disabled={!canNext} onClick={submit}>Create clinic account</Button>
        )}
      </div>
    </div>
  );
}
