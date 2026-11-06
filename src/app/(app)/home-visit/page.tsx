"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const STEPS = [
  { key: "en_route", label: "On the way", icon: "directions" },
  { key: "arrived", label: "Arrived", icon: "location_on" },
  { key: "done", label: "Visit done", icon: "check_circle" },
] as const;

export default function HomeVisitPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-[760px] rounded-[24px]" />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const params = useSearchParams();
  const consultId = Number(params.get("id"));
  const { role } = useAuth();
  const { data: consult, loading, error, reload } = useApi(
    () => (consultId ? api.consultations.get(consultId) : Promise.resolve(null)),
    [consultId],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function advance(next: "en_route" | "arrived" | "done") {
    setBusy(true);
    setErr(null);
    try {
      await api.consultations.setVisitStatus(consultId, next);
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update the visit.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="mx-auto h-96 max-w-[760px] rounded-[24px]" />;
  if (error || !consult) return <p className="mx-auto max-w-[760px] py-16 text-center text-ink-muted">{error ?? "Visit not found."}</p>;

  const current = consult.visit_status ?? null;
  const idx = STEPS.findIndex((s) => s.key === current);
  const nextStep = idx < 0 ? STEPS[0] : idx < STEPS.length - 1 ? STEPS[idx + 1] : null;

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-display-sm font-extrabold text-ink">Home visit</h1>
      <p className="mt-1 text-body-md text-ink-muted">
        {new Date(consult.scheduled_datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        {consult.location ? ` · ${consult.location}` : ""}
      </p>

      <Card className="mt-6">
        <ol className="space-y-0">
          {STEPS.map((s, i) => {
            const reached = i <= idx;
            const isCurrent = i === idx || (idx < 0 && i === 0);
            return (
              <li key={s.key} className="flex items-center gap-3 py-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${reached ? "bg-accent text-on-primary" : "border-2 border-border text-ink-muted"}`}>
                  <Icon name={reached ? "check" : s.icon} className="h-5 w-5" />
                </span>
                <span className={`flex-1 text-body-md ${reached ? "font-extrabold text-ink" : isCurrent ? "font-extrabold text-ink" : "text-ink-muted"}`}>{s.label}</span>
                {isCurrent && !reached && idx < 0 && <span className="text-caption font-bold text-primary">Up next</span>}
                {isCurrent && reached && <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent">Now</span>}
              </li>
            );
          })}
        </ol>
      </Card>

      {consult.symptom_input && (
        <Card className="mt-4">
          <p className="text-body-sm font-bold text-ink-muted">Reported concern</p>
          <p className="mt-1 text-body-md text-ink">“{consult.symptom_input}”</p>
        </Card>
      )}

      {role === "doctor" && nextStep && (
        <>
          {err && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{err}</p>}
          <Button size="lg" full loading={busy} onClick={() => advance(nextStep.key)} className="mt-6">
            <Icon name={nextStep.icon} className="h-5 w-5" /> Mark: {nextStep.label}
          </Button>
        </>
      )}
      {role === "doctor" && current === "done" && (
        <Link href={`/visit-notes?id=${consultId}`} className="mt-6 block">
          <Button size="lg" full><Icon name="edit_note" className="h-5 w-5" /> Write visit notes</Button>
        </Link>
      )}
      {role === "patient" && current === "done" && (
        <Card className="mt-4 bg-accent-soft">
          <p className="font-extrabold text-ink">Visit complete</p>
          <p className="mt-1 text-body-md text-ink-muted">Check your care plan and visit summary.</p>
          <Link href="/care-plan" className="mt-3 inline-block font-bold text-primary">Open care plan →</Link>
        </Card>
      )}
    </div>
  );
}
