"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { api, ApiError } from "@/lib/api";
import type { SymptomInput } from "@/lib/types";
import { cn } from "@/components/ui/cn";

const TOTAL_STEPS = 3;

const QUICK_SYMPTOMS = ["Headache", "Back Pain", "Fever", "Nausea", "Cough", "Fatigue"];

const severityMap = { 1: "mild", 2: "moderate", 3: "severe" } as const;

// ── Step 1: Symptoms ────────────────────────────────────────────────────────

function StepSymptoms({
  symptoms,
  onToggle,
  onAdd,
}: {
  symptoms: string[];
  onToggle: (s: string) => void;
  onAdd: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = query.trim();
      if (v) {
        onAdd(v);
        setQuery("");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-caption font-caption uppercase tracking-widest text-primary">
          Step 1 of {TOTAL_STEPS}
        </span>
        <h2 className="text-display-lg font-bold text-on-surface md:w-2/3">
          Tell us how you feel.
        </h2>
        <p className="mt-2 text-body-lg text-on-surface-variant md:w-3/4">
          Describe your symptoms in your own words, or pick from common issues below.
        </p>
      </div>

      {/* Search card */}
      <Card className="flex flex-col gap-md rounded-[24px] border border-outline-variant/30 p-md shadow-card md:p-lg">
        {/* Search input — left icon only, NO right-side icon */}
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[24px] text-on-surface-variant"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., sharp pain in lower back… (press Enter to add)"
            aria-label="Search symptoms"
            className={cn(
              "h-16 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low",
              "pl-14 pr-4 text-body-lg text-on-surface placeholder:text-on-surface-variant/60",
              "transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            )}
          />
        </div>

        {/* Quick-add chips */}
        <div className="flex flex-col gap-sm">
          <span className="text-caption font-caption text-on-surface-variant">
            Common symptoms:
          </span>
          <div className="flex flex-wrap gap-sm">
            {QUICK_SYMPTOMS.map((s) => {
              const active = symptoms.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggle(s)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-label-md font-semibold transition-all",
                    "hover:scale-105 active:scale-95",
                    active
                      ? "border-primary bg-primary-fixed text-on-primary-fixed"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-surface-container-low",
                  )}
                >
                  <Icon
                    name={active ? "check" : "add"}
                    className="text-[18px]"
                  />
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Selected symptoms (custom + quick) */}
      {symptoms.length > 0 && (
        <Card className="rounded-[24px] border border-outline-variant/30 p-md shadow-card md:p-lg">
          <p className="mb-3 text-label-md text-on-surface-variant">
            Selected symptoms
          </p>
          <div className="flex flex-wrap gap-sm">
            {symptoms.map((s) => (
              <Chip key={s} active onClick={() => onToggle(s)}>
                {s}
                <Icon name="close" className="text-[16px]" />
              </Chip>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Step 2: Severity + Duration ─────────────────────────────────────────────

function StepSeverity({
  sev,
  onSev,
  durationDays,
  onDuration,
}: {
  sev: 1 | 2 | 3;
  onSev: (v: 1 | 2 | 3) => void;
  durationDays: string;
  onDuration: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-caption font-caption uppercase tracking-widest text-primary">
          Step 2 of {TOTAL_STEPS}
        </span>
        <h2 className="text-display-lg font-bold text-on-surface md:w-2/3">
          How bad is it?
        </h2>
        <p className="mt-2 text-body-lg text-on-surface-variant md:w-3/4">
          Help us understand the intensity and how long you've been experiencing these symptoms.
        </p>
      </div>

      {/* Severity card */}
      <Card className="flex flex-col gap-lg rounded-[24px] border border-outline-variant/30 p-md shadow-card md:p-lg">
        <div className="flex flex-col gap-xs">
          <h3 className="text-headline-md font-semibold text-on-surface">
            Overall Discomfort Level
          </h3>
          <p className="text-body-md text-on-surface-variant">
            How intensely are these symptoms affecting you right now?
          </p>
        </div>
        <Slider
          value={sev}
          min={1}
          max={3}
          step={1}
          onChange={(v) => onSev(v as 1 | 2 | 3)}
          labels={["Mild", "Moderate", "Severe"]}
        />
      </Card>

      {/* Duration card */}
      <Card className="rounded-[24px] border border-outline-variant/30 p-md shadow-card md:p-lg">
        <div className="mb-4 flex flex-col gap-xs">
          <h3 className="text-headline-md font-semibold text-on-surface">
            Duration
          </h3>
          <p className="text-body-md text-on-surface-variant">
            How many days have you had these symptoms?
          </p>
        </div>
        <Input
          type="number"
          min={1}
          placeholder="e.g. 3"
          value={durationDays}
          onChange={(e) => onDuration(e.target.value)}
          label="Days (optional)"
        />
      </Card>
    </div>
  );
}

// ── Step 3: Notes ────────────────────────────────────────────────────────────

function StepNotes({
  notes,
  onNotes,
}: {
  notes: string;
  onNotes: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-caption font-caption uppercase tracking-widest text-primary">
          Step 3 of {TOTAL_STEPS}
        </span>
        <h2 className="text-display-lg font-bold text-on-surface md:w-2/3">
          Anything else?
        </h2>
        <p className="mt-2 text-body-lg text-on-surface-variant md:w-3/4">
          Share any extra context the more detail you provide, the better we can match you.
        </p>
      </div>

      <Card className="rounded-[24px] border border-outline-variant/30 p-md shadow-card md:p-lg">
        <Textarea
          label="Anything else we should know? (optional)"
          placeholder="E.g., symptoms started after a meal, worse in the morning, recent travel…"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          className="min-h-[160px]"
        />
      </Card>
    </div>
  );
}

// ── Wizard root ──────────────────────────────────────────────────────────────

export function IntakeWizard() {
  const router = useRouter();

  const [step, setStep] = useState(1); // 1-indexed to match Stepper
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [sev, setSev] = useState<1 | 2 | 3>(2);
  const [durationDays, setDurationDays] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function addSymptom(s: string) {
    setSymptoms((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function next() {
    if (step < TOTAL_STEPS) {
      setError(null);
      setStep((s) => s + 1);
      return;
    }

    // Final step — submit
    if (symptoms.length === 0) {
      setError("Please add at least one symptom before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: SymptomInput = {
        symptoms,
        duration_days: durationDays ? parseInt(durationDays, 10) : null,
        severity: severityMap[sev],
        additional_notes: notes || null,
      };

      const [res] = await Promise.all([
        api.patients.recommend(payload),
        new Promise<void>((r) => setTimeout(r, 1200)),
      ]);

      sessionStorage.setItem("telemed:lastRecommendation", JSON.stringify(res));
      sessionStorage.setItem("medilink:recommendationId", String(res.recommendation_id));
      router.push("/recommendations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate recommendations. Please try again.");
      setLoading(false);
    }
  }

  const canContinue = step === 1 ? symptoms.length > 0 : true;

  if (loading) {
    return <Loader label="Analyzing your health…" />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <Stepper current={step} total={TOTAL_STEPS} />

      {/* Step content with fade-in animation */}
      <div className="animate-fade-in">
        {step === 1 && (
          <StepSymptoms
            symptoms={symptoms}
            onToggle={toggleSymptom}
            onAdd={addSymptom}
          />
        )}
        {step === 2 && (
          <StepSeverity
            sev={sev}
            onSev={setSev}
            durationDays={durationDays}
            onDuration={setDurationDays}
          />
        )}
        {step === 3 && (
          <StepNotes notes={notes} onNotes={setNotes} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-body-md text-error">
          {error}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-outline-variant/30 pt-6">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 1}
        >
          Back
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={next}
          disabled={!canContinue}
        >
          {step === TOTAL_STEPS ? "Get my matches" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
