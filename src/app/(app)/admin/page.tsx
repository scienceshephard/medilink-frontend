"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RingScore } from "@/components/ui/RingScore";
import { PendingDoctorRow } from "@/components/app/PendingDoctorRow";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";

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
      await api.admin.retrain(false);
      setRetrainMsg("Retrain triggered — models rebuilt and reloaded.");
      model.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Retrain failed.");
    } finally {
      setRetraining(false);
    }
  }

  const accuracy = stats.data?.avg_recommendation_score ?? 0;
  const coldStart = Math.round((stats.data?.cold_start_rate ?? 0) * 100);
  const modelsReady = model.data
    ? model.data.cbf_fitted && model.data.cf_fitted
      ? "Ready"
      : "Partial"
    : "—";

  return (
    <>
      {/* Header */}
      <header className="mb-lg flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline-lg text-on-background">
            Matching Metrics Overview
          </h1>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Real-time performance of the TeleMed routing engine.
          </p>
        </div>
        <Button
          variant="outline"
          loading={retraining}
          onClick={retrain}
          className="shrink-0"
        >
          <Icon name="model_training" className="text-[18px]" />
          Trigger retrain
        </Button>
      </header>

      {actionError && (
        <div className="mb-md rounded-lg bg-error-container px-md py-sm text-label-md text-on-error-container">
          {actionError}
        </div>
      )}
      {retrainMsg && (
        <div className="mb-md rounded-lg bg-success-container px-md py-sm text-label-md text-on-success-container">
          {retrainMsg}
        </div>
      )}

      {/* KPI bento grid */}
      <section className="mb-xl grid grid-cols-1 gap-md md:grid-cols-3">
        <KpiCard
          watermark="groups"
          tone="text-primary"
          label="Total Patients"
          value={stats.data?.total_patients}
          sub="Registered on the platform"
          loading={stats.loading}
        />
        <KpiCard
          watermark="medical_services"
          tone="text-tertiary"
          label="Active Doctors"
          value={stats.data?.total_doctors}
          sub="Verified providers"
          loading={stats.loading}
        />
        <KpiCard
          watermark="event"
          tone="text-secondary"
          label="Total Consultations"
          value={stats.data?.total_consultations}
          sub="Completed & scheduled bookings"
          loading={stats.loading}
        />
      </section>

      {/* Engine health row */}
      <section className="mb-xl grid grid-cols-1 gap-md lg:grid-cols-[1fr_minmax(0,1.4fr)]">
        {/* Match accuracy ring */}
        <Card className="flex items-center justify-between gap-md">
          <div>
            <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
              <Icon name="my_location" fill className="text-[18px] text-primary" />
              Average Match Accuracy
            </p>
            <p className="mt-sm max-w-[220px] text-caption text-on-surface-variant">
              Mean hybrid match confidence across logged recommendation
              sessions.
            </p>
            <div className="mt-md flex flex-wrap gap-x-md gap-y-xs text-caption text-on-surface-variant">
              <span>
                Cold-start rate{" "}
                <span className="font-semibold text-on-surface">{coldStart}%</span>
              </span>
              <span>
                Pending{" "}
                <span className="font-semibold text-on-surface">
                  {stats.data?.pending_verifications ?? 0}
                </span>
              </span>
            </div>
          </div>
          {stats.loading ? (
            <Skeleton className="h-[120px] w-[120px] rounded-full" />
          ) : (
            <RingScore value={accuracy} label="confidence" size={120} />
          )}
        </Card>

        {/* Model status */}
        <Card>
          <div className="mb-md flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-headline-md text-on-background">
              <Icon name="neurology" className="text-primary" />
              Model status
            </h2>
            <StatusBadge tone={modelsReady === "Ready" ? "success" : "neutral"}>
              {modelsReady}
            </StatusBadge>
          </div>
          {model.loading ? (
            <div className="flex flex-col gap-sm">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : model.error ? (
            <p className="text-body-md text-error">{model.error}</p>
          ) : (
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
              <ModelStat
                label="Content-based (CBF)"
                ok={model.data?.cbf_fitted}
                extra={`${model.data?.cbf_doctors ?? 0} doctors indexed`}
              />
              <ModelStat
                label="Collaborative (CF)"
                ok={model.data?.cf_fitted}
                extra={`${model.data?.cf_patients ?? 0} patients learned`}
              />
            </div>
          )}
        </Card>
      </section>

      {/* Provider verification queue */}
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-md">
          <div>
            <h3 className="text-headline-md text-on-background">
              Provider Verification Queue
            </h3>
            <p className="text-caption text-on-surface-variant">
              Approve or reject doctors awaiting credential review.
            </p>
          </div>
          {pending.data && pending.data.length > 0 && (
            <StatusBadge tone="primary">{pending.data.length} pending</StatusBadge>
          )}
        </div>

        {pending.loading ? (
          <div className="flex flex-col gap-px p-md">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : pending.error ? (
          <p className="p-md text-body-md text-error">{pending.error}</p>
        ) : (pending.data ?? []).length === 0 ? (
          <EmptyState
            title="Queue is clear"
            description="No providers are awaiting verification right now."
          />
        ) : (
          <div className="divide-y divide-outline-variant">
            {(pending.data ?? []).map((d) => (
              <PendingDoctorRow
                key={d.id}
                doctor={d}
                busy={busyId === d.id}
                onVerify={() => act(() => api.admin.verifyDoctor(d.id), d.id)}
                onSuspend={() => act(() => api.admin.suspendDoctor(d.id), d.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// KPI card matching the design's bento watermark style.
function KpiCard({
  watermark,
  tone,
  label,
  value,
  sub,
  loading,
}: {
  watermark: string;
  tone: string;
  label: string;
  value?: number;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-card">
      <div className="absolute right-0 top-0 p-md opacity-10 transition-opacity group-hover:opacity-20">
        <Icon name={watermark} className={`text-display-lg ${tone}`} />
      </div>
      <div className="relative z-10">
        <p className="mb-sm text-label-md text-on-surface-variant">{label}</p>
        {loading ? (
          <Skeleton className="h-12 w-28" />
        ) : (
          <h3 className="text-display-lg text-on-background tabular-nums">
            {(value ?? 0).toLocaleString()}
          </h3>
        )}
        <p className="mt-xs text-caption text-outline">{sub}</p>
      </div>
    </div>
  );
}

function ModelStat({
  label,
  ok,
  extra,
}: {
  label: string;
  ok?: boolean;
  extra: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container-low p-sm">
      <div className="flex items-center justify-between">
        <p className="text-label-md font-medium text-on-surface">{label}</p>
        <StatusBadge tone={ok ? "success" : "error"}>
          {ok ? "Fitted" : "Not fitted"}
        </StatusBadge>
      </div>
      <p className="mt-xs text-caption text-on-surface-variant">{extra}</p>
    </div>
  );
}
