"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";

export default function AdminModelPage() {
  const model = useApi(() => api.admin.modelStatus(), []);
  const [force, setForce] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function retrain() {
    setRetraining(true);
    setMsg(null);
    setError(null);
    try {
      await api.admin.retrain(force);
      setMsg("Done — the brain was taught again.");
      model.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retrain failed.");
    } finally {
      setRetraining(false);
    }
  }

  const parts = [
    { icon: "search", name: "Symptom matching", desc: "Reads symptoms and doctor skills", ok: model.data?.cbf_fitted, extra: `${model.data?.cbf_doctors ?? 0} doctors learned` },
    { icon: "groups", name: "Learns from people", desc: "Uses what patients felt after visits", ok: model.data?.cf_fitted, extra: `${model.data?.cf_patients ?? 0} patients learned` },
  ];
  const working = model.data?.cbf_fitted && model.data?.cf_fitted;

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
              <p className="font-extrabold text-ink">{working ? "The brain is working" : "Partly working"}</p>
              <p className="text-caption text-ink-muted">Both parts are trained and running.</p>
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
                  <Icon name={p.ok ? "check_circle" : "cancel"} className="text-[15px]" /> {p.ok ? "Trained" : "Not trained"}
                </span>
              </div>
              <p className="text-caption font-bold text-ink">📚 {p.extra}</p>
            </div>
          ))}
        </>
      )}

      <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-warm-white p-5">
        <p className="font-extrabold text-ink">Teach the brain again</p>
        <p className="text-caption text-ink-muted">Do this after new patient feedback comes in.</p>
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
    </div>
  );
}
