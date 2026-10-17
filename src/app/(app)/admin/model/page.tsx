"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";

export default function AdminModelPage() {
  const model = useApi(() => api.admin.modelStatus(), []);
  const safety = useApi(() => api.admin.matchingSettings(), []);
  const [force, setForce] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function retrain() {
    setRetraining(true);
    setMsg(null);
    setError(null);
    try {
      const result = await api.admin.retrain(force);
      setMsg(result.message ?? "Retraining request finished.");
      model.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retrain failed.");
    } finally {
      setRetraining(false);
    }
  }

  const parts = [
    { icon: "search", name: "Symptom matching", desc: "Reads symptoms and doctor skills", ok: model.data?.cbf_fitted, extra: `${model.data?.cbf_doctors ?? 0} doctors learned` },
    { icon: "groups", name: "Learns from in-app feedback", desc: "Personalizes only from real MediLink patient and doctor IDs", ok: model.data?.cf_usable, extra: model.data?.cf_usable ? `${model.data?.cf_patients ?? 0} app patients learned` : "Not active until enough in-app feedback is available" },
  ];
  const working = model.data?.cbf_fitted && model.data?.cf_usable;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
      <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">The matching brain</h1>

      {model.loading ? (
        <Skeleton className="h-24 rounded-[20px]" />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-[20px] bg-accent-soft p-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-on-primary"><Icon name="neurology" /></span>
            <div>
              <p className="font-extrabold text-ink">{working ? "Symptom matching and personalization ready" : model.data?.cbf_fitted ? "Symptom matching ready; personalization paused" : "No verified doctor profiles yet"}</p>
              <p className="text-caption text-ink-muted">Symptom matching uses current verified doctor profiles. Collaborative ranking stays off until it has trusted in-app feedback.</p>
            </div>
          </div>

          {parts.map((p) => (
            <div key={p.name} className="flex flex-col gap-2 rounded-[18px] border border-border bg-warm-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={p.icon} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{p.name}</p>
                  <p className="text-caption text-ink-muted">{p.desc}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-caption font-bold ${p.ok ? "bg-accent-soft text-accent" : "bg-red-soft text-error"}`}>
                  <Icon name={p.ok ? "check_circle" : "cancel"} className="text-[15px]" /> {p.name === "Symptom matching" ? (p.ok ? "Ready" : "Unavailable") : (p.ok ? "Active" : "Paused")}
                </span>
              </div>
              <p className="text-caption font-bold text-ink">📚 {p.extra}</p>
            </div>
          ))}
        </>
      )}

      <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-5">
        <p className="font-extrabold text-ink">Teach the brain again</p>
        <p className="text-caption text-ink-muted">Retraining uses current verified doctor profiles and completed visits with in-app feedback.</p>
        {msg && <p className="rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{msg}</p>}
        {error && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{error}</p>}
        <button onClick={retrain} disabled={retraining} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-extrabold text-on-primary disabled:opacity-50">
          <Icon name="model_training" /> {retraining ? "Teaching…" : "Retrain now"}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-caption text-ink-muted">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="h-5 w-5 rounded border-border accent-primary" />
          Force retrain (even with little data)
        </label>
      </div>

      <section className="flex flex-col gap-4 rounded-[18px] border border-border bg-warm-white p-5" aria-labelledby="matching-safety-heading">
        <div>
          <h2 id="matching-safety-heading" className="font-extrabold text-ink">Matching and safety rules</h2>
          <p className="text-caption text-ink-muted">Active values reported by the backend. These are deployment-managed and cannot be edited from this page.</p>
        </div>
        {safety.loading ? <Skeleton className="h-24 rounded-xl" /> : safety.error ? <p role="alert" className="rounded-xl bg-red-soft px-4 py-3 text-caption font-bold text-error">{safety.error}</p> : safety.data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Setting label="Recommendations shown" value={String(safety.data.top_n_recommendations)} />
              <Setting label="Cold-start period" value={`${safety.data.cold_start_threshold} consultations`} />
              <Setting label="Low-match general-care fallback" value={safety.data.primary_care_fallback ? "Enabled" : "Disabled"} />
              <Setting label="Red-flag symptom screen" value={safety.data.red_flag_screening ? "Enabled" : "Disabled"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <WeightCard title="New patient ranking" weights={safety.data.cold_start_weights} />
              <WeightCard title="Established patient ranking" weights={safety.data.mature_weights} />
            </div>
            <p className="text-caption text-ink-muted">The red-flag screen does not diagnose. Emergency symptoms are directed to urgent in-person care. When symptoms do not clearly match a specialty, available primary care clinicians are preferred.</p>
          </>
        )}
      </section>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-sand p-3"><p className="text-caption text-ink-muted">{label}</p><p className="mt-0.5 font-extrabold text-ink">{value}</p></div>;
}

function WeightCard({ title, weights }: { title: string; weights: { collaborative: number; symptom: number; profile: number } }) {
  return <div className="rounded-xl border border-border p-3"><p className="mb-2 text-caption font-extrabold text-ink">{title}</p><div className="grid grid-cols-3 gap-2 text-center text-caption"><span><strong className="block text-body-md text-ink">{Math.round(weights.collaborative * 100)}%</strong>History</span><span><strong className="block text-body-md text-ink">{Math.round(weights.symptom * 100)}%</strong>Symptoms</span><span><strong className="block text-body-md text-ink">{Math.round(weights.profile * 100)}%</strong>Profile</span></div></div>;
}
