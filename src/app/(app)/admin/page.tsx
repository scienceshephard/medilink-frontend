"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { PendingDoctorRow } from "@/components/app/PendingDoctorRow";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";

const KPIS: [string, string][] = [
  ["groups", "Patients"],
  ["stethoscope", "Doctors"],
  ["event", "Visits"],
];

export default function AdminPage() {
  const stats = useApi(() => api.admin.stats(), []);
  const model = useApi(() => api.admin.modelStatus(), []);
  const pending = useApi(() => api.admin.pendingDoctors(), []);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>, id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      pending.reload();
      stats.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }
  async function retrain() {
    setRetraining(true);
    setRetrainMsg(null);
    setActionError(null);
    try {
      const result = await api.admin.retrain(false);
      setRetrainMsg(result.message ?? "Retraining request finished.");
      model.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Retrain failed.");
    } finally {
      setRetraining(false);
    }
  }

  const coldStart = Math.round((stats.data?.cold_start_rate ?? 0) * 100);
  const ready = model.data ? (model.data.cbf_fitted ? (model.data.cf_usable ? "Matching ready" : "Symptom matching ready") : "No doctors") : "—";
  const kpiValues = [stats.data?.total_patients, stats.data?.total_doctors, stats.data?.total_consultations];

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold text-ink">Overview</h1>
        <button onClick={retrain} disabled={retraining} className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-5 font-extrabold text-primary disabled:opacity-50">
          <Icon name="model_training" className="text-[18px]" /> {retraining ? "…" : "Retrain"}
        </button>
      </div>

      {actionError && <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-error">{actionError}</p>}
      {retrainMsg && <p className="rounded-xl bg-accent-soft px-4 py-3 font-bold text-accent">{retrainMsg}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {KPIS.map(([icon, label], i) => (
          <div key={label} className="flex flex-col gap-2 rounded-[18px] border border-border bg-warm-white p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} className="text-[20px]" /></span>
            {stats.loading ? <Skeleton className="h-8 w-16" /> : <span className="text-display-lg font-extrabold text-ink">{kpiValues[i] ?? 0}</span>}
            <span className="text-caption text-ink-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Engine health */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[18px] border border-border bg-warm-white p-5">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-headline-md font-extrabold text-accent">{coldStart}%</span>
          <div>
            <p className="font-extrabold text-ink">Cold-start recommendations</p>
            <p className="text-caption text-ink-muted">Rankings led by symptom/profile matching · {stats.data?.pending_verifications ?? 0} doctors waiting</p>
          </div>
        </div>
        <Link href="/admin/model" className="flex items-center justify-between gap-4 rounded-[18px] border border-border bg-warm-white p-5">
          <div className="flex items-center gap-3">
            <Icon name="neurology" className="text-primary" />
            <div>
              <p className="font-extrabold text-ink">The matching brain</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-bold text-accent">
                <Icon name="check_circle" className="text-[14px]" /> {ready}
              </span>
            </div>
          </div>
          <Icon name="chevron_right" className="text-ink-muted" />
        </Link>
      </div>

      {/* Verification queue */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md font-extrabold text-ink">Doctors waiting to join</h2>
          <Link href="/admin/doctors" className="font-extrabold text-primary">See all</Link>
        </div>
        {pending.loading ? (
          <Skeleton className="h-20 rounded-[18px]" />
        ) : (pending.data ?? []).length === 0 ? (
          <p className="rounded-[18px] border border-border bg-warm-white p-5 text-body-md text-ink-muted">No doctors are waiting right now.</p>
        ) : (
          (pending.data ?? []).map((d) => (
            <PendingDoctorRow
              key={d.id}
              doctor={d}
              busy={busyId === d.id}
              onVerify={() => act(() => api.admin.verifyDoctor(d.id), d.id)}
              onSuspend={() => act(() => api.admin.suspendDoctor(d.id), d.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}
