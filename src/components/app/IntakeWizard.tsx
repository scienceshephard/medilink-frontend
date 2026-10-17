"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { api, ApiError } from "@/lib/api";
import { RECOMMENDATION_KEY } from "@/lib/recommendations";
import type { SymptomInput } from "@/lib/types";
import { cn } from "@/components/ui/cn";
import { FindCareSteps } from "@/components/app/FindCareSteps";

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
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not provide location access. You can still enter your area above.");
      return;
    }
    setLocationMessage("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      ({ coords: current }) => {
        setCoordinates({ latitude: current.latitude, longitude: current.longitude });
        setLocationMessage("Approximate distance can now be included in your matches.");
      },
      () => setLocationMessage("Location was not shared. You can still find care using your area name."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
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

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 pb-5">
      <FindCareSteps current="symptoms" />
      <div className="max-w-[720px]">
        <p className="text-[12px] font-bold uppercase tracking-[.16em] text-[#65756F]">Let’s find the right care</p>
        <h1 className="mt-2 font-serif text-[clamp(36px,5vw,52px)] leading-[1.08] tracking-[-.04em] text-[#19352E]">Tell us what’s been bothering you.</h1>
        <p className="mt-3 max-w-[650px] text-[16px] leading-7 text-[#65756F]">Write in your own words. You can also choose a few symptoms to help us understand. You do not need to know what condition you have.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
       <div className="flex flex-col gap-6 rounded-[24px] border border-[#E4E9E5] bg-white p-5 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-[13px] font-bold text-[#19352E]">
            How long have you felt this way?
            <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)} className="h-12 rounded-xl border border-[#D7E1DB] bg-white px-3 text-[14px] font-normal text-[#19352E] focus:border-[#286653] focus:outline-none">
              <option value="">Prefer not to say</option><option value="1">Less than 2 days</option><option value="3">2 to 3 days</option><option value="7">4 to 7 days</option><option value="14">More than a week</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-bold text-[#19352E]">
            Your area or town
            <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} placeholder="For example, Yaba, Lagos" className="h-12 rounded-xl border border-[#D7E1DB] bg-white px-3 text-[14px] font-normal text-[#19352E] placeholder:text-[#8B9691] focus:border-[#286653] focus:outline-none" />
            <span className="text-[11px] font-normal leading-4 text-[#65756F]">Town or neighborhood only. Never enter your home address here.</span>
          </label>
        </div>
        <div className="-mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={useCurrentLocation} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#D7E1DB] px-3 text-[12px] font-bold text-[#286653]"><Icon name="my_location" />Use my current location</button>
          {coordinates && <button type="button" onClick={() => { setCoordinates(null); setLocationMessage("Precise location will be removed when you submit."); }} className="text-[12px] font-bold text-[#65756F] underline">Remove precise location</button>}
          {locationMessage && <span role="status" className="text-[12px] text-[#65756F]">{locationMessage}</span>}
        </div>
        <p className="-mt-4 text-[11px] leading-4 text-[#65756F]">Precise coordinates are optional and private. They help estimate straight-line distance, not driving distance.</p>

        <div>
          <h2 className="font-serif text-[24px] text-[#19352E]">What are you feeling?</h2>
          <p className="mb-4 mt-1 text-[13px] text-[#65756F]">Choose any that fit, or skip this and write below.</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SYMPTOMS.map(([icon, label]) => {
              const on = symptoms.includes(label);
              return <button key={label} type="button" aria-pressed={on} onClick={() => setSymptoms((p) => toggle(p, label))} className={cn("flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors", on ? "border-[#286653] bg-[#EAF3EE]" : "border-[#E4E9E5] bg-white hover:bg-[#F5F7F3]")}>
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", on ? "bg-[#286653] text-white" : "bg-[#F0F2EA] text-[#65756F]")}><Icon name={icon} /></span><span className="text-[13px] font-semibold text-[#19352E]">{label}</span>
              </button>;
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div><h2 className="font-serif text-[24px] text-[#19352E]">Anything else we should know?</h2><p className="mt-1 text-[13px] text-[#65756F]">Long-term conditions can help clinicians understand your concern.</p></div>
          <div className="flex flex-wrap gap-2">{CONDITIONS.map((c) => { const on = conditions.includes(c); return <button key={c} type="button" aria-pressed={on} onClick={() => pickCondition(c)} className={cn("rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors", on ? "border-[#286653] bg-[#EAF3EE] text-[#19352E]" : "border-[#E4E9E5] bg-white text-[#65756F] hover:bg-[#F5F7F3]")}>{c}</button>; })}</div>
        </div>

        <div className="flex flex-col gap-3">
          <div><h2 className="font-serif text-[24px] text-[#19352E]">How much is it affecting you?</h2><p className="mt-1 text-[13px] text-[#65756F]">Choose the option that feels closest.</p></div>
          <div className="grid grid-cols-3 gap-2.5">{SEVERITY.map(([icon, label, val]) => { const on = sev === val; const col = val === 1 ? "text-face-better" : val === 2 ? "text-face-same" : "text-face-worse"; return <button key={label} type="button" aria-pressed={on} onClick={() => setSev(val)} className={cn("flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl border transition-colors", on ? "border-[#286653] bg-[#EAF3EE]" : "border-[#E4E9E5] bg-white hover:bg-[#F5F7F3]")}><Icon name={icon} className={cn("text-[28px]", col)} /><span className="text-[12px] font-semibold text-[#19352E]">{label}</span></button>; })}</div>
        </div>

        <label htmlFor="notes" className="flex flex-col gap-2 text-[13px] font-bold text-[#19352E]">Describe it in your own words <span className="text-[12px] font-normal text-[#65756F]">Include where it hurts, what it feels like, and anything that makes it better or worse.</span>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: I have lower abdominal pain, vomiting, and frequent loose stools…" className="min-h-[150px] w-full rounded-xl border border-[#D7E1DB] bg-[#FCFBF8] p-4 text-[14px] font-normal leading-6 text-[#19352E] placeholder:text-[#8B9691] focus:border-[#286653] focus:outline-none focus:ring-2 focus:ring-[#286653]/15" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-[13px] font-bold text-error">{error}</p>}
        <button type="button" onClick={submit} className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-[#286653] px-7 text-[14px] font-bold text-white transition hover:bg-[#1F5544]">See my doctor matches <Icon name="arrow_forward" /></button>
        <p className="-mt-4 text-[11px] text-[#65756F]">MediLink helps you connect with clinicians. It does not diagnose or replace urgent medical care.</p>
       </div>
       <aside className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
         <div className="overflow-hidden rounded-[22px] bg-[#EAF3EE]"><div className="h-[205px] bg-cover bg-center" role="img" aria-label="Doctor ready to listen" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=85')" }} /><div className="p-5"><h2 className="font-serif text-[23px] leading-tight text-[#19352E]">A real person will take it from here.</h2><p className="mt-2 text-[13px] leading-6 text-[#65756F]">Clinicians review your concern and choose how best to help. You are always in control of the next step.</p></div></div>
         <div className="rounded-[18px] border border-[#E4E9E5] bg-white p-5"><p className="flex items-center gap-2 text-[13px] font-bold text-[#286653]"><Icon name="lock" />Your information is private</p><p className="mt-2 text-[12px] leading-5 text-[#65756F]">Only clinicians involved in your care can see what you share.</p></div>
       </aside>
      </div>
    </div>
  );
}
