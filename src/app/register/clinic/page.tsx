"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { AuthShell, AuthSubmit } from "@/components/app/AuthShell";
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
  const addArea = () => { if (draftArea.trim()) { setAreas([...areas, draftArea.trim()]); setDraftArea(""); } };

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!canNext) return;
    if (step < 2) setStep(step + 1);
    else void submit();
  }

  return (
    <AuthShell
      photo="clinic"
      card={{ title: "Requests for your area", body: "Assign each one to your team", icon: "inbox" }}
      topText="Already registered?"
      topLink={{ label: "Sign in", href: "/login/clinic" }}
      eyebrow={(
        <span className="flex items-center gap-3">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="font-sans text-[14px] font-bold normal-case tracking-normal text-ink-muted hover:text-ink">← Back</button>}
          <span className="flex gap-1.5">{[0, 1, 2].map((n) => <span key={n} className={`h-1 w-9 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />)}</span>
          Step {step + 1} of 3
        </span>
      )}
      title={STEP_LABELS[step]}
      subtitle={["Your clinic's account and contact details.", "Areas you serve — patients nearby find your clinic.", "What your team offers — used to match requests to you."][step]}
    >
      <form onSubmit={next} className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <Input label="Clinic name" icon="local_hospital" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sunrise Family Clinic" required />
            <Input label="Work email" icon="mail" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@clinic.com" required />
            <Input label="Password" icon="lock" type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" required />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <Input label="Phone" icon="call" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
              <Input label="Address" icon="location_on" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, area, city" />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            {areas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[14px] font-bold text-accent">
                    <Icon name="location_on" className="text-[16px]" />{a}
                    <button type="button" aria-label={`Remove ${a}`} onClick={() => setAreas(areas.filter((x) => x !== a))}><Icon name="close" className="text-[16px]" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Add an area" icon="location_on" value={draftArea} onChange={(e) => setDraftArea(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }} placeholder="e.g. Ikoyi, Yaba, Lekki" />
              </div>
              <button type="button" onClick={addArea} className="h-14 rounded-2xl border border-border bg-warm-white px-5 font-extrabold text-ink hover:bg-primary-soft">Add</button>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {["General practice", "Paediatrics", "Mental health", "Physiotherapy", "Home care", "Cardiology", "Dermatology"].map((s) => {
              const on = specs.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => setSpecs(on ? specs.filter((x) => x !== s) : [...specs, s])}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold ${on ? "border-[1.5px] border-primary bg-primary-soft" : "border-[#E3DCD0] bg-[#FBF9F5]"}`}>
                  {on && <Icon name="check" className="text-[14px] text-primary" />}{s}
                </button>
              );
            })}
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
        <AuthSubmit loading={saving} disabled={!canNext}>{step < 2 ? "Continue" : "Create clinic account"}</AuthSubmit>
      </form>
    </AuthShell>
  );
}
