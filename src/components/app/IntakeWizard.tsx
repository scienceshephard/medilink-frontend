"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { api, ApiError } from "@/lib/api";
import type { SymptomInput } from "@/lib/types";
import { cn } from "@/components/ui/cn";

const SYMPTOMS: [string, string][] = [
  ["neurology", "Headache"],
  ["thermostat", "Fever"],
  ["monitor_heart", "Chest pain"],
  ["respiratory_rate", "Cough"],
  ["sick", "Stomach"],
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCondition(c: string) {
    setConditions((prev) => (c === "None" ? ["None"] : toggle(prev.filter((x) => x !== "None"), c)));
  }

  async function submit() {
    if (symptoms.length === 0) {
      setError("Please tap at least one thing you feel.");
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
        duration_days: null,
        severity: severityMap[sev],
        additional_notes: notes || null,
      };
      const [res] = await Promise.all([
        api.patients.recommend(payload),
        new Promise<void>((r) => setTimeout(r, 900)),
      ]);
      sessionStorage.setItem("telemed:lastRecommendation", JSON.stringify(res));
      sessionStorage.setItem("medilink:recommendationId", String(res.recommendation_id));
      router.push("/recommendations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not find doctors. Please try again.");
      setLoading(false);
    }
  }

  if (loading) return <Loader label="Finding your doctors…" />;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 pb-4">
      <div>
        <h1 className="text-headline-lg font-extrabold text-ink">What is wrong?</h1>
        <p className="text-body-md text-ink-muted">Tap what you feel. You can pick more than one.</p>
      </div>

      {/* Symptom tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SYMPTOMS.map(([icon, label]) => {
          const on = symptoms.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSymptoms((p) => toggle(p, label))}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                on ? "border-2 border-primary bg-primary-soft" : "border border-border bg-warm-white hover:bg-primary-soft/40",
              )}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", on ? "bg-primary text-on-primary" : "bg-sand text-ink")}>
                <Icon name={icon} />
              </span>
              <span className="font-bold text-ink">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Long-term illness → feeds the match */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-headline-md font-extrabold text-ink">Any long-term illness?</h2>
        <p className="text-caption text-ink-muted">Pick any you have — it helps us find a better doctor for you.</p>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => pickCondition(c)}
                className={cn(
                  "h-10 rounded-full px-4 font-bold transition-colors",
                  on ? "border-2 border-primary bg-primary-soft text-ink" : "border border-border bg-warm-white text-ink hover:bg-primary-soft/40",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity faces */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-headline-md font-extrabold text-ink">How bad is it?</h2>
        <div className="grid grid-cols-3 gap-3">
          {SEVERITY.map(([icon, label, val]) => {
            const on = sev === val;
            const col = val === 1 ? "text-face-better" : val === 2 ? "text-face-same" : "text-face-worse";
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSev(val)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border py-4 transition-colors",
                  on ? "border-2 border-primary bg-primary-soft" : "border border-border bg-warm-white hover:bg-primary-soft/40",
                )}
              >
                <Icon name={icon} className={cn("text-[40px]", col)} />
                <span className="font-bold text-ink">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Describe */}
      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="flex items-center gap-1.5 font-bold text-ink">
          <Icon name="edit" className="text-ink-muted" /> Write more about how you feel
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="For example: pain in my chest when I walk, since two days ago…"
          className="min-h-[96px] w-full rounded-2xl border border-border bg-warm-white p-4 text-body-md placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}

      <button
        type="button"
        onClick={submit}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-body-lg font-extrabold text-on-primary transition-colors hover:bg-primary-container"
      >
        See my doctors <Icon name="arrow_forward" />
      </button>
    </div>
  );
}
