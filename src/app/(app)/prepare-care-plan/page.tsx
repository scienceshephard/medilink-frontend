"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CarePlanStep } from "@/lib/types";

const FOLLOW_UPS = [
  { key: "none", label: "No follow-up" },
  { key: "1_week", label: "1 week" },
  { key: "2_weeks", label: "2 weeks" },
];

export default function PrepareCarePlanPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[860px] rounded-[24px]" />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const params = useSearchParams();
  const router = useRouter();
  const consultId = Number(params.get("consultation"));
  const { data: consult } = useApi(
    () => (consultId ? api.consultations.get(consultId) : Promise.resolve(null)),
    [consultId],
  );

  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<CarePlanStep[]>([{ text: "" }]);
  const [followUp, setFollowUp] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStep(i: number, text: string) {
    setSteps((s) => s.map((x, j) => (j === i ? { text } : x)));
  }

  async function submit() {
    if (!consultId) { setError("Missing consultation id — open this from a visit."); return; }
    setSaving(true);
    setError(null);
    try {
      const plan = await api.carePlans.create({
        consultation_id: consultId,
        summary,
        steps: steps.filter((s) => s.text.trim()),
        follow_up: followUp === "none" ? undefined : followUp,
      });
      router.push(`/care-plan?id=${plan.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the plan.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <h1 className="text-display-sm font-extrabold text-ink">Prepare a care plan</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        {consult?.symptom_input ? `After today's visit — “${consult.symptom_input}”` : "Share it with your patient after the visit."}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-extrabold text-ink">Summary for the patient</h2>
          <p className="mt-1 text-body-sm text-ink-muted">Write it like you would explain it to them — plain words, no jargon.</p>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Your headaches are most likely tension-related. Here is what to do this week…"
            className="mt-3 min-h-[140px]"
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-extrabold text-ink">Steps for the week</h2>
            <div className="mt-3 space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={s.text} onChange={(e) => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} />
                  {steps.length > 1 && (
                    <button onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label="Remove step" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand">
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setSteps((s) => [...s, { text: "" }])} className="flex items-center gap-2 text-body-md font-bold text-primary">
                <Icon name="add" className="h-5 w-5" /> Add another step
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="font-extrabold text-ink">Follow-up</h2>
            <div className="mt-3 flex gap-2">
              {FOLLOW_UPS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFollowUp(f.key)}
                  className={`h-10 flex-1 rounded-[14px] text-body-md font-extrabold ${followUp === f.key ? "bg-accent text-on-primary" : "border border-border text-ink"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
      <Button size="lg" full loading={saving} onClick={submit} className="mt-6">
        <Icon name="send" className="h-5 w-5" /> Send care plan
      </Button>
    </div>
  );
}
