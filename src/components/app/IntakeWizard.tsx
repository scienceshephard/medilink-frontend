"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { LocationPicker } from "@/components/app/LocationPicker";
import { Loader } from "@/components/ui/Loader";
import { api, ApiError } from "@/lib/api";
import { RECOMMENDATION_KEY } from "@/lib/recommendations";
import type { SymptomInput } from "@/lib/types";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/app/PageHeader";

const SYMPTOMS: [string, string][] = [
  ["neurology", "Headache"],
  ["thermostat", "Fever"],
  ["monitor_heart", "Chest pain"],
  ["respiratory_rate", "Cough"],
  ["sick", "Stomach pain"],
  ["medical_information", "Ulcer"],
  ["local_dining", "Heartburn"],
  ["restaurant", "Indigestion"],
  ["accessibility_new", "Back pain"],
  ["bedtime", "Tired"],
  ["healing", "Skin rash"],
];

const CONDITIONS = ["None", "High blood pressure", "Diabetes", "Asthma"];

const SEVERITY: [string, string, 1 | 2 | 3][] = [
  ["sentiment_satisfied", "A little", 1],
  ["sentiment_neutral", "Medium", 2],
  ["sentiment_very_dissatisfied", "A lot", 3],
];
const severityMap = { 1: "mild", 2: "moderate", 3: "severe" } as const;

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function IntakeWizard() {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [sev, setSev] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.patients.me().then((profile) => {
      if (active) {
        if (profile.location) setLocation(profile.location);
        if (profile.latitude != null && profile.longitude != null) {
          setCoordinates({ latitude: profile.latitude, longitude: profile.longitude });
        }
        setProfileLoaded(true);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function pickCondition(c: string) {
    setConditions((prev) => (c === "None" ? ["None"] : toggle(prev.filter((x) => x !== "None"), c)));
  }

  async function submit() {
    if (symptoms.length === 0 && !notes.trim()) {
      setError("Choose a symptom or describe how you feel below.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Long-term illness feeds the match: fold the picked conditions into the
      // symptom tokens (minus "None") so the recommender's CBF sees them.
      const history = conditions.filter((c) => c !== "None");
      const payload: SymptomInput = {
        symptoms: [...symptoms, ...history],
        duration_days: durationDays ? Number(durationDays) : null,
        severity: severityMap[sev],
        additional_notes: notes || null,
      };
      if (location.trim() || profileLoaded || coordinates) {
        await api.patients.updateMe({
          location: location.trim(),
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        });
      }
      const [res] = await Promise.all([
        api.patients.recommend(payload),
        new Promise<void>((r) => setTimeout(r, 900)),
      ]);
      sessionStorage.setItem(RECOMMENDATION_KEY, JSON.stringify(res));
      sessionStorage.setItem("medilink:recommendationId", String(res.recommendation_id));
      router.push("/find-care/recommendations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not find doctors. Please try again.");
      setLoading(false);
    }
  }

  if (loading) return <Loader label="Finding your doctors…" />;

  const heading = "text-[24px] font-extrabold leading-tight text-ink";
  const sub = "mt-1 text-[15px] text-ink-muted";

  return (
    <div className="flex flex-col gap-4 pb-4 md:gap-5">
      <PageHeader title="Find care" back="/dashboard" className="md:hidden" />

      <section>
        <h2 className={cn(heading, "md:text-[30px]")}>What is wrong?</h2>
        <p className={sub}>Tap what you feel. You can pick more than one.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {SYMPTOMS.map(([icon, label]) => {
            const on = symptoms.includes(label);
            return (
              <button key={label} type="button" aria-pressed={on} onClick={() => setSymptoms((p) => toggle(p, label))}
                className={cn("flex min-h-[68px] items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors", on ? "border-primary bg-primary-soft" : "border-border bg-warm-white hover:border-primary/50")}>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", on ? "bg-primary text-white" : "bg-sand text-ink")}><Icon name={icon} className="text-[24px]" /></span>
                <span className="text-[16px] font-bold leading-tight text-ink">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className={heading}>Any long-term illness?</h2>
        <p className={sub}>Pick any you have — it helps us find a better doctor for you.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c);
            return <button key={c} type="button" aria-pressed={on} onClick={() => pickCondition(c)} className={cn("inline-flex h-10 items-center rounded-full border px-4 text-[14px] font-bold text-ink transition-colors", on ? "border-primary bg-primary-soft" : "border-border bg-warm-white hover:border-primary/50")}>{c}</button>;
          })}
        </div>
      </section>

      <section>
        <h2 className={heading}>How bad is it?</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {SEVERITY.map(([icon, label, val]) => {
            const on = sev === val;
            const col = val === 1 ? "text-face-better" : val === 2 ? "text-face-same" : "text-face-worse";
            return (
              <button key={label} type="button" aria-pressed={on} onClick={() => setSev(val)} className={cn("flex flex-col items-center justify-center gap-2 rounded-[18px] border py-4 transition-colors", on ? "border-primary bg-primary-soft" : "border-border bg-warm-white hover:border-primary/50")}>
                <Icon name={icon} className={cn("text-[40px]", col)} />
                <span className="text-[15px] font-bold text-ink">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <label htmlFor="notes" className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-[16px] font-bold text-ink"><Icon name="edit" className="text-[18px] text-ink-muted" /> Write more about how you feel</span>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: pain in my chest when I walk, since three days ago…" className="min-h-[110px] w-full rounded-2xl border border-border bg-warm-white p-4 text-[15px] leading-6 text-ink placeholder:text-ink-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </label>

      <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-warm-white p-4 md:p-5">
        <label className="flex flex-col gap-2 text-[16px] font-bold text-ink">
          How long have you felt this way?
          <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} className="h-12 rounded-2xl border border-border bg-warm-white px-3 text-[15px] font-normal text-ink focus:border-primary focus:outline-none md:max-w-[320px]">
            <option value="">Prefer not to say</option><option value="1">Less than 2 days</option><option value="3">2 to 3 days</option><option value="7">4 to 7 days</option><option value="14">More than a week</option>
          </select>
        </label>
        <LocationPicker
          mode="area"
          label="Your area or town"
          text={location}
          onTextChange={setLocation}
          point={coordinates}
          onPointChange={setCoordinates}
          placeholder="For example, Yaba, Lagos"
          hint="Town or neighborhood only — never your home address. A map pin is optional and private; it lets us show distance to doctors."
        />
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[14px] font-bold text-error">{error}</p>}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={submit} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-[18px] font-extrabold text-on-primary transition hover:bg-primary-container">See my doctors <Icon name="arrow_forward" className="text-[22px]" /></button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-ink-muted"><Icon name="lock" className="text-[15px]" /> Private. MediLink does not diagnose or replace urgent care.</p>
      </div>
    </div>
  );
}
